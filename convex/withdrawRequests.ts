import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("withdrawRequests").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    amountEth: v.number(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if ((user.ethBalance || 0) < args.amountEth) {
      throw new Error("Insufficient ETH balance for withdrawal");
    }

    // Lock the ETH
    await ctx.db.patch(args.userId, {
      ethBalance: user.ethBalance - args.amountEth,
      ethLocked: (user.ethLocked || 0) + args.amountEth,
    });

    return await ctx.db.insert("withdrawRequests", {
      ...args,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("withdrawRequests"),
    status: v.string(), // "approved" | "rejected"
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request already processed");

    const user = await ctx.db.get(request.userId);
    if (!user) throw new Error("User not found");

    if (args.status === "approved") {
      // Deduct from locked balance (already removed from ethBalance on create)
      await ctx.db.patch(request.userId, {
        ethLocked: (user.ethLocked || 0) - request.amountEth,
      });
    } else if (args.status === "rejected") {
      // Return to available balance
      await ctx.db.patch(request.userId, {
        ethBalance: (user.ethBalance || 0) + request.amountEth,
        ethLocked: (user.ethLocked || 0) - request.amountEth,
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
      .query("withdrawRequests")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});
