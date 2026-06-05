import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const buyerTrades = await ctx.db
      .query("trades")
      .withIndex("by_buyer", (q) => q.eq("buyerId", args.userId))
      .collect();
    const sellerTrades = await ctx.db
      .query("trades")
      .withIndex("by_seller", (q) => q.eq("sellerId", args.userId))
      .collect();

    const allTrades = [...buyerTrades, ...sellerTrades];
    
    return await Promise.all(
      allTrades.map(async (t) => {
        const buyer = t.buyerId ? await ctx.db.get(t.buyerId) : null;
        const seller = await ctx.db.get(t.sellerId);
        
        const ratingRecord = await ctx.db
          .query("tradeRatings")
          .withIndex("by_trade", (q) => q.eq("tradeId", t._id))
          .filter((q) => q.eq(q.field("raterId"), args.userId))
          .first();

        return {
          ...t,
          buyerName: buyer?.username,
          sellerName: seller?.username,
          ratingGiven: ratingRecord ? ratingRecord.rating : null,
          ratingComment: ratingRecord ? ratingRecord.comment : null,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    buyerId: v.id("users"),
    sellerId: v.id("users"),
    listingId: v.id("listings"),
    amountEth: v.number(),
    amountEtb: v.number(),
    feeEth: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Check seller balance
    const seller = await ctx.db.get(args.sellerId);
    if (!seller) throw new Error("Seller not found");
    
    const totalEthNeeded = args.amountEth + args.feeEth;
    if (seller.ethBalance < totalEthNeeded) {
      throw new Error("Seller has insufficient ETH balance for this trade");
    }

    // 2. Lock the ETH from seller
    await ctx.db.patch(args.sellerId, {
      ethBalance: seller.ethBalance - totalEthNeeded,
      ethLocked: (seller.ethLocked || 0) + totalEthNeeded,
    });

    // 3. Create the trade
    const tradeId = await ctx.db.insert("trades", {
      ...args,
      status: "payment_pending",
      createdAt: new Date().toISOString(),
    });

    // Dispatch notifications
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: args.sellerId,
      type: "trade_matched",
      tradeId,
      extraText: `${args.amountEth} USD`,
    });
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: args.buyerId,
      type: "trade_matched",
      tradeId,
      extraText: `${args.amountEth} USD`,
    });

    return tradeId;
  },
});

export const markPaid = mutation({
  args: { tradeId: v.id("trades") },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "payment_pending") throw new Error("Trade is not in payment_pending status");

    await ctx.db.patch(args.tradeId, {
      status: "paid",
    });

    const buyer = await ctx.db.get(trade.buyerId!);
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: trade.sellerId,
      type: "payment_sent",
      tradeId: args.tradeId,
      extraText: buyer ? `@${buyer.username}` : "The buyer",
    });
  },
});

export const releaseEth = mutation({
  args: { tradeId: v.id("trades") },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "paid") throw new Error("Trade must be marked as paid before releasing ETH");

    const seller = await ctx.db.get(trade.sellerId);
    const buyer = await ctx.db.get(trade.buyerId);
    if (!seller || !buyer) throw new Error("User not found");

    const totalLocked = trade.amountEth + trade.feeEth;

    // 1. Deduct from seller's locked balance and update volume
    const sellerVolume = (seller.totalVolume || 0) + (trade.amountEth || 0);
    const sellerTrades = (seller.totalTrades || 0) + 1;
    const sellerAvgRating = seller.averageRating || 5;
    const isSellerVerified = sellerTrades >= 50 && sellerAvgRating >= 4.5;
    await ctx.db.patch(trade.sellerId, {
      ethLocked: seller.ethLocked - totalLocked,
      totalTrades: sellerTrades,
      totalVolume: sellerVolume,
      is_verified_trader: isSellerVerified,
    });

    // 2. Add to buyer's balance and update volume
    const buyerVolume = (buyer.totalVolume || 0) + (trade.amountEth || 0);
    const buyerTrades = (buyer.totalTrades || 0) + 1;
    const buyerAvgRating = buyer.averageRating || 5;
    const isBuyerVerified = buyerTrades >= 50 && buyerAvgRating >= 4.5;
    await ctx.db.patch(trade.buyerId, {
      ethBalance: (buyer.ethBalance || 0) + trade.amountEth,
      totalTrades: buyerTrades,
      totalVolume: buyerVolume,
      is_verified_trader: isBuyerVerified,
    });

    // 3. Complete trade
    await ctx.db.patch(args.tradeId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });

    // Dispatch notification
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: trade.buyerId,
      type: "usdt_released",
      tradeId: args.tradeId,
      extraText: `${trade.amountEth} USD`,
    });

    // 5. Handle fee
    const settings = await ctx.db.query("systemSettings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        collectedFeesETH: (settings.collectedFeesETH || 0) + trade.feeEth,
      });
    }

    return { success: true };
  },
});

