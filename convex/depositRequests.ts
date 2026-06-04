import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("depositRequests").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("depositRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    amountUsd: v.number(),
    amountEth: v.number(),
    screenshotUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("depositRequests", {
      ...args,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("depositRequests"),
    status: v.string(), // "approved" | "rejected"
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request already processed");

    if (args.status === "approved") {
      const user = await ctx.db.get(request.userId);
      if (!user) throw new Error("User not found");
      
      await ctx.db.patch(request.userId, {
        ethBalance: (user.ethBalance || 0) + request.amountEth,
      });
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      adminNote: args.adminNote,
      reviewedAt: new Date().toISOString(),
    });
  },
});

export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("depositRequests")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});
