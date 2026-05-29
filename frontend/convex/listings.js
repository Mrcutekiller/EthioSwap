import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  handler: async (ctx) => {
    const listings = await ctx.db
      .query("listings")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    return await Promise.all(listings.map(async (l) => {
      const seller = await ctx.db.get(ctx.db.normalizeId("users", l.sellerId));
      return {
        ...l,
        id: l._id.toString(),
        sellerName: seller?.username || "Unknown",
        sellerReputation: seller?.reputation || 0,
        sellerTotalTrades: seller?.totalTrades || 0,
      };
    }));
  }
});

export const create = mutation({
  args: {
    sellerId: v.string(),
    amountETH: v.number(),
    minLimitETB: v.number(),
    maxLimitETB: v.number(),
    paymentMethods: v.array(v.string()),
    customRateETB: v.optional(v.number()),
    type: v.optional(v.string()),
    paymentAccounts: v.optional(v.array(v.object({
      id: v.string(),
      bankName: v.string(),
      accountNumber: v.string(),
      holderName: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const sellerId = ctx.db.normalizeId("users", args.sellerId);
    const seller = await ctx.db.get(sellerId);
    if (!seller) throw new Error("Seller not found");
    if (seller.kycStatus !== "approved") throw new Error("KYC verification required to create listings");
    
    const isBuyListing = args.type === "buy";

    if (!isBuyListing) {
      const available = seller.ethBalance - (seller.ethLocked || 0);
      if (available < args.amountETH) {
        throw new Error("Insufficient available USD balance");
      }

      // Lock USD for seller
      await ctx.db.patch(sellerId, {
        ethBalance: seller.ethBalance - args.amountETH,
        ethLocked: seller.ethLocked + args.amountETH,
      });
    }

    return await ctx.db.insert("listings", {
      sellerId: args.sellerId,
      amountETH: args.amountETH,
      minLimitETB: args.minLimitETB,
      maxLimitETB: args.maxLimitETB,
      paymentMethods: args.paymentMethods,
      customRateETB: args.customRateETB,
      type: args.type || "sell",
      paymentAccounts: args.paymentAccounts,
      status: "active",
      createdAt: new Date().toISOString(),
    });
  }
});

export const pause = mutation({
  args: { listingId: v.string(), sellerId: v.string() },
  handler: async (ctx, args) => {
    const listingId = ctx.db.normalizeId("listings", args.listingId);
    const listing = await ctx.db.get(listingId);
    if (!listing || listing.sellerId !== args.sellerId) throw new Error("Unauthorized");

    await ctx.db.patch(listingId, { status: "paused" });
  }
});
