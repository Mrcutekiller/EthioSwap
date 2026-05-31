import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_SETTINGS = {
  etbRatePerDollar: 190.0,
  etbRatePerDollarSell: 186.0,
  flatFeePercent: 1.0,
  maxFeeUSD: 0.50,
  collectedFeesETH: 0.0,
  masterWalletBalanceETH: 0.0,
  masterWalletAddress: "0x71C259654103112E118830F25f82bb54aA20336d",
  commissionType: "percentage",
  commissionValue: 1.0,
};

export const get = query({
  handler: async (ctx) => {
    const settings = await ctx.db.query("systemSettings").first();
    return settings ?? { ...DEFAULT_SETTINGS, id: null };
  }
});

export const update = mutation({
  args: {
    etbRatePerDollar: v.optional(v.number()),
    etbRatePerDollarSell: v.optional(v.number()),
    commissionType: v.optional(v.string()),
    commissionValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("systemSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("systemSettings", { ...DEFAULT_SETTINGS, ...args });
    }
    return { message: "Settings updated" };
  }
});
