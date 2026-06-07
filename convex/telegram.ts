import { query, mutation, internalMutation, internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const sendTelegramAction = internalAction({
  args: {
    userId: v.id("users"),
    chatId: v.string(),
    message: v.string(),
    type: v.string(),
    logId: v.id("notificationLogs"),
  },
  handler: async (ctx, args) => {
    const token = process.env.TELEGRAM_BOT_TOKEN || "mock_token";
    if (token === "mock_token") {
      console.warn("TELEGRAM_BOT_TOKEN env var not set, using mock delivery");
      await ctx.runMutation(internal.telegram.updateTelegramLogStatus, {
        logId: args.logId,
        status: "delivered",
      });
      return { success: true };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: args.chatId,
          text: args.message,
          parse_mode: "HTML",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const desc = errorData.description || "";
        if (response.status === 403 || desc.toLowerCase().includes("blocked")) {
          await ctx.runMutation(api.telegram.disconnectTelegramInternal, { userId: args.userId });
        }
        throw new Error(`Telegram API returned status ${response.status}: ${desc}`);
      }

      await ctx.runMutation(internal.telegram.updateTelegramLogStatus, {
        logId: args.logId,
        status: "delivered",
      });

      return { success: true };
    } catch (error) {
      console.error("Telegram sending failed:", error);
      await ctx.runMutation(internal.telegram.updateTelegramLogStatus, {
        logId: args.logId,
        status: "failed",
      });
      return { success: false, error: (error as Error).message };
    }
  },
});

export const updateTelegramLogStatus = internalMutation({
  args: {
    logId: v.id("notificationLogs"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, {
      status: args.status,
    });
  },
});

export const createTelegramLog = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notificationLogs", {
      userId: args.userId,
      type: args.type,
      channel: "telegram",
      message: args.message,
      status: "pending",
      sentAt: new Date().toISOString(),
    });
  },
});

export const verifyAndLinkCode = mutation({
  args: {
    code: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const user = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("telegramLinkCode"), args.code),
          q.gt(q.field("telegramLinkExpires"), now)
        )
      )
      .first();

    if (!user) {
      return { success: false };
    }

    const isSignup = user.status === "pending_verification";

    await ctx.db.patch(user._id, {
      telegramChatId: args.chatId,
      telegramEnabled: true,
      telegramLinked: true,
      telegramLinkCode: undefined,
      telegramLinkExpires: undefined,
      telegram_chat_id: args.chatId,
      telegram_connected: true,
      telegram_connected_at: new Date().toISOString(),
    });

    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: user._id,
      type: "security_alert",
      extraText: `Telegram account connected. Chat ID: ${args.chatId}`,
    });

    return {
      success: true,
      userId: user._id,
      isSignup,
      username: user.username,
      numericId: user.numericId || String(user._id),
      email: user.email || "Not set",
      kycStatus: user.kycStatus || "unverified",
      ethBalance: user.ethBalance || 0,
      etbBalance: user.etbBalance || 0,
      totalTrades: user.totalTrades || 0,
    };
  },
});

export const activateUserAfterTelegramLink = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.status !== "pending_verification") return { alreadyActive: true };

    await ctx.db.patch(args.userId, {
      status: "active",
      smsEnabled: true,
    });

    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "welcome",
      title: "Welcome to EthioSwap!",
      message: "Your account has been activated via Telegram. Complete your ID verification to unlock all features.",
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    if (user.email) {
      await ctx.scheduler.runAfter(0, api.users.sendWelcomeEmailAction, {
        email: user.email,
        username: user.username,
      });
    }

    return { success: true };
  },
});

export const getUserByTelegramId = query({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramChatId"), args.chatId))
      .first();
  },
});

export const getActiveTradesForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const buyerTrades = await ctx.db
      .query("trades")
      .withIndex("by_buyer", (q) => q.eq("buyerId", args.userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "payment_pending"),
          q.eq(q.field("status"), "paid"),
          q.eq(q.field("status"), "disputed")
        )
      )
      .collect();

    const sellerTrades = await ctx.db
      .query("trades")
      .withIndex("by_seller", (q) => q.eq("sellerId", args.userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "payment_pending"),
          q.eq(q.field("status"), "paid"),
          q.eq(q.field("status"), "disputed")
        )
      )
      .collect();

    return [...buyerTrades, ...sellerTrades];
  },
});