export const cancelTrade = mutation({
  args: { tradeId: v.id("trades") },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.status === "completed" || trade.status === "cancelled") {
      throw new Error("Trade already finished");
    }

    const seller = await ctx.db.get(trade.sellerId);
    if (!seller) throw new Error("Seller not found");

    const totalLocked = trade.amountEth + trade.feeEth;

    // 1. Unlock ETH back to seller
    await ctx.db.patch(trade.sellerId, {
      ethBalance: seller.ethBalance + totalLocked,
      ethLocked: seller.ethLocked - totalLocked,
    });

    // 2. Update trade status
    await ctx.db.patch(args.tradeId, {
      status: "cancelled",
    });

    return { success: true };
  },
});

export const listDisputed = query({
  args: {},
  handler: async (ctx) => {
    const disputedTrades = await ctx.db
      .query("trades")
      .filter((q) => q.eq(q.field("status"), "disputed"))
      .collect();

    return await Promise.all(
      disputedTrades.map(async (t) => {
        const buyer = t.buyerId ? await ctx.db.get(t.buyerId) : null;
        const seller = await ctx.db.get(t.sellerId);
        return {
          ...t,
          buyerName: buyer?.username,
          sellerName: seller?.username,
        };
      })
    );
  },
});

export const submitTradeRating = mutation({
  args: {
    tradeId: v.id("trades"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "completed") throw new Error("Trade is not completed yet");

    // Authenticate user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
    if (!user) throw new Error("User not found");

    if (user._id !== trade.buyerId && user._id !== trade.sellerId) {
      throw new Error("You are not part of this trade");
    }

    const raterId = user._id;
    const ratedId = raterId === trade.buyerId ? trade.sellerId : trade.buyerId!;

    // Check duplicate rating
    const existing = await ctx.db
      .query("tradeRatings")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
      .filter((q) => q.eq(q.field("raterId"), raterId))
      .first();
    if (existing) throw new Error("You have already rated this trade");

    await ctx.db.insert("tradeRatings", {
      tradeId: args.tradeId,
      raterId,
      ratedId,
      rating: args.rating,
      comment: args.comment,
      createdAt: new Date().toISOString(),
    });

    // Update rated user average rating and badge
    const allRatings = await ctx.db
      .query("tradeRatings")
      .withIndex("by_rated", (q) => q.eq("ratedId", ratedId))
      .collect();

    const sum = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = sum / allRatings.length;

    const ratedUser = await ctx.db.get(ratedId);
    if (ratedUser) {
      const completedTradesCount = ratedUser.totalTrades || 0;
      const isVerified = completedTradesCount >= 50 && avg >= 4.5;
      await ctx.db.patch(ratedId, {
        averageRating: avg,
        is_verified_trader: isVerified,
      });
    }

    return { success: true };
  },
});

export const openDispute = mutation({
  args: {
    tradeId: v.id("trades"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "payment_pending" && trade.status !== "paid") {
      throw new Error("Dispute can only be opened on active trades");
    }

    const createdTime = new Date(trade.createdAt).getTime();
    const elapsedTime = Date.now() - createdTime;
    if (elapsedTime < 30 * 60 * 1000) {
      throw new Error("You must wait 30 minutes since trade start to open a dispute");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
    if (!user) throw new Error("User not found");

    if (user._id !== trade.buyerId && user._id !== trade.sellerId) {
      throw new Error("You are not authorized to open a dispute on this trade");
    }

    await ctx.db.patch(args.tradeId, {
      status: "disputed",
    });

    const disputeId = await ctx.db.insert("disputes", {
      tradeId: args.tradeId,
      openedBy: user._id,
      reason: args.reason,
      status: "open",
      buyerEvidence: [],
      sellerEvidence: [],
      createdAt: new Date().toISOString(),
    });

    const counterpartyId = user._id === trade.buyerId ? trade.sellerId : trade.buyerId!;
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: counterpartyId,
      type: "dispute_opened",
      tradeId: args.tradeId,
      extraText: args.reason,
    });
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: user._id,
      type: "dispute_opened",
      tradeId: args.tradeId,
      extraText: args.reason,
    });

    return disputeId;
  },
});

export const uploadDisputeEvidence = mutation({
  args: {
    tradeId: v.id("trades"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
    if (!user) throw new Error("User not found");

    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "disputed") throw new Error("Trade is not in disputed status");

    const dispute = await ctx.db
      .query("disputes")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();
    if (!dispute) throw new Error("Open dispute not found for this trade");

    const isBuyer = user._id === trade.buyerId;
    const isSeller = user._id === trade.sellerId;
    if (!isBuyer && !isSeller) throw new Error("Unauthorized");

    if (isBuyer) {
      const evidence = dispute.buyerEvidence || [];
      if (evidence.length >= 3) throw new Error("Max 3 evidence files allowed");
      await ctx.db.patch(dispute._id, {
        buyerEvidence: [...evidence, args.storageId],
      });
    } else {
      const evidence = dispute.sellerEvidence || [];
      if (evidence.length >= 3) throw new Error("Max 3 evidence files allowed");
      await ctx.db.patch(dispute._id, {
        sellerEvidence: [...evidence, args.storageId],
      });
    }

    return { success: true };
  },
});

