import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const buyerTrades = await ctx.db
      .query("trades")
      .filter((q) => q.eq(q.field("buyerId"), args.userId))
      .collect();
    
    const sellerTrades = await ctx.db
      .query("trades")
      .filter((q) => q.eq(q.field("sellerId"), args.userId))
      .collect();

    const allTrades = [...buyerTrades, ...sellerTrades];

    // Resolve partner names
    return await Promise.all(allTrades.map(async (t) => {
      const buyer = await ctx.db.get(ctx.db.normalizeId("users", t.buyerId));
      const seller = await ctx.db.get(ctx.db.normalizeId("users", t.sellerId));
      return {
        ...t,
        id: t._id.toString(),
        buyerName: buyer?.username || "Unknown",
        sellerName: seller?.username || "Unknown",
        buyerPhone: buyer?.phone || "Unknown",
        sellerPhone: seller?.phone || "Unknown",
      };
    }));
  }
});

export const sendMessage = mutation({
  args: { tradeId: v.string(), senderId: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    const tradeId = ctx.db.normalizeId("trades", args.tradeId);
    const trade = await ctx.db.get(tradeId);
    if (!trade) throw new Error("Trade not found");

    const chat = [...trade.chat, {
      senderId: args.senderId,
      message: args.message,
      timestamp: new Date().toISOString(),
    }];

    await ctx.db.patch(tradeId, { chat });
  }
});

