import { query, mutation, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { sha256Sync } from "./utils";
import { verifyAndInvalidateOtp } from "./otp";
import { normalizeEthiopianPhone } from "./phone";

export const get = query({
  args: { id: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.id) return null;
    return await ctx.db.get(args.id);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const create = mutation({
  args: {
    username: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    password: v.string(),
    fullName: v.optional(v.union(v.string(), v.null())),
    role: v.string(),
    phone: v.optional(v.union(v.string(), v.null())),
    ethAddress: v.string(),
    ethPrivateKey: v.string(),
    age: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    if (args.email) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
      if (existing) {
        if (existing.status === "pending_verification") {
          return { userId: existing._id, pendingVerification: true };
        }
        throw new Error("Email already registered");
      }
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (existingUser) {
      if (existingUser.status === "pending_verification") {
        return { userId: existingUser._id, pendingVerification: true };
      }
      throw new Error("Username already taken");
    }

    // Normalize the phone to E.164 so SMS always works
    const normalizedPhone = args.phone
      ? normalizeEthiopianPhone(args.phone).e164 || args.phone
      : args.phone;

    const { password, phone: _ignored, ...userData } = args;

    const status = args.role === "admin" ? "active" : "pending_verification";
    const kycStatus = args.role === "admin" ? "approved" : "none";

    const userId = await ctx.db.insert("users", {
      ...userData,
      phone: normalizedPhone,
      passwordHash: sha256Sync(password),
      etbBalance: 0,
      ethBalance: 0,
      ethLocked: 0,
      reputation: 100,
      totalTrades: 0,
      joinedAt: new Date().toISOString(),
      kycStatus,
      paymentAccounts: [],
      isSuspended: false,
      status,
      smsEnabled: true,
      preferredVerificationMethod: "sms",
    });

    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const tokenHex = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const telegramLinkToken = args.role !== "admin" 
      ? "tg_" + tokenHex
      : undefined;

    await ctx.db.patch(userId, {
      telegramLinkToken,
      telegramLinked: false,
    });

    if (args.role !== "admin") {
      // Generate a 6-digit cryptographically secure random code for signup OTP
      const randomBuffer = new Uint32Array(1);
      crypto.getRandomValues(randomBuffer);
      const code = (100000 + (randomBuffer[0] % 900000)).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      await ctx.db.insert("otps", {
        userId,
        purpose: "signup",
        code,
        expiresAt,
        attempts: 0,
        resends: 0,
        channel: "sms",
        status: "pending",
        used: false,
        createdAtEpoch: Date.now(),
        createdAt: new Date().toISOString(),
      });

      // Send OTP via SMS (normalized phone) and Telegram in parallel.
      // Telegram will only deliver if the user has linked their account,
      // which they may have done via the deep link during signup.
      if (normalizedPhone) {
        await ctx.scheduler.runAfter(0, internal.otp.sendOtpAction, {
          userId,
          purpose: "signup",
          channel: "sms",
          code,
          phone: normalizedPhone,
          telegramChatId: "",
          preferredLanguage: "en",
        });
      }
    }

    return userId;
  },
});

export const sendWelcomeEmailAction = action({
  args: { email: v.string(), username: v.string() },
  handler: async (ctx, args) => {
    await ctx.runAction(internal.emails.sendNotification, {
      to: args.email,
      subject: "Welcome to EthioSwap! 🇪🇹",
      text: `Hi ${args.username},\n\nWelcome to EthioSwap! We're thrilled to have you join our community.\n\nEthioSwap is Ethiopia's most trusted P2P platform for digital asset exchange. To get started, please complete your Identity Verification (KYC) in your profile settings.\n\nIf you have any questions, our support team is always here to help.\n\nHappy Trading!\nThe EthioSwap Team`,
    });
  },
});

export const authenticate = query({
  args: {
    identifier: v.string(), // username or email
    password: v.string(),
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    // Try by email index first
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.identifier))
      .first();

    // Fall back to username index
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.identifier))
        .first();
    }

    if (!user) return null;
    const inputHash = sha256Sync(args.password);
    if (user.passwordHash !== inputHash && user.passwordHash !== args.password) return null;

    if (user.isSuspended) {
      throw new Error("This account is suspended. Please contact support.");
    }

    if (user.role === "admin") {
      const { passwordHash, ...safeUser } = user;
      return { status: "success", user: safeUser };
    }

    if (user.status === "pending_verification") {
      return {
        status: "otp_required",
        userId: user._id,
        preferredMethod: "sms",
        phone: user.phone || "",
        telegramChatId: "",
        telegramLinkToken: user.telegramLinkToken || "",
        isSignup: true,
      };
    }

    const { passwordHash, ...safeUser } = user;

    // Check if device is trusted
    const now = Date.now();
    const trusted = await ctx.db
      .query("trustedDevices")
      .withIndex("by_user_fingerprint", (q) =>
        q.eq("userId", user!._id).eq("deviceFingerprint", args.deviceFingerprint)
      )
      .filter((q) => q.gt(q.field("trustedUntil"), now))
      .first();

    if (trusted) {
      return { status: "success", user: safeUser };
    }

    const preferredMethod = user.telegramLinked ? "telegram" : "sms";

    return {
      status: "otp_required",
      userId: user._id,
      preferredMethod,
      phone: user.phone || "",
      telegramChatId: user.telegramChatId || "",
    };
  },
});

