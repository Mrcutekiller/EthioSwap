import { mutation, internalMutation, action, internalAction, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { DatabaseWriter, DatabaseReader } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { sha256Sync } from "./utils";

// Generate a new 6-digit OTP code for a user
export const generateOtp = mutation({
  args: {
    userId: v.id("users"),
    purpose: v.string(), // "login" | "withdrawal" | "sensitive_change" | "deposit"
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Admin bypass: skip OTP entirely
    if (user.role === "admin") {
      return { success: true, skip: true };
    }

    const now = Date.now();

    // Check if account is locked out
    if (user.otpLockedUntil && now < user.otpLockedUntil) {
      const minutesLeft = Math.ceil((user.otpLockedUntil - now) / (60 * 1000));
      throw new Error(`Too many failed OTP attempts. Your account is locked. Please try again in ${minutesLeft} minutes.`);
    }

    // Telegram is the only OTP channel. The user MUST have Telegram linked
    // to receive login, withdrawal, deposit, or sensitive-change codes.
    if (!user.telegramLinked || !user.telegramChatId) {
      throw new Error("Telegram is not connected to your account. Please reconnect Telegram in Settings to receive OTP codes.");
    }
    const channel = "telegram";

    // Retrieve settings to check if Telegram channel is globally disabled
    const settings = await ctx.db.query("systemSettings").first();
    if (settings?.isTelegramChannelDisabled) {
      throw new Error("Telegram notifications are currently disabled by administration.");
    }

    // Check rate limiting: max 1 OTP request per 60 seconds
    const recentOtps = await ctx.db
      .query("otps")
      .withIndex("by_user_purpose_status", (q) =>
        q.eq("userId", args.userId).eq("purpose", args.purpose).eq("status", "pending")
      )
      .filter((q) => q.gt(q.field("createdAtEpoch"), now - 60000))
      .collect();

    if (recentOtps.length > 0) {
      throw new Error("Please wait 60 seconds before requesting another code.");
    }

    // Check resend limits: max 3 resends per purpose session
    const activeOtps = await ctx.db
      .query("otps")
      .withIndex("by_user_purpose_status", (q) =>
        q.eq("userId", args.userId).eq("purpose", args.purpose).eq("status", "pending")
      )
      .collect();

    let resends = 0;
    if (activeOtps.length > 0) {
      // Find the latest active OTP to inherit resend count
      const latestActive = activeOtps.reduce((prev, current) =>
        current.createdAtEpoch > prev.createdAtEpoch ? current : prev
      );
      resends = (latestActive.resends || 0) + 1;
      if (resends > 3) {
        throw new Error("Maximum resend attempts (3) exceeded for this session. Please log in again.");
      }

      // Invalidate all previous pending OTPs of this purpose
      for (const otp of activeOtps) {
        await ctx.db.patch(otp._id, { status: "invalidated" });
      }
    }

    // Generate a 6-digit cryptographically secure random code
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const code = (100000 + (randomBuffer[0] % 900000)).toString();
    const duration = args.purpose === "login" ? 10 * 60 * 1000 : 5 * 60 * 1000;
    const expiresAt = now + duration;

    // Save to the login_otps table if it's a login OTP
    if (args.purpose === "login") {
      const hashedCode = sha256Sync(code);
      await ctx.db.insert("login_otps", {
        userId: args.userId,
        otpCode: hashedCode,
        telegramChatId: user.telegramChatId || user.telegram_chat_id || undefined,
        expiresAt,
        isUsed: false,
        attemptCount: 0,
        createdAt: new Date().toISOString(),
      });
    }

    await ctx.db.insert("otps", {
      userId: args.userId,
      purpose: args.purpose,
      code,
      expiresAt,
      attempts: 0,
      resends,
      channel,
      status: "pending",
      used: false,
      createdAtEpoch: now,
      createdAt: new Date().toISOString(),
    });

    // Trigger dispatch action to send via Telegram
    await ctx.scheduler.runAfter(0, internal.otp.sendOtpAction, {
      userId: args.userId,
      purpose: args.purpose,
      code,
      telegramChatId: user.telegramChatId,
      preferredLanguage: user.preferredLanguage || "en",
    });

    return { success: true, expiresAt, channel };
  },
});

/**
 * Regenerate a Telegram linking code for a user who hasn't connected yet.
 * Used on the signup screen so the user can request a fresh code without
 * having to re-enter their details.
 */
export const resendSignupOtpWithFallback = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const linkRes = await ctx.runMutation(api.users.generateTelegramLinkCode, {
      userId: args.userId,
    });
    return {
      telegramCode: linkRes?.code
        ? {
            code: linkRes.code,
            deepLink: linkRes.deepLink || `https://t.me/EthioSwap_Bot?start=${linkRes.code}`,
            expiresAt: linkRes.expiresAt || Date.now() + 30 * 60 * 1000,
          }
        : null,
    };
  },
});

