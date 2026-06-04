import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("inviteRewards").order("desc").collect();
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const rewards = await ctx.db.query("inviteRewards").collect();
    return {
      totalInvites: rewards.length,
      totalRewardsPaid: rewards.filter(r => r.rewardStatus === "paid").reduce((s, r) => s + r.rewardAmount, 0),
      totalActive: rewards.filter(r => r.rewardStatus === "paid").length,
      totalPending: rewards.filter(r => r.rewardStatus === "pending").length,
    };
  },
});

export const listTopInviters = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.gt(q.field("successfulInvites"), 0))
      .order("desc")
      .take(args.limit);
  },
});

export const listForUser = query({
  args: { userId: v.any() },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    const rewards = await ctx.db.query("inviteRewards").collect();
    const userRewards = rewards.filter((r) => String(r.referrerId) === String(args.userId));
    
    const enriched = [];
    for (const r of userRewards) {
      const referredUser = await ctx.db.get(r.referredId);
      enriched.push({
        ...r,
        referredUsername: referredUser?.username || "Unknown",
      });
    }
    return enriched;
  },
});