export const checkUsernameEmailAvailability = query({
  args: {
    username: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let usernameTaken = false;
    let emailTaken = false;

    if (args.username) {
      const normalizedUsername = args.username.trim().toLowerCase();
      const u = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
        .first();
      if (u) usernameTaken = true;
    }

    if (args.email) {
      const normalizedEmail = args.email.trim().toLowerCase();
      const e = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .first();
      if (e) emailTaken = true;
    }

    return { usernameTaken, emailTaken };
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const listKycQueue = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) =>
        q.or(q.eq(q.field("kycStatus"), "pending"), q.eq(q.field("kycStatus"), "submitted"))
      )
      .order("desc")
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("users"),
    isSuspended: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isSuspended: args.isSuspended });
  },
});

export const updateKycStatus = mutation({
  args: {
    id: v.id("users"),
    status: v.string(),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");

    const rejectedCount = user.kycRejectedCount || 0;
    const isApproved = args.status === "verified" || args.status === "approved";
    const isRejected = args.status === "rejected";
    const updates: any = {
      kycStatus: isApproved ? "approved" : args.status,
      kycRejectionReason: isRejected ? args.rejectionReason : undefined,
    };

    if (isApproved) {
      updates.is_verified_trader = true;
    }

    if (isRejected) {
      updates.kycRejectedCount = rejectedCount + 1;
      updates.is_verified_trader = false;
      
      if (rejectedCount + 1 >= 2) {
        updates.isFlagged = true;
        updates.flaggedReason = "KYC rejected twice or more";
      }
    }

    await ctx.db.patch(args.id, updates);

    // Trigger notification dispatcher
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: args.id,
      type: isApproved ? "kyc_approved" : "kyc_rejected",
      extraText: isApproved ? undefined : args.rejectionReason,
    });
  },
});

export const submitKyc = mutation({
  args: {
    userId: v.id("users"),
    fullName: v.string(),
    dob: v.string(),
    idFront: v.string(),
    idBack: v.string(),
    selfie: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const rejectedCount = user.kycRejectedCount || 0;
    if (rejectedCount >= 2 && user.kycStatus === "rejected") {
      throw new Error("You have exceeded the maximum KYC submission attempts.");
    }

    await ctx.db.patch(user._id, {
      kycStatus: "pending",
      kycFullName: args.fullName,
      kycDob: args.dob,
      kycIdFront: args.idFront,
      kycIdBack: args.idBack,
      kycSelfie: args.selfie,
      kycRejectionReason: null,
    });

    return { success: true };
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.updates);
  },
});

export const addWarning = mutation({
  args: {
    id: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) return;
    const warnings = user.warnings || [];
    await ctx.db.patch(args.id, {
      warnings: [
        ...warnings,
        {
          id: Math.random().toString(36).substring(2, 9),
          message: args.message,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  },
});

export const updateBalances = mutation({
  args: {
    userId: v.id("users"),
    ethChange: v.optional(v.number()),
    ethLockedChange: v.optional(v.number()),
    etbChange: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const newEthBalance = (user.ethBalance || 0) + (args.ethChange || 0);
    const newEthLocked = (user.ethLocked || 0) + (args.ethLockedChange || 0);
    const newEtbBalance = (user.etbBalance || 0) + (args.etbChange || 0);

    if (newEthBalance < 0) throw new Error("Insufficient ETH balance");
    if (newEthLocked < 0) throw new Error("Insufficient locked ETH");
    if (newEtbBalance < 0) throw new Error("Insufficient ETB balance");

    await ctx.db.patch(args.userId, {
      ethBalance: newEthBalance,
      ethLocked: newEthLocked,
      etbBalance: newEtbBalance,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getByIdentifier = query({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.identifier))
      .first();
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.identifier))
        .first();
    }
    return user ? { exists: true } : { exists: false };
  },
});

export const generateTelegramLinkCode = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Use cryptographically secure randomness with collision check
    let code: string = "";
    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    while (attempts < MAX_ATTEMPTS) {
      const randomBuffer = new Uint32Array(1);
      crypto.getRandomValues(randomBuffer);
      const candidate = (100000 + (randomBuffer[0] % 900000)).toString();

      // Check for collision with any active code
      const existing = await ctx.db
        .query("users")
        .filter((q) =>
          q.and(
            q.eq(q.field("telegramLinkCode"), candidate),
            q.gt(q.field("telegramLinkExpires"), Date.now())
          )
        )
        .first();

      if (!existing) {
        code = candidate;
        break;
      }
      attempts++;
    }

    if (!code) {
      // Fallback: use the random code even after collisions (extremely unlikely)
      const randomBuffer = new Uint32Array(1);
      crypto.getRandomValues(randomBuffer);
      code = (100000 + (randomBuffer[0] % 900000)).toString();
    }

    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await ctx.db.patch(user._id, {
      telegramLinkCode: code,
      telegramLinkExpires: expires,
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "EthioSwap_Bot";

    return {
      code,
      expiresAt: expires,
      deepLink: `https://t.me/${botUsername}?start=${code}`,
    };
  },
});

export const disconnectTelegram = mutation({
  args: {
    userId: v.id("users"),
    otpCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Verify OTP for purpose "sensitive_change"
    await verifyAndInvalidateOtp(ctx.db, user._id, "sensitive_change", args.otpCode);

    await ctx.db.patch(user._id, {
      telegramChatId: undefined,
      telegramLinkCode: undefined,
      telegramLinkExpires: undefined,
      telegramEnabled: false,
    });

    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: user._id,
      type: "security_alert",
      extraText: "Telegram account disconnected from Settings.",
    });

    return { success: true };
  },
});