// Action to send OTP via Telegram (only channel)
export const sendOtpAction = internalAction({
  args: {
    userId: v.id("users"),
    purpose: v.string(),
    code: v.string(),
    telegramChatId: v.string(),
    preferredLanguage: v.string(),
  },
  handler: async (ctx, args) => {
    let tgMsg = `🛡️ <b>EthioSwap Secure OTP</b>\n\nYour OTP verification code is: <code>${args.code}</code>\n\nThis code expires in 5 minutes.`;

    if (args.purpose === "login") {
      tgMsg = `🔐 <b>EthioSwap Login Code</b>\n\nYour code: <code>${args.code}</code>\n\n⏰ Expires in 10 minutes\n❌ Never share this code\n\nNot you? Secure your account:\n<a href="https://ethioswap.qzz.io/profile">Security Settings</a>`;
    } else if (args.purpose === "withdrawal") {
      tgMsg = `💸 <b>Withdrawal Verification</b>\n\nYour withdrawal code: <code>${args.code}</code>\n\n⏰ Expires in 5 minutes\n❌ Never share this code`;
    } else if (args.purpose === "deposit") {
      tgMsg = `⬇️ <b>Deposit Verification</b>\n\nYour deposit code: <code>${args.code}</code>\n\n⏰ Expires in 5 minutes\n❌ Never share this code`;
    }

    const logId = await ctx.runMutation(internal.otp.createOtpNotificationLog, {
      userId: args.userId,
      type: `${args.purpose}_otp`,
      channel: "telegram",
      message: `OTP Code sent to Telegram chatId: ${args.telegramChatId}`,
    });

    const token = process.env.TELEGRAM_BOT_TOKEN || "mock_token";
    if (token === "mock_token") {
      console.warn("TELEGRAM_BOT_TOKEN not set. Mock Telegram delivery to", args.telegramChatId, ":", tgMsg);
      await ctx.runMutation(internal.otp.updateOtpNotificationLogStatus, { logId, status: "delivered" });
      return { success: true };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: args.telegramChatId,
          text: tgMsg,
          parse_mode: "HTML",
        }),
      });

      const status = response.ok ? "delivered" : "failed";
      await ctx.runMutation(internal.otp.updateOtpNotificationLogStatus, { logId, status });
      return { success: response.ok, error: response.ok ? undefined : `Telegram API ${response.status}` };
    } catch (err) {
      console.error("Telegram OTP send failed:", err);
      await ctx.runMutation(internal.otp.updateOtpNotificationLogStatus, { logId, status: "failed" });
      return { success: false, error: (err as Error).message };
    }
  },
});

// Helper mutations for internal operations
export const createOtpNotificationLog = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    channel: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notificationLogs", {
      userId: args.userId,
      type: args.type,
      channel: args.channel,
      message: args.message,
      status: "pending",
      sentAt: new Date().toISOString(),
    });
  },
});

export const updateOtpNotificationLogStatus = internalMutation({
  args: {
    logId: v.id("notificationLogs"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, { status: args.status });
  },
});