export const handleTelegramWebhook = internalAction({
  args: {
    body: v.any(),
  },
  handler: async (ctx, args) => {
    const update = args.body;
    if (!update || !update.message) return { ok: true };

    const chatId = String(update.message.chat.id);
    const text = String(update.message.text || "").trim();

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const sendReply = async (msg: string) => {
      if (!token) {
        console.log("Mock Reply to chatId", chatId, ":", msg);
        return;
      }
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: "HTML",
        }),
      });
    };

    if (text.startsWith("/start ")) {
      const param = text.substring(7).trim();

      // Case 1: 6-digit linking code (deep link from signup/profile/settings)
      if (/^\d{6}$/.test(param)) {
        const linkResult = await ctx.runMutation(api.telegram.verifyAndLinkCode, {
          code: param,
          chatId,
        });

        if (linkResult.success) {
          if (linkResult.isSignup) {
            await ctx.runMutation(api.telegram.activateUserAfterTelegramLink, {
              userId: linkResult.userId,
            });
            await sendReply(
              `🎉 <b>Account Activated!</b>\n\n` +
              `Your EthioSwap account <b>@${linkResult.username}</b> has been created and linked to Telegram successfully!\n\n` +
              `You can now log in on the website using your username and password.\n\n` +
              `Type /help for available commands.`
            );
          } else {
            await sendReply(
              `✅ <b>EthioSwap Telegram connected!</b>\n\n` +
              `You will receive:\n` +
              `🔐 Login OTP codes\n` +
              `💰 Deposit confirmations\n` +
              `📤 Withdrawal alerts\n` +
              `🔔 Trade notifications\n\n` +
              `Type /help for commands.`
            );
          }
        } else {
          await sendReply(
            `❌ <b>Connection Failed!</b> The code is invalid or has expired. Please request a new 6-digit code from the EthioSwap website and try again.`
          );
        }
        return { ok: true };
      }

      // Case 2: Long-form token (legacy flow from signup link)
      const user = await ctx.runQuery(api.telegram.getPendingUserByToken, { token: param });

      if (user) {
        await ctx.runMutation(api.telegram.updateUserTelegramChatId, {
          userId: user._id,
          chatId,
        });

        await sendReply(
          `🔄 <b>Linking account...</b>\n\nFound user <b>@${user.username}</b>. Generating your 6-digit OTP code now...`
        );

        await ctx.runMutation(api.otp.generateOtp, {
          userId: user._id,
          purpose: "signup",
          channel: "telegram",
        });
      } else {
        await sendReply(
          `❌ <b>Invalid or Expired Token!</b>\n\nPlease make sure you clicked the link from the EthioSwap signup page or verify your registration status.`
        );
      }
      return { ok: true };
    }

    if (text === "/start") {
      const user = await ctx.runQuery(api.telegram.getUserByTelegramId, { chatId });
      if (user) {
        await sendReply(
          `👋 <b>Welcome back, @${user.username}!</b>\n\n` +
          `Your Telegram is already connected to EthioSwap.\n\n` +
          `Type /help to see available commands.`
        );
      } else {
        await sendReply(
          `👋 <b>Welcome to EthioSwap Bot!</b>\n\n` +
          `I'm your EthioSwap trading assistant. To connect your account, please send me the <b>6-digit linking code</b> from the EthioSwap website.\n\n` +
          `If you haven't signed up yet, visit <b>ethioswap.com</b> to create an account.`
        );
      }
      return { ok: true };
    }

    if (/^\d{6}$/.test(text.trim())) {
      const trimmedCode = text.trim();
      await sendReply(`🔄 <b>Connecting...</b> Please wait while we link your account.`);

      const linkResult = await ctx.runMutation(api.telegram.verifyAndLinkCode, {
        code: trimmedCode,
        chatId,
      });

      if (linkResult.success) {
        if (linkResult.isSignup) {
          await ctx.runMutation(api.telegram.activateUserAfterTelegramLink, {
            userId: linkResult.userId,
          });
          await sendReply(
            `🎉 <b>Account Activated!</b>\n\n` +
            `Your EthioSwap account <b>@${linkResult.username}</b> has been created and linked to Telegram successfully!\n\n` +
            `You can now log in on the website using your username and password.\n\n` +
            `Type /help for available commands.`
          );
        } else {
          await sendReply(
            `✅ <b>EthioSwap Telegram connected!</b>\n\n` +
            `You will receive:\n` +
            `🔐 Login OTP codes\n` +
            `💰 Deposit confirmations\n` +
            `📤 Withdrawal alerts\n` +
            `🔔 Trade notifications\n\n` +
            `Type /help for commands.`
          );
        }
      } else {
        await sendReply(
          `❌ <b>Connection Failed!</b> The code is invalid or has expired. Please request a new 6-digit code from the EthioSwap website and try again.`
        );
      }
      return { ok: true };
    }

    if (text === "/status") {
      const user = await ctx.runQuery(api.telegram.getUserByTelegramId, { chatId });
      if (!user) {
        await sendReply(
          `⚠️ <b>Unlinked Account</b>\n\nYour Telegram is not connected to any EthioSwap account.`
        );
        return { ok: true };
      }

      const activeTrades = await ctx.runQuery(api.telegram.getActiveTradesForUser, { userId: user._id });
      
      let tradesText = "";
      if (activeTrades.length === 0) {
        tradesText = "No active trades.";
      } else {
        tradesText = activeTrades.map((t, idx) => {
          return `${idx + 1}. Trade #${t._id.substring(0, 8)} (${t.amountEth} USD, Status: <b>${t.status}</b>)`;
        }).join("\n");
      }

      await sendReply(
        `🛡️ <b>EthioSwap Status Report</b>\n\n<b>Username:</b> @${user.username}\n<b>Kyc Status:</b> ${user.kycStatus?.toUpperCase() || "UNVERIFIED"}\n<b>Reputation:</b> ${user.reputation || 100}%\n<b>Average Rating:</b> ${(user.averageRating || 5.0).toFixed(1)} ⭐\n\n📝 <b>Active Trades:</b>\n${tradesText}`
      );
      return { ok: true };
    }

    if (text === "/help") {
      await sendReply(
        `📚 <b>EthioSwap Bot Commands</b>\n\n` +
        `• /start - Connect/Link your account\n` +
        `• /help - Show this guide\n` +
        `• /otp - Request a fresh login OTP code\n` +
        `• /balance - Check your wallet balance\n` +
        `• /rates - Check live USDT rates\n` +
        `• /stop - Disconnect Telegram notifications`
      );
      return { ok: true };
    }

    if (text === "/otp") {
      const user = await ctx.runQuery(api.telegram.getUserByTelegramId, { chatId });
      if (!user) {
        await sendReply(
          `❌ <b>Telegram not connected.</b> Please login with password first on the website, then connect Telegram.`
        );
        return { ok: true };
      }

      await sendReply(`🔄 <b>Generating fresh login OTP...</b>`);

      await ctx.runMutation(api.otp.generateOtp, {
        userId: user._id,
        purpose: "login",
        channel: "telegram",
      });

      return { ok: true };
    }

    if (text === "/balance") {
      const user = await ctx.runQuery(api.telegram.getUserByTelegramId, { chatId });
      if (!user) {
        await sendReply(
          `❌ <b>Telegram not connected.</b> Please connect your account first.`
        );
        return { ok: true };
      }

      await sendReply(
        `💰 <b>EthioSwap Balances</b>\n\n` +
        `• <b>USDT Balance:</b> ${(user.ethBalance || 0).toFixed(2)} USDT\n` +
        `• <b>ETB Balance:</b> ${(user.etbBalance || 0).toLocaleString()} ETB\n` +
        `• <b>Locked Escrow:</b> ${(user.ethLocked || 0).toFixed(2)} USDT`
      );
      return { ok: true };
    }

    if (text === "/rates") {
      const settings = await ctx.db.query("systemSettings").first();
      const buyRate = settings?.etbRatePerDollar || 110;
      const sellRate = settings?.etbRatePerDollarSell || settings?.etbRatePerDollar || 108;

      await sendReply(
        `📈 <b>Live USDT Rates</b>\n\n` +
        `• <b>Buy Rate:</b> ${buyRate} ETB per USDT\n` +
        `• <b>Sell Rate:</b> ${sellRate} ETB per USDT`
      );
      return { ok: true };
    }

    if (text === "/stop") {
      const user = await ctx.runQuery(api.telegram.getUserByTelegramId, { chatId });
      if (!user) {
        await sendReply(`❌ <b>Telegram not connected.</b>`);
        return { ok: true };
      }

      await ctx.runMutation(api.telegram.disconnectTelegramInternal, { userId: user._id });

      await sendReply(
        `🔌 <b>Telegram Disconnected!</b> You will no longer receive alerts or OTP codes on Telegram. Log in with password to reconnect.`
      );
      return { ok: true };
    }

    await sendReply(
      `👋 <b>Welcome to EthioSwap Bot!</b>\n\n` +
      `Type /help to see all available commands.\n\n` +
      `To link this Telegram account to your EthioSwap account:\n` +
      `1. Open the EthioSwap website/app and go to <b>Profile Settings</b>.\n` +
      `2. Click <b>🔌 Connect Telegram Bot</b> to get your 6-digit verification code.\n` +
      `3. Tap the link we send you — Telegram will pre-fill the code. You just hit <b>Send</b>.\n\n` +
      `Or simply paste the 6-digit code here in this chat.`
    );

    return { ok: true };
  },
});

