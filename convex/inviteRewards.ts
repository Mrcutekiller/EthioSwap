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
