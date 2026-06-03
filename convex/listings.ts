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
          sellerTotalTrades: seller?.totalTrades,
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
    return await ctx.db.insert("listings", {
      ...args,
      status: "active",
      createdAt: new Date().toISOString(),
    });
  },
});