export const resolveDispute = mutation({
  args: {
    disputeId: v.id("disputes"),
    resolution: v.string(), // "release_to_buyer" | "refund_to_seller" | "split"
    splitBuyerPercent: v.optional(v.number()),
    adminNote: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
    if (!admin || admin.role !== "admin") throw new Error("Only admins can resolve disputes");

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute || dispute.status !== "open") throw new Error("Dispute not found or already resolved");

    const trade = await ctx.db.get(dispute.tradeId);
    if (!trade) throw new Error("Trade not found");

    const totalLocked = trade.amountEth + trade.feeEth;
    const buyerId = trade.buyerId!;
    const sellerId = trade.sellerId;
    const buyer = await ctx.db.get(buyerId);
    const seller = await ctx.db.get(sellerId);
    if (!buyer || !seller) throw new Error("Trade counterparties not found");

    if (args.resolution === "release_to_buyer") {
      await ctx.db.patch(sellerId, {
        ethLocked: seller.ethLocked - totalLocked,
        totalTrades: (seller.totalTrades || 0) + 1,
        totalVolume: (seller.totalVolume || 0) + trade.amountEth,
      });
      await ctx.db.patch(buyerId, {
        ethBalance: (buyer.ethBalance || 0) + trade.amountEth,
        totalTrades: (buyer.totalTrades || 0) + 1,
        totalVolume: (buyer.totalVolume || 0) + trade.amountEth,
      });
      await ctx.db.patch(trade._id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    } else if (args.resolution === "refund_to_seller") {
      await ctx.db.patch(sellerId, {
        ethBalance: seller.ethBalance + totalLocked,
        ethLocked: seller.ethLocked - totalLocked,
      });
      await ctx.db.patch(trade._id, {
        status: "cancelled",
      });
    } else if (args.resolution === "split") {
      const buyerPct = args.splitBuyerPercent || 50;
      if (buyerPct < 0 || buyerPct > 100) throw new Error("Split percent must be between 0 and 100");
      const sellerPct = 100 - buyerPct;

      const buyerShare = (trade.amountEth * buyerPct) / 100;
      const sellerShare = (totalLocked * sellerPct) / 100;

      await ctx.db.patch(sellerId, {
        ethBalance: seller.ethBalance + sellerShare,
        ethLocked: seller.ethLocked - totalLocked,
        totalTrades: (seller.totalTrades || 0) + 1,
        totalVolume: (seller.totalVolume || 0) + (trade.amountEth - buyerShare),
      });

      await ctx.db.patch(buyerId, {
        ethBalance: (buyer.ethBalance || 0) + buyerShare,
        totalTrades: (buyer.totalTrades || 0) + 1,
        totalVolume: (buyer.totalVolume || 0) + buyerShare,
      });

      await ctx.db.patch(trade._id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    } else {
      throw new Error("Invalid resolution action");
    }

    await ctx.db.patch(args.disputeId, {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolvedBy: admin._id,
      resolution: args.resolution,
      splitBuyerPercent: args.splitBuyerPercent,
      adminNote: args.adminNote,
    });

    await ctx.db.insert("disputeAuditLogs", {
      adminId: admin._id,
      adminUsername: admin.username,
      tradeId: dispute.tradeId,
      action: args.resolution,
      details: args.adminNote,
      createdAt: new Date().toISOString(),
    });

    const resolutionMessage = `${args.resolution.toUpperCase().replace(/_/g, ' ')}. Note: ${args.adminNote}`;
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: buyerId,
      type: "dispute_resolved",
      tradeId: trade._id,
      extraText: resolutionMessage,
    });
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: sellerId,
      type: "dispute_resolved",
      tradeId: trade._id,
      extraText: resolutionMessage,
    });

    return { success: true };
  },
});

export const listAllDisputes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
    if (!admin || admin.role !== "admin") throw new Error("Forbidden");

    const allDisputes = await ctx.db.query("disputes").order("desc").collect();

    return await Promise.all(
      allDisputes.map(async (d) => {
        const trade = await ctx.db.get(d.tradeId);
        const buyer = trade ? await ctx.db.get(trade.buyerId!) : null;
        const seller = trade ? await ctx.db.get(trade.sellerId) : null;
        const opener = await ctx.db.get(d.openedBy);

        return {
          ...d,
          buyerUsername: buyer?.username,
          sellerUsername: seller?.username,
          openerUsername: opener?.username,
          amountEth: trade?.amountEth,
          amountEtb: trade?.amountEtb,
          rate: trade?.rate,
        };
      })
    );
  },
});

export const getDisputeForTrade = query({
  args: { tradeId: v.id("trades") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("disputes")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();
  },
});