export const updateNotificationSettings = mutation({
  args: {
    userId: v.id("users"),
    smsEnabled: v.boolean(),
    telegramEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      smsEnabled: args.smsEnabled,
      telegramEnabled: args.telegramEnabled,
    });

    return { success: true };
  },
});

export const verifyLoginOtp = mutation({
  args: {
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    code: v.string(),
    deviceFingerprint: v.string(),
    deviceName: v.string(),
    location: v.optional(v.string()),
    trustDevice: v.boolean(),
  },
  handler: async (ctx, args) => {
    let user = null;
    if (args.userId) {
      user = await ctx.db.get(args.userId);
    }
    if (!user && args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
      if (!user) {
        user = await ctx.db
          .query("users")
          .withIndex("by_username", (q) => q.eq("username", args.email))
          .first();
      }
    }

    if (!user) throw new Error("User not found");
    const userId = user._id;

    // Admin bypass: skip OTP entirely
    if (user.role !== "admin") {
      const now = Date.now();

      // Check lockout
      if (user.otpLockedUntil && now < user.otpLockedUntil) {
        const minutesLeft = Math.ceil((user.otpLockedUntil - now) / 60000);
        throw new Error(`Too many failed OTP attempts. Your account is locked. Please try again in ${minutesLeft} minutes.`);
      }

      // Hash code to verify
      const hashedCode = sha256Sync(args.code);

      // Find valid OTP record
      const otpRecord = await ctx.db
        .query("login_otps")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("otpCode"), hashedCode),
            q.eq(q.field("isUsed"), false),
            q.gt(q.field("expiresAt"), now)
          )
        )
        .first();

      // Insert log
      await ctx.db.insert("otpAttemptsLogs", {
        userId,
        purpose: "login",
        codeEntered: args.code,
        channel: otpRecord ? "telegram" : "unknown",
        status: otpRecord ? "success" : "failed_incorrect",
        createdAt: new Date().toISOString(),
      });

      const handleFailure = async (errorMessage: string) => {
        const newFailures = (user.otpFailures || 0) + 1;
        if (newFailures >= 3) {
          await ctx.db.patch(userId, {
            otpFailures: 3,
            otpLockedUntil: now + 15 * 60 * 1000,
          });
          throw new Error("Too many attempts. Please wait 15 minutes.");
        } else {
          await ctx.db.patch(userId, {
            otpFailures: newFailures,
          });
          throw new Error(errorMessage);
        }
      };

      if (!otpRecord) {
        // Increment attempts on active OTPs
        const activeOtps = await ctx.db
          .query("login_otps")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("isUsed"), false))
          .collect();

        for (const activeOtp of activeOtps) {
          const attempts = (activeOtp.attemptCount || 0) + 1;
          if (attempts >= 5) {
            await ctx.db.patch(activeOtp._id, { isUsed: true, attemptCount: attempts });
          } else {
            await ctx.db.patch(activeOtp._id, { attemptCount: attempts });
          }
        }
        await handleFailure("Invalid or expired code. Please request a new one.");
        return; // satisfy typescript
      }

      const attempts = (otpRecord.attemptCount || 0) + 1;
      if (attempts > 5) {
        await ctx.db.patch(otpRecord._id, { isUsed: true, attemptCount: attempts });
        await handleFailure("Code expired. Please request a new code.");
        return;
      }

      // Invalidate this OTP and reset failures
      await ctx.db.patch(userId, {
        otpFailures: 0,
        otpLockedUntil: null,
      });
      await ctx.db.patch(otpRecord._id, { isUsed: true, attemptCount: attempts });
    }

    // 2. Register trusted device if requested
    if (args.trustDevice) {
      const existingTrusted = await ctx.db
        .query("trustedDevices")
        .withIndex("by_user_fingerprint", (q) =>
          q.eq("userId", userId).eq("deviceFingerprint", args.deviceFingerprint)
        )
        .first();

      const trustedUntil = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

      if (existingTrusted) {
        await ctx.db.patch(existingTrusted._id, {
          trustedUntil,
          deviceName: args.deviceName,
          location: args.location || "Addis Ababa, Ethiopia",
        });
      } else {
        await ctx.db.insert("trustedDevices", {
          userId,
          deviceFingerprint: args.deviceFingerprint,
          deviceName: args.deviceName,
          location: args.location || "Addis Ababa, Ethiopia",
          trustedUntil,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Send "New Login Detected" security notification
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const alertMsg = `New Login Detected\n\nDevice: ${args.deviceName}\nLocation: ${args.location || "Addis Ababa, Ethiopia"}\nTime: ${timeStr}\n\nIf this wasn't you, secure your account immediately.`;

    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId,
      type: "security_alert",
      extraText: alertMsg,
    });

    // Don't return password hash
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  },
});

