import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
        const buyer = await ctx.db.get(t.buyerId);
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

    // 4. Send notification to seller
    await ctx.db.insert("notifications", {
      userId: args.sellerId,
      title: "New Trade Request",
      message: `Someone wants to buy ${args.amountEth} ETH from you.`,
      type: "trade_request",
      isRead: false,
      createdAt: new Date().toISOString(),
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

    // Send notification to seller
    await ctx.db.insert("notifications", {
      userId: trade.sellerId,
      title: "Payment Received",
      message: "The buyer has marked the trade as paid. Please verify and release the ETH.",
      type: "payment_received",
      isRead: false,
      createdAt: new Date().toISOString(),
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

    // 1. Deduct from seller's locked balance
    await ctx.db.patch(trade.sellerId, {
      ethLocked: seller.ethLocked - totalLocked,
      totalTrades: (seller.totalTrades || 0) + 1,
    });

    // 2. Add to buyer's balance
    await ctx.db.patch(trade.buyerId, {
      ethBalance: (buyer.ethBalance || 0) + trade.amountEth,
      totalTrades: (buyer.totalTrades || 0) + 1,
    });

    // 3. Complete trade
    await ctx.db.patch(args.tradeId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });

    // 4. Send notification to buyer
    await ctx.db.insert("notifications", {
      userId: trade.buyerId,
      title: "ETH Released",
      message: `${trade.amountEth} ETH has been released to your wallet.`,
      type: "trade_completed",
      isRead: false,
      createdAt: new Date().toISOString(),
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

