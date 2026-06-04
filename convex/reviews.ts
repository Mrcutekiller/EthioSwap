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

export const update = mutation({
  args: {
    id: v.id("reviews"),
    rating: v.number(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      rating: args.rating,
      content: args.content,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const approve = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isApproved: true });
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reviews").order("desc").collect();
  },
});