// Shared server-side validation helper
export async function verifyAndInvalidateOtp(
  db: DatabaseWriter,
  userId: Id<"users">,
  purpose: string,
  code: string
) {
  const now = Date.now();
  const user = await db.get(userId);
  if (!user) throw new Error("User not found");

  // Admin bypass
  if (user.role === "admin") {
    return {
      userId,
      purpose,
      code,
      expiresAt: now + 300000,
      attempts: 0,
      resends: 0,
      channel: "sms",
      status: "verified",
      used: true,
      createdAtEpoch: now,
      createdAt: new Date().toISOString()
    };
  }

  // Check lockout
  if (user.otpLockedUntil && now < user.otpLockedUntil) {
    const minutesLeft = Math.ceil((user.otpLockedUntil - now) / 60000);
    throw new Error(`Too many failed OTP attempts. Your account is locked. Please try again in ${minutesLeft} minutes.`);
  }

  const activeOtps = await db
    .query("otps")
    .withIndex("by_user_purpose_status", (q) =>
      q.eq("userId", userId).eq("purpose", purpose).eq("status", "pending")
    )
    .collect();

  const otp = activeOtps.find((o) => o.code === code);

  // Insert attempt log
  await db.insert("otpAttemptsLogs", {
    userId,
    purpose,
    codeEntered: code,
    channel: otp ? otp.channel : "unknown",
    status: otp ? (otp.expiresAt < now ? "failed_expired" : "success") : "failed_incorrect",
    createdAt: new Date().toISOString(),
  });

  const handleFailure = async (errorMessage: string) => {
    const newFailures = (user.otpFailures || 0) + 1;
    if (newFailures >= 3) {
      await db.patch(userId, {
        otpFailures: 3,
        otpLockedUntil: now + 15 * 60 * 1000,
      });
      throw new Error(`Too many failed OTP attempts. Your account is locked for 15 minutes.`);
    } else {
      await db.patch(userId, {
        otpFailures: newFailures,
      });
      throw new Error(errorMessage);
    }
  };

  if (!otp) {
    // Increment attempts on all active OTPs for user/purpose to block brute force
    for (const activeOtp of activeOtps) {
      const attempts = (activeOtp.attempts || 0) + 1;
      if (attempts >= 5) {
        await db.patch(activeOtp._id, { status: "invalidated", attempts });
      } else {
        await db.patch(activeOtp._id, { attempts });
      }
    }
    await handleFailure("Invalid verification code. Please check and try again.");
    return; // unreachable but satisfies compiler
  }

  if (otp.expiresAt < now) {
    await db.patch(otp._id, { status: "expired" });
    await handleFailure("Verification code has expired. Please request a new one.");
    return; // unreachable
  }

  const attempts = (otp.attempts || 0) + 1;
  if (attempts > 5) {
    await db.patch(otp._id, { status: "invalidated", attempts });
    await handleFailure("Maximum verification attempts exceeded. Please request a new code.");
    return; // unreachable
  }

  // OTP matches and is valid! Invalidate it so it can't be used again
  await db.patch(userId, {
    otpFailures: 0,
    otpLockedUntil: null,
  });
  await db.patch(otp._id, { status: "verified", attempts, used: true });
  return otp;
}

// Public verifyOtp query/mutation (optional testing endpoint)
export const verifyOtpCode = mutation({
  args: {
    userId: v.id("users"),
    purpose: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    return await verifyAndInvalidateOtp(ctx.db, args.userId, args.purpose, args.code);
  },
});

// Admin Log Queries
export const getOtpAttemptsLogs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.userId);
    if (!admin || admin.role !== "admin") {
      console.warn(`Unauthorized getOtpAttemptsLogs query from userId: ${args.userId}`);
      return [];
    }

    const logs = await ctx.db.query("otpAttemptsLogs").order("desc").collect();
    
    // Enrich with username
    const enriched = [];
    for (const log of logs) {
      const u = await ctx.db.get(log.userId);
      enriched.push({
        ...log,
        username: u ? u.username : "unknown",
      });
    }
    return enriched;
  },
});

export const getNotificationLogs = query({
  args: { userId: v.id("users"), channel: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.userId);
    if (!admin || admin.role !== "admin") {
      console.warn(`Unauthorized getNotificationLogs query from userId: ${args.userId}`);
      return [];
    }

    let query = ctx.db.query("notificationLogs");
    const logs = await query.order("desc").collect();

    const filtered = args.channel 
      ? logs.filter(l => l.channel === args.channel)
      : logs;

    const enriched = [];
    for (const log of filtered) {
      const u = await ctx.db.get(log.userId);
      enriched.push({
        ...log,
        username: u ? u.username : "unknown",
      });
    }
    return enriched;
  },
});

// Admin command: resend notification
export const resendNotification = action({
  args: { logId: v.id("notificationLogs") },
  handler: async (ctx, args) => {
    const log = await ctx.runQuery(api.otp.getNotificationLogInternal, { logId: args.logId });
    if (!log) throw new Error("Log not found");

    const user = await ctx.runQuery(api.otp.getUserInternal, { userId: log.userId });
    if (!user) throw new Error("User not found");

    if (log.channel === "sms") {
      if (!user.phone) throw new Error("User has no phone number");
      await ctx.runAction(internal.sms.sendSmsAction, {
        userId: user._id,
        phone: user.phone,
        message: log.message,
        type: log.type,
        logId: log._id,
      });
    } else if (log.channel === "telegram") {
      if (!user.telegramChatId) throw new Error("User Telegram not connected");
      await ctx.runAction(internal.telegram.sendTelegramAction, {
        userId: user._id,
        chatId: user.telegramChatId,
        message: log.message,
        type: log.type,
        logId: log._id,
      });
    }
    return { success: true };
  },
});

export const getNotificationLogInternal = query({
  args: { logId: v.id("notificationLogs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.logId);
  },
});

export const getUserInternal = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
