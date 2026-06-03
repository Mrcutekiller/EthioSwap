import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("reviews")
      .withIndex("by_approved", (q) => q.eq("isApproved", true))
      .order("desc")
      .take(6);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    username: v.string(),
    rating: v.number(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reviews", {
      ...args,
      isApproved: false,
      createdAt: new Date().toISOString(),
    });
  },
});
