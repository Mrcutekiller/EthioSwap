import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Map seller info
    return await Promise.all(
      listings.map(async (l) => {
        const seller = await ctx.db.get(l.sellerId);
        return {
          ...l,
          sellerName: seller?.username,
          sellerReputation: seller?.reputation,
          sellerTotalTrades: seller?.totalTrades || 0,
          sellerAverageRating: seller?.averageRating || 5.0,
          isSellerVerifiedTrader: seller?.is_verified_trader || false,
          sellerKycStatus: seller?.kycStatus || "unverified",
          sellerPositivePercentage: seller?.positive_percentage || 0,
          sellerReputationBadge: seller?.reputationBadge || "none",
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    sellerId: v.id("users"),
    amountEth: v.number(),
    minLimitEtb: v.number(),
    maxLimitEtb: v.number(),
    paymentMethods: v.array(v.string()),
    type: v.string(),
    customRateEtb: v.optional(v.number()),
    paymentAccounts: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify seller exists and is not suspended
    const seller = await ctx.db.get(args.sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }
    if (seller.isSuspended) {
      throw new Error("Account is suspended. Cannot create listings.");
    }
    return await ctx.db.insert("listings", {
      ...args,
      status: "active",
      createdAt: new Date().toISOString(),
    });
  },
});

export const getCalculatorData = query({
  args: {},
  handler: async (ctx) => {
    const activeListings = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const settings = await ctx.db.query("systemSettings").first();
    const defaultBuy = settings?.etbRatePerDollar || 110;
    const defaultSell = settings?.etbRatePerDollarSell || settings?.etbRatePerDollar || 108;

    let bestBuyOffer = null;
    let bestSellOffer = null;

    const sellListings = activeListings.filter(l => l.type === "sell" && l.customRateEtb !== undefined);
    if (sellListings.length > 0) {
      sellListings.sort((a, b) => (a.customRateEtb || 0) - (b.customRateEtb || 0));
      bestBuyOffer = sellListings[0];
    }

    const buyListings = activeListings.filter(l => l.type === "buy" && l.customRateEtb !== undefined);
    if (buyListings.length > 0) {
      buyListings.sort((a, b) => (b.customRateEtb || 0) - (a.customRateEtb || 0));
      bestSellOffer = buyListings[0];
    }

    const bestBuyRate = bestBuyOffer?.customRateEtb || defaultBuy;
    const bestSellRate = bestSellOffer?.customRateEtb || defaultSell;

    const history = await ctx.db
      .query("rateHistory")
      .order("desc")
      .take(24);

    const rateHistory = history.reverse();

    if (rateHistory.length === 0) {
      const avg = (bestBuyRate + bestSellRate) / 2;
      rateHistory.push({
        _id: "dummy" as any,
        _creationTime: Date.now(),
        buyRate: bestBuyRate,
        sellRate: bestSellRate,
        averageRate: avg,
        createdAt: new Date().toISOString(),
      });
    }

    const bestBuyUser = bestBuyOffer ? await ctx.db.get(bestBuyOffer.sellerId) : null;
    const bestSellUser = bestSellOffer ? await ctx.db.get(bestSellOffer.sellerId) : null;

    return {
      bestBuyRate,
      bestSellRate,
      bestBuyOfferId: bestBuyOffer?._id || null,
      bestSellOfferId: bestSellOffer?._id || null,
      bestBuyOfferUsername: bestBuyUser?.username || null,
      bestSellOfferUsername: bestSellUser?.username || null,
      rateHistory,
    };
  }
});

export const recordRateSnapshot = mutation({
  args: {},
  handler: async (ctx) => {
    const activeListings = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const settings = await ctx.db.query("systemSettings").first();
    const defaultBuy = settings?.etbRatePerDollar || 110;
    const defaultSell = settings?.etbRatePerDollarSell || settings?.etbRatePerDollar || 108;

    const sellListings = activeListings.filter(l => l.type === "sell" && l.customRateEtb !== undefined);
    const buyListings = activeListings.filter(l => l.type === "buy" && l.customRateEtb !== undefined);

    let bestBuyRate = defaultBuy;
    if (sellListings.length > 0) {
      sellListings.sort((a, b) => (a.customRateEtb || 0) - (b.customRateEtb || 0));
      bestBuyRate = sellListings[0].customRateEtb || defaultBuy;
    }

    let bestSellRate = defaultSell;
    if (buyListings.length > 0) {
      buyListings.sort((a, b) => (b.customRateEtb || 0) - (a.customRateEtb || 0));
      bestSellRate = buyListings[0].customRateEtb || defaultSell;
    }

    const averageRate = (bestBuyRate + bestSellRate) / 2;

    await ctx.db.insert("rateHistory", {
      buyRate: bestBuyRate,
      sellRate: bestSellRate,
      averageRate,
      createdAt: new Date().toISOString(),
    });

    const history = await ctx.db
      .query("rateHistory")
      .order("desc")
      .collect();

    if (history.length > 24) {
      for (let i = 24; i < history.length; i++) {
        await ctx.db.delete(history[i]._id);
      }
    }

    return { success: true };
  }
});