export const markPaid = mutation({
  args: { tradeId: v.string(), buyerId: v.string(), proofUrl: v.string() },
  handler: async (ctx, args) => {
    const tradeId = ctx.db.normalizeId("trades", args.tradeId);
    const trade = await ctx.db.get(tradeId);
    if (!trade || trade.buyerId !== args.buyerId) throw new Error("Unauthorized");

    await ctx.db.patch(tradeId, {
      status: "paid",
      proofUrl: args.proofUrl,
      chat: [...trade.chat, {
        senderId: "system",
        message: "Buyer has marked as paid and uploaded proof. Seller, please verify.",
        timestamp: new Date().toISOString(),
      }]
    });

    // Notify the seller in real-time
    const buyer = await ctx.db.get(ctx.db.normalizeId("users", trade.buyerId));
    const buyerName = buyer?.username || "Buyer";
    
    await ctx.db.insert("notifications", {
      userId: trade.sellerId,
      type: "trade_paid",
      message: `@${buyerName} has sent the money and is waiting for you to release the $`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
});

export const releaseEscrow = mutation({
  args: { tradeId: v.string(), sellerId: v.string() },
  handler: async (ctx, args) => {
    const tradeId = ctx.db.normalizeId("trades", args.tradeId);
    const trade = await ctx.db.get(tradeId);
    if (!trade || trade.sellerId !== args.sellerId) throw new Error("Unauthorized");

    const buyerId = ctx.db.normalizeId("users", trade.buyerId);
    const sellerId = ctx.db.normalizeId("users", trade.sellerId);
    const buyer = await ctx.db.get(buyerId);
    const seller = await ctx.db.get(sellerId);

    // Calculate commission
    const settings = await ctx.db.query("systemSettings").first();
    const commissionType = settings?.commissionType || "percentage";
    const commissionValue = settings?.commissionValue ?? 0.5;

    let fee = 0;
    if (commissionType === "percentage") {
      fee = trade.amountETH * (commissionValue / 100);
    } else {
      fee = Math.min(commissionValue, trade.amountETH);
    }

    const netAmount = trade.amountETH - fee;

    // Send fee to admin
    const admin = await ctx.db.query("users")
      .withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com"))
      .unique();
    if (admin && fee > 0) {
      await ctx.db.patch(admin._id, { ethBalance: admin.ethBalance + fee });
    }

    // Transfer logic
    await ctx.db.patch(buyerId, { ethBalance: buyer.ethBalance + netAmount });
    await ctx.db.patch(sellerId, { ethLocked: seller.ethLocked - trade.amountETH });

    await ctx.db.patch(tradeId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      feeETH: fee,
      chat: [...trade.chat, {
        senderId: "system",
        message: `Escrow released! $${netAmount.toFixed(2)} USD transferred to buyer. Commission fee of $${fee.toFixed(2)} USD sent to admin.`,
        timestamp: new Date().toISOString(),
      }]
    });

    // Notify buyer
    await ctx.db.insert("notifications", {
      userId: trade.buyerId,
      type: "trade_completed",
      message: `Trade completed! $${netAmount.toFixed(2)} USD received from @${seller.username}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
});

export const openDispute = mutation({
  args: { tradeId: v.string(), userId: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const tradeId = ctx.db.normalizeId("trades", args.tradeId);
    const trade = await ctx.db.get(tradeId);
    if (!trade) throw new Error("Trade not found");

    await ctx.db.patch(tradeId, {
      status: "disputed",
      disputeReason: args.reason,
      disputedBy: args.userId,
      chat: [...trade.chat, {
        senderId: "system",
        message: `⚠️ Dispute opened by ${args.userId === trade.buyerId ? "Buyer" : "Seller"}. Reason: ${args.reason}`,
        timestamp: new Date().toISOString(),
      }]
    });
  }
});

export const cancelTrade = mutation({
  args: { tradeId: v.string(), buyerId: v.string() },
  handler: async (ctx, args) => {
    const tradeId = ctx.db.normalizeId("trades", args.tradeId);
    const trade = await ctx.db.get(tradeId);
    if (!trade || trade.buyerId !== args.buyerId) throw new Error("Unauthorized");
    if (trade.status === "paid") throw new Error("Cannot cancel a paid trade. Open a dispute instead.");

    const sellerId = ctx.db.normalizeId("users", trade.sellerId);
    const seller = await ctx.db.get(sellerId);

    // Unlock ETH for seller
    await ctx.db.patch(sellerId, { 
      ethBalance: seller.ethBalance + trade.amountETH,
      ethLocked: seller.ethLocked - trade.amountETH 
    });

    await ctx.db.patch(tradeId, {
      status: "cancelled",
      chat: [...trade.chat, {
        senderId: "system",
        message: "Trade cancelled by buyer. ETH returned to seller's balance.",
        timestamp: new Date().toISOString(),
      }]
    });
  }
});

export const initiateTrade = mutation({
  args: {
    listingId: v.string(),
    buyerId: v.string(),
    amountETH: v.number(),
    selectedPaymentAccount: v.optional(v.object({
      id: v.string(),
      bankName: v.string(),
      accountNumber: v.string(),
      holderName: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const listingId = ctx.db.normalizeId("listings", args.listingId);
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new Error("Listing not found");

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

    const settings = await ctx.db.query("systemSettings").first();
    const rate = settings?.etbRatePerDollar ?? 190.0;

    const isBuyListing = listing.type === "buy";
    
    let tradeBuyerId = "";
    let tradeSellerId = "";
    let chosenAccount = null;

    if (isBuyListing) {
      // Maker (creator) wants to BUY USD. Taker wants to SELL USD.
      tradeBuyerId = listing.sellerId; // Creator is buyer
      tradeSellerId = args.buyerId;   // Taker is seller

      // Taker (seller) must lock their balance!
      const takerObjId = ctx.db.normalizeId("users", args.buyerId);
      const taker = await ctx.db.get(takerObjId);
      if (!taker) throw new Error("Taker not found");

      const available = taker.ethBalance - (taker.ethLocked || 0);
      if (available < args.amountETH) {
        throw new Error("Insufficient available USD balance in your wallet to sell");
      }

      // Lock Taker's USD
      await ctx.db.patch(takerObjId, {
        ethBalance: taker.ethBalance - args.amountETH,
        ethLocked: taker.ethLocked + args.amountETH,
      });

      // Taker (seller) provides their own account to receive ETB payout
      chosenAccount = args.selectedPaymentAccount || null;
    } else {
      // Maker (creator) wants to SELL USD. Taker wants to BUY USD.
      tradeBuyerId = args.buyerId;   // Taker is buyer
      tradeSellerId = listing.sellerId; // Creator is seller

      // Maker's USD was already locked when listing was created.
      // Use selected account or fallback to listing's first payment account
      chosenAccount = args.selectedPaymentAccount || 
                      (listing.paymentAccounts && listing.paymentAccounts.length > 0 ? listing.paymentAccounts[0] : null);
    }

    const tradeId = await ctx.db.insert("trades", {
      listingId: args.listingId,
      buyerId: tradeBuyerId,
      sellerId: tradeSellerId,
      amountETH: args.amountETH,
      amountETB: Math.round(args.amountETH * rate),
      status: "payment_pending",
      timerExpiresAt: expiresAt,
      chat: [{
        senderId: "system",
        message: `Trade opened! Buyer has 30 minutes to pay. Amount: $${args.amountETH.toFixed(2)} USD.`,
        timestamp: new Date().toISOString(),
      }],
      proofUrl: null,
      selectedPaymentAccount: chosenAccount || undefined,
    });

    // Update listing amount or status
    if (listing.amountETH === args.amountETH) {
      await ctx.db.patch(listingId, { status: "sold" });
    } else {
      await ctx.db.patch(listingId, { amountETH: listing.amountETH - args.amountETH });
    }

    return tradeId;
  }
});

// ── Admin dispute resolution (bypasses buyer/seller ownership check) ─────────

export const adminReleaseEscrow = mutation({
  args: { tradeId: v.string(), adminId: v.string() },
  handler: async (ctx, args) => {
    const tradeId = ctx.db.normalizeId("trades", args.tradeId);
    const trade = await ctx.db.get(tradeId);
    if (!trade) throw new Error("Trade not found");

    const buyerObjId = ctx.db.normalizeId("users", trade.buyerId);
    const sellerObjId = ctx.db.normalizeId("users", trade.sellerId);
    const buyer = await ctx.db.get(buyerObjId);
    const seller = await ctx.db.get(sellerObjId);

    // Calculate commission
    const settings = await ctx.db.query("systemSettings").first();
    const commissionType = settings?.commissionType || "percentage";
    const commissionValue = settings?.commissionValue ?? 0.5;

    let fee = 0;
    if (commissionType === "percentage") {
      fee = trade.amountETH * (commissionValue / 100);
    } else {
      fee = Math.min(commissionValue, trade.amountETH);
    }

    const netAmount = trade.amountETH - fee;

    // Send fee to admin
    const admin = await ctx.db.query("users")
      .withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com"))
      .unique();
    if (admin && fee > 0) {
      await ctx.db.patch(admin._id, { ethBalance: admin.ethBalance + fee });
    }

    // Transfer net to buyer and deduct full from seller's locked
    await ctx.db.patch(buyerObjId, { ethBalance: buyer.ethBalance + netAmount });
    await ctx.db.patch(sellerObjId, { ethLocked: Math.max(0, seller.ethLocked - trade.amountETH) });

    await ctx.db.patch(tradeId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      feeETH: fee,
      chat: [...trade.chat, {
        senderId: "system",
        message: `⚖️ Admin resolved dispute: $${netAmount.toFixed(2)} USD released to buyer. Commission fee of $${fee.toFixed(2)} USD sent to admin.`,
        timestamp: new Date().toISOString(),
      }]
    });

    await ctx.db.insert("notifications", {
      userId: trade.buyerId,
      type: "dispute_resolved",
      message: `Dispute resolved in your favor. $${netAmount.toFixed(2)} USD released to your wallet.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    await ctx.db.insert("notifications", {
      userId: trade.sellerId,
      type: "dispute_resolved",
      message: `Dispute resolved by admin. $${netAmount.toFixed(2)} USD was released to the buyer.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
});

export const adminRefundSeller = mutation({
  args: { tradeId: v.string(), adminId: v.string() },
  handler: async (ctx, args) => {
    const tradeId = ctx.db.normalizeId("trades", args.tradeId);
    const trade = await ctx.db.get(tradeId);
    if (!trade) throw new Error("Trade not found");

    const sellerObjId = ctx.db.normalizeId("users", trade.sellerId);
    const seller = await ctx.db.get(sellerObjId);

    // Return locked ETH to seller's available balance
    await ctx.db.patch(sellerObjId, {
      ethBalance: seller.ethBalance + trade.amountETH,
      ethLocked: Math.max(0, seller.ethLocked - trade.amountETH),
    });

    await ctx.db.patch(tradeId, {
      status: "cancelled",
      completedAt: new Date().toISOString(),
      chat: [...trade.chat, {
        senderId: "system",
        message: "⚖️ Admin resolved dispute: ETH refunded to seller.",
        timestamp: new Date().toISOString(),
      }]
    });

    await ctx.db.insert("notifications", {
      userId: trade.sellerId,
      type: "dispute_resolved",
      message: `Dispute resolved in your favor. $${trade.amountETH.toFixed(2)} USD returned to your wallet.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    await ctx.db.insert("notifications", {
      userId: trade.buyerId,
      type: "dispute_resolved",
      message: `Dispute resolved by admin. $${trade.amountETH.toFixed(2)} USD was refunded to the seller.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
});

export const getRecentCompleted = query({
  handler: async (ctx) => {
    const trades = await ctx.db
      .query("trades")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const sortedTrades = trades
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
      .slice(0, 10);

    return await Promise.all(sortedTrades.map(async (t) => {
      const buyer = await ctx.db.get(ctx.db.normalizeId("users", t.buyerId));
      const seller = await ctx.db.get(ctx.db.normalizeId("users", t.sellerId));
      return {
        id: t._id.toString(),
        buyerName: buyer?.username || "Unknown",
        sellerName: seller?.username || "Unknown",
        amountETH: t.amountETH,
        amountETB: t.amountETB,
        completedAt: t.completedAt || t.createdAt,
      };
    }));
  }
});