export const verifySignupOtp = mutation({
  args: {
    userId: v.id("users"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify OTP using the helper
    const verifiedOtp = await verifyAndInvalidateOtp(ctx.db, args.userId, "signup", args.code);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // 2. Mark as active and link Telegram if it was verified via Telegram
    const updates: any = {
      status: "active",
    };
    if (verifiedOtp && verifiedOtp.channel === "telegram") {
      updates.telegramLinked = true;
      updates.telegramEnabled = true;
    } else {
      updates.smsEnabled = true;
    }
    await ctx.db.patch(args.userId, updates);



    // 4. Welcome Notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "welcome",
      title: "Welcome to EthioSwap! 🇪🇹",
      message: "We're thrilled to have you! Complete your ID verification to unlock all trading features and start swapping.",
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 5. Send Welcome Email via Action
    if (user.email) {
      await ctx.scheduler.runAfter(0, api.users.sendWelcomeEmailAction, {
        email: user.email,
        username: user.username,
      });
    }

    // 6. Return safe user
    const { passwordHash, ...safeUser } = user;
    return { ...safeUser, status: "active", id: user._id };
  },
});

export const updateSensitiveDetails = mutation({
  args: {
    userId: v.id("users"),
    otpCode: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    // Verify OTP for purpose "sensitive_change"
    await verifyAndInvalidateOtp(ctx.db, args.userId, "sensitive_change", args.otpCode);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const patchedUpdates: any = {};
    const securityMessages: string[] = [];

    if (args.updates.password) {
      patchedUpdates.passwordHash = sha256Sync(args.updates.password);
      securityMessages.push("Password changed.");
    }
    if (args.updates.email !== undefined && args.updates.email !== user.email) {
      patchedUpdates.email = args.updates.email;
      securityMessages.push(`Email changed from ${user.email || 'none'} to ${args.updates.email}.`);
    }
    if (args.updates.phone !== undefined && args.updates.phone !== user.phone) {
      patchedUpdates.phone = args.updates.phone;
      securityMessages.push(`Phone number changed from ${user.phone || 'none'} to ${args.updates.phone}.`);
    }
    if (args.updates.preferredVerificationMethod !== undefined) {
      patchedUpdates.preferredVerificationMethod = args.updates.preferredVerificationMethod;
    }
    if (args.updates.emailEnabled !== undefined) {
      patchedUpdates.emailEnabled = args.updates.emailEnabled;
    }

    if (Object.keys(patchedUpdates).length > 0) {
      await ctx.db.patch(args.userId, patchedUpdates);

      // Send security notification if key updates occurred
      if (securityMessages.length > 0) {
        const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const alertMsg = `Security Settings Changed\n\nUpdates:\n${securityMessages.map(m => `- ${m}`).join('\n')}\nTime: ${timeStr}\n\nIf this wasn't you, secure your account immediately.`;

        await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
          userId: args.userId,
          type: "security_alert",
          extraText: alertMsg,
        });
      }
    }

    return { success: true };
  },
});

export const logoutUser = mutation({
  args: {
    userId: v.id("users"),
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const trusted = await ctx.db
      .query("trustedDevices")
      .withIndex("by_user_fingerprint", (q) =>
        q.eq("userId", args.userId).eq("deviceFingerprint", args.deviceFingerprint)
      )
      .first();

    if (trusted) {
      await ctx.db.delete(trusted._id);
    }
    return { success: true };
  },
});


