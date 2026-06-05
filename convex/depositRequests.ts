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
      
      const settings = await ctx.db.query("systemSettings").first();
      const feePercent = settings?.depositFeePercent !== undefined ? settings.depositFeePercent : 1.0;
      const feeEth = request.amountEth * (feePercent / 100);
      const amountNet = Math.max(0, request.amountEth - feeEth);

      await ctx.db.patch(request.userId, {
        ethBalance: (user.ethBalance || 0) + amountNet,
      });

      if (settings) {
        await ctx.db.patch(settings._id, {
          collectedFeesETH: (settings.collectedFeesETH || 0) + feeEth,
        });
      }
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      adminNote: args.adminNote,
      reviewedAt: new Date().toISOString(),
    });
  },
});

export const listForUser = query({
  args: { userId: v.any() },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    const all = await ctx.db.query("depositRequests").collect();
    return all
      .filter((r) => String(r.userId) === String(args.userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
});
