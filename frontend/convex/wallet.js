import { query } from "./_generated/server";
import { v } from "convex/values";

export const getBalance = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Try normalizeId first, fallback to full-scan match
    let user = null;
    try {
      const id = ctx.db.normalizeId("users", args.userId);
      if (id) user = await ctx.db.get(id);
    } catch {}

    if (!user) {
      const all = await ctx.db.query("users").collect();
      user = all.find(u => u._id.toString() === args.userId) || null;
    }

    if (!user) return null;

    return {
      ethBalance: user.ethBalance ?? 0,
      ethLocked:  user.ethLocked  ?? 0,
      etbBalance: user.etbBalance ?? 0,
      ethAddress: user.ethAddress,
    };
  }
});
