import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

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

export const markAllRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();
    for (const notif of unread) {
      await ctx.db.patch(notif._id, { isRead: true });
    }
    return { success: true };
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
    type: v.string(), // "trade_matched" | "payment_sent" | "usdt_released" | "dispute_opened" | "dispute_resolved" | "kyc_approved" | "kyc_rejected" | "trade_cancelled" | "withdrawal_submitted" | "deposit_received" | "security_alert"
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
    let notifTitle = args.type.replace(/_/g, " ").toUpperCase();

    const tradeShort = args.tradeId ? args.tradeId.substring(0, 8) : "";

    // If tradeId is provided, fetch details for rich layout
    let trade = null;
    let buyer = null;
    let seller = null;
    if (args.tradeId) {
      trade = await ctx.db.get(args.tradeId);
      if (trade) {
        if (trade.buyerId) buyer = await ctx.db.get(trade.buyerId);
        seller = await ctx.db.get(trade.sellerId);
      }
    }

    switch (args.type) {
      case "trade_matched":
        if (trade) {
          const isSeller = String(args.userId) === String(trade.sellerId);
          if (isSeller) {
            notifTitle = "New Buy Request";
            smsMsg = isAm
              ? `EthioSwap: አዲስ የግዢ ጥያቄ ቀርቧል። መታወቂያ: #${tradeShort}። መጠን: ${trade.amountEth} USDT፣ ተመን: ${trade.rate} ETB።`
              : `EthioSwap: New Buy Request. ID: #${tradeShort}. Amount: ${trade.amountEth} USDT, Rate: ${trade.rate} ETB.`;
            tgMsg = `🤝 <b>New Buy Request</b>\n\nBuyer: @${buyer?.username || "unknown"}\nAmount: ${trade.amountEth} USDT\nRate: ${trade.rate} ETB\nTrade ID: #${tradeShort}`;
          } else {
            notifTitle = "Buy Request Submitted";
            smsMsg = isAm
              ? `EthioSwap: የግዢ ጥያቄዎ ቀርቧል። መታወቂያ: #${tradeShort}። መጠን: ${trade.amountEth} USDT፣ ተመን: ${trade.rate} ETB።`
              : `EthioSwap: Buy Request Submitted. ID: #${tradeShort}. Amount: ${trade.amountEth} USDT, Rate: ${trade.rate} ETB.`;
            tgMsg = `🛡️ <b>Buy Request Submitted</b>\n\nSeller: @${seller?.username || "unknown"}\nAmount: ${trade.amountEth} USDT\nRate: ${trade.rate} ETB\nTrade ID: #${tradeShort}`;
          }
        } else {
          smsMsg = `EthioSwap: P2P Trade Matched. ID: #${tradeShort}.`;
          tgMsg = `🤝 <b>P2P Trade Matched</b>\n\nTrade ID: #${tradeShort}`;
        }
        break;

      case "payment_sent":
        smsMsg = isAm
          ? `EthioSwap: ገዢው ክፍያ መፈጸሙን ምልክት አድርጓል። መታወቂያ: #${tradeShort}። እባክዎ ያረጋግጡ።`
          : `EthioSwap: Buyer marked payment sent. ID: #${tradeShort}. Please verify.`;
        tgMsg = `💳 <b>Payment Marked Sent</b>\n\nBuyer: @${buyer?.username || "unknown"}\nAmount: ${trade?.amountEth || ""} USDT\nRate: ${trade?.rate || ""} ETB\nTrade ID: #${tradeShort}`;
        break;

      case "usdt_released":
        smsMsg = isAm
          ? `EthioSwap: USDT ተለቋል! መታወቂያ: #${tradeShort}። የኪስ ቦርሳዎን ያረጋግጡ።`
          : `EthioSwap: USDT Released! ID: #${tradeShort}. Check your wallet balance.`;
        tgMsg = `✅ <b>USDT Released & Trade Completed</b>\n\nAmount: ${trade?.amountEth || ""} USDT\nTrade ID: #${tradeShort}\nSuccessfully added to your balance.`;
        break;

      case "trade_cancelled":
        smsMsg = isAm
          ? `EthioSwap: ስምምነት ተሰርዟል። መታወቂያ: #${tradeShort}።`
          : `EthioSwap: Trade cancelled. ID: #${tradeShort}.`;
        tgMsg = `❌ <b>Trade Cancelled</b>\n\nTrade ID: #${tradeShort} has been cancelled.`;
        break;

      case "dispute_opened":
        smsMsg = isAm
          ? `EthioSwap: በስምምነት #${tradeShort} ላይ አለመግባባት ተከፍቷል። ሒሳብ ታግዷል።`
          : `EthioSwap: Dispute opened on Trade #${tradeShort}. Escrow frozen.`;
        tgMsg = `⚠️ <b>Trade Disputed!</b>\n\nEscrow has been frozen.\nTrade ID: #${tradeShort}\nReason: ${args.extraText || ""}`;
        break;

      case "dispute_resolved":
        smsMsg = isAm
          ? `EthioSwap: አለመግባባት ተፈትቷል! መታወቂያ: #${tradeShort}።`
          : `EthioSwap: Dispute resolved for Trade #${tradeShort}. Check details.`;
        tgMsg = `⚖️ <b>Dispute Resolved</b>\n\nTrade ID: #${tradeShort}\nResolution: ${args.extraText || ""}`;
        break;

      case "withdrawal_submitted":
        smsMsg = isAm
          ? `EthioSwap: የመውጣት ጥያቄ ቀርቧል። መጠን: ${args.extraText} USDT። ሁኔታ: በመጠባበቅ ላይ።`
          : `EthioSwap: Withdrawal Request Submitted. Amount: ${args.extraText} USDT. Status: Pending Review.`;
        tgMsg = `📤 <b>Withdrawal Request Submitted</b>\n\nAmount: ${args.extraText} USDT\nStatus: Pending Review`;
        break;

      case "withdrawal_approved":
        smsMsg = isAm
          ? `EthioSwap: የመውጣት ጥያቄዎ ጸድቋል! መጠን: ${args.extraText} USDT።`
          : `EthioSwap: Your withdrawal request has been approved! Amount: ${args.extraText} USDT.`;
        tgMsg = `✅ <b>Withdrawal Request Approved</b>\n\nAmount: ${args.extraText} USDT\nStatus: Approved and processed successfully.`;
        break;

      case "withdrawal_rejected":
        smsMsg = isAm
          ? `EthioSwap: የመውጣት ጥያቄዎ ውድቅ ተደርጓል። ምክንያት: ${args.extraText || ""}`
          : `EthioSwap: Your withdrawal request was rejected. Reason: ${args.extraText || ""}`;
        tgMsg = `❌ <b>Withdrawal Request Rejected</b>\n\nReason: ${args.extraText || ""}`;
        break;

      case "deposit_received":
        smsMsg = isAm
          ? `EthioSwap: ተቀማጭ ተቀብሏል። መጠን: ${args.extraText} USDT። በደስታ መለያዎ ላይ ታክሏል።`
          : `EthioSwap: Deposit Received. Amount: ${args.extraText} USDT. Successfully added to your balance.`;
        tgMsg = `📥 <b>Deposit Received</b>\n\nAmount: ${args.extraText} USDT\nSuccessfully added to your balance.`;
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
        tgMsg = `❌ <b>KYC Rejected!</b>\n\nYour identity verification request was rejected.\nReason: ${args.extraText || ""}`;
        break;

      case "low_rating":
        notifTitle = "Low Rating Received";
        smsMsg = "EthioSwap Alert: You received a low rating. Provide great service to maintain your reputation.";
        tgMsg = `⚠️ <b>Low Rating Alert</b>\n\n${args.extraText || "You received a low rating. Provide great service to maintain your reputation."}`;
        break;

      case "security_alert":
        smsMsg = `EthioSwap Security Alert: ${args.extraText || ""}`;
        tgMsg = `🛡️ <b>Security Alert</b>\n\n${args.extraText || ""}`;
        break;



      default:
        smsMsg = `EthioSwap Alert: ${args.extraText || ""}`;
        tgMsg = `🔔 <b>Notification</b>\n\n${args.extraText || ""}`;
    }

    // Fetch system settings to check global disable controls
    const settings = await ctx.db.query("systemSettings").first();
    const isTelegramChannelDisabled = settings?.isTelegramChannelDisabled ?? false;

    // Telegram is the only notification channel. Send to bot if linked and
    // the global Telegram channel is not muted by an admin.
    if (user.telegramChatId && !isTelegramChannelDisabled) {
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
      title: notifTitle,
      message: smsMsg,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  },
});