export const getPendingUserByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramLinkToken"), args.token))
      .first();
  },
});

export const updateUserTelegramChatId = mutation({
  args: {
    userId: v.id("users"),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      telegramChatId: args.chatId,
      telegramLinked: false,
    });
  },
});

export const registerWebhook = action({
  args: {},
  handler: async (ctx) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN environment variable is not set");
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) throw new Error("CONVEX_SITE_URL environment variable is not set");
    const webhookUrl = `${siteUrl}/telegram-webhook`;
    console.log(`Setting Telegram webhook to: ${webhookUrl}`);
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const result = await response.json();
    return result;
  },
});

export const disconnectTelegramInternal = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    await ctx.db.patch(args.userId, {
      telegramChatId: undefined,
      telegramLinkCode: undefined,
      telegramLinkExpires: undefined,
      telegramLinked: false,
      telegramEnabled: false,
      telegram_chat_id: undefined,
      telegram_connected: false,
      telegram_connected_at: undefined,
    });

    if (user.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendNotification, {
        to: user.email,
        subject: "Telegram Disconnected 🔌",
        text: `Hi ${user.username},\n\nYour Telegram bot connection has been disconnected.\n\nPlease log in with your password to reconnect your Telegram account.\n\nBest regards,\nThe EthioSwap Team`,
      });
    }
  },
});

export const getTelegramLinkStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const now = Date.now();
    const linkCode = user.telegramLinkCode;
    const linkExpires = user.telegramLinkExpires;
    const isCodeValid = !!(linkCode && linkExpires && linkExpires > now);

    return {
      isLinked: !!user.telegramChatId,
      telegramChatId: user.telegramChatId || null,
      telegramLinked: !!user.telegramLinked,
      status: user.status,
      hasActiveCode: isCodeValid,
      linkCode: isCodeValid ? linkCode : null,
      linkExpires: isCodeValid ? linkExpires : null,
      secondsRemaining: isCodeValid && linkExpires ? Math.max(0, Math.ceil((linkExpires - now) / 1000)) : 0,
    };
  },
});

export const getTelegramWebhookInfo = action({
  args: {},
  handler: async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };
    }
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await response.json();
    return data;
  },
});

