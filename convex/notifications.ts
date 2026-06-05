import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isRead: true });
  },
});

export const insert = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  },
});

export const dispatchNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(), // "trade_matched" | "payment_sent" | "usdt_released" | "dispute_opened" | "dispute_resolved" | "kyc_approved" | "kyc_rejected"
    tradeId: v.optional(v.id("trades")),
    extraText: v.optional(v.string()), // e.g. amount, counterparty
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const lang = user.preferredLanguage || "en";
    const isAm = lang === "am" || lang.startsWith("am");

    let smsMsg = "";
    let tgMsg = "";

    const tradeShort = args.tradeId ? args.tradeId.substring(0, 8) : "";

    switch (args.type) {
      case "trade_matched":
        smsMsg = isAm
          ? `EthioSwap: P2P ስምምነት ተዛምዷል። መታወቂያ: #${tradeShort}። ዝርዝሩን በስልኮ ይከታተሉ።`
          : `EthioSwap: P2P Trade Matched. ID: #${tradeShort}. Check details on the platform.`;
        tgMsg = `🤝 <b>P2P Trade Matched!</b>\n\nYour trade has been matched. Click below to proceed.\n<b>Trade ID:</b> #${tradeShort}\n<b>Amount:</b> ${args.extraText || ""}\n<a href="https://ethioswap.com/dashboard/trades?id=${args.tradeId || ""}">View Trade Page</a>`;
        break;

      case "payment_sent":
        smsMsg = isAm
          ? `EthioSwap: ገዢው ክፍያ መፈጸሙን ምልክት አድርጓል። መታወቂያ: #${tradeShort}። እባክዎ ያረጋግጡ።`
          : `EthioSwap: Buyer marked payment sent. ID: #${tradeShort}. Please verify.`;
        tgMsg = `💰 <b>Payment Marked Sent!</b>\n\nThe buyer has marked the trade as paid.\n<b>Trade ID:</b> #${tradeShort}\n<b>Counterparty:</b> ${args.extraText || ""}\nVerify receipt and release the USDT.`;
        break;

      case "usdt_released":
        smsMsg = isAm
          ? `EthioSwap: USDT ተለቋል! መታወቂያ: #${tradeShort}። የኪስ ቦርሳዎን ያረጋግጡ።`
          : `EthioSwap: USDT Released! ID: #${tradeShort}. Check your wallet balance.`;
        tgMsg = `✅ <b>USDT Released!</b>\n\nThe escrow has been released successfully.\n<b>Trade ID:</b> #${tradeShort}\n<b>Volume:</b> ${args.extraText || ""}\nThank you for using EthioSwap!`;
        break;

      case "dispute_opened":
        smsMsg = isAm
          ? `EthioSwap: በስምምነት #${tradeShort} ላይ አለመግባባት ተከፍቷል። ሒሳብ ታግዷል።`
          : `EthioSwap: Dispute opened on Trade #${tradeShort}. Escrow frozen.`;
        tgMsg = `⚠️ <b>Trade Disputed!</b>\n\nA dispute has been opened on your trade. Escrow is frozen.\n<b>Trade ID:</b> #${tradeShort}\n<b>Reason:</b> ${args.extraText || ""}\nPlease submit evidence in the trade chat.`;
        break;

      case "dispute_resolved":
        smsMsg = isAm
          ? `EthioSwap: አለመግባባት ተፈትቷል! መታወቂያ: #${tradeShort}። መለያዎን ያረጋግጡ።`
          : `EthioSwap: Dispute resolved for Trade #${tradeShort}. Check details.`;
        tgMsg = `⚖️ <b>Dispute Resolved!</b>\n\nThe trade dispute has been resolved by admin.\n<b>Trade ID:</b> #${tradeShort}\n<b>Resolution:</b> ${args.extraText || ""}`;
        break;

      case "kyc_approved":
        smsMsg = isAm
          ? `EthioSwap: የእርስዎ KYC ማረጋገጫ ጸድቋል! አሁን መገበያየት ይችላሉ።`
          : `EthioSwap: Your KYC verification has been approved! Ready to trade.`;
        tgMsg = `🛡️ <b>KYC Approved!</b>\n\nCongratulations, your identity verification has been approved. The green shield badge is now active on your profile!`;
        break;

      case "kyc_rejected":
        smsMsg = isAm
          ? `EthioSwap: የእርስዎ KYC ማረጋገጫ ውድቅ ተደርጓል። ምክንያት: ${args.extraText || ""}`
          : `EthioSwap: Your KYC was rejected. Reason: ${args.extraText || ""}`;
        tgMsg = `❌ <b>KYC Rejected!</b>\n\nYour identity verification request was rejected.\n<b>Reason:</b> ${args.extraText || ""}\nPlease update and resubmit.`;
        break;

      default:
        smsMsg = `EthioSwap Alert: ${args.extraText || ""}`;
        tgMsg = `🔔 <b>Notification</b>\n\n${args.extraText || ""}`;
    }

    // 1. Send SMS if enabled
    if (user.smsEnabled && user.phone) {
      const logId = await ctx.db.insert("notificationLogs", {
        userId: user._id,
        type: args.type,
        channel: "sms",
        message: smsMsg,
        status: "pending",
        sentAt: new Date().toISOString(),
      });
      await ctx.scheduler.runAfter(0, internal.sms.sendSmsAction, {
        userId: user._id,
        phone: user.phone,
        message: smsMsg,
        type: args.type,
        logId,
      });
    }

    // 2. Send Telegram if linked
    if (user.telegramEnabled && user.telegramChatId) {
      const logId = await ctx.db.insert("notificationLogs", {
        userId: user._id,
        type: args.type,
        channel: "telegram",
        message: tgMsg,
        status: "pending",
        sentAt: new Date().toISOString(),
      });
      await ctx.scheduler.runAfter(0, internal.telegram.sendTelegramAction, {
        userId: user._id,
        chatId: user.telegramChatId,
        message: tgMsg,
        type: args.type,
        logId,
      });
    }

    // 3. In-App Notification (always created)
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: args.type,
      title: args.type.replace(/_/g, " ").toUpperCase(),
      message: smsMsg,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  },
});
