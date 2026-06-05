import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
        throw new Error(`Telegram API returned status ${response.status}`);
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

    await ctx.db.patch(user._id, {
      telegramChatId: args.chatId,
      telegramEnabled: true,
      telegramLinkCode: undefined,
      telegramLinkExpires: undefined,
    });

    return { success: true, username: user.username };
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

    if (/^\d{6}$/.test(text)) {
      const linkResult = await ctx.runMutation(internal.telegram.verifyAndLinkCode, {
        code: text,
        chatId,
      });

      if (linkResult.success) {
        await sendReply(
          `🎉 <b>Success!</b> Your Telegram account has been linked to EthioSwap user <b>@${linkResult.username}</b>. You will now receive real-time trade alerts!`
        );
      } else {
        await sendReply(
          `❌ <b>Linking Failed!</b> The code is invalid or has expired. Please request a new 6-digit code from Profile Settings on EthioSwap.`
        );
      }
      return { ok: true };
    }

    if (text === "/status") {
      const user = await ctx.runQuery(internal.telegram.getUserByTelegramId, { chatId });
      if (!user) {
        await sendReply(
          `⚠️ <b>Unlinked Account</b>\n\nYour Telegram is not connected to any EthioSwap account. Please link your account first:\n1. Open EthioSwap Profile Settings\n2. Click "Connect Telegram" to get a 6-digit code\n3. Send the 6-digit code here.`
        );
        return { ok: true };
      }

      const activeTrades = await ctx.runQuery(internal.telegram.getActiveTradesForUser, { userId: user._id });
      
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

    await sendReply(
      `👋 <b>EthioSwap Notification Bot</b>\n\nUse this bot to receive instant alerts for your P2P trades on EthioSwap.\n\n<b>Commands:</b>\n/status - View profile and active trades\n\n<b>Linking:</b>\nIf you want to link your account, please send your 6-digit one-time code generated from EthioSwap Profile Settings.`
    );

    return { ok: true };
  },
});
