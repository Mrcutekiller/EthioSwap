import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyAndInvalidateOtp } from "./otp";
import { api } from "./_generated/api";

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
    otpCode: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify OTP for withdrawal first!
    await verifyAndInvalidateOtp(ctx.db, args.userId, "withdrawal", args.otpCode);

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

    const request = await ctx.db.insert("withdrawRequests", {
      userId: args.userId,
      amountEth: args.amountEth,
      address: args.address,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Dispatch withdrawal notification
    const usdAmount = Math.round(args.amountEth * 3000);
    await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
      userId: args.userId,
      type: "withdrawal_submitted",
      extraText: `${usdAmount}`,
    });

    return request;
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

      const settings = await ctx.db.query("systemSettings").first();
      const feePercent = settings?.withdrawalFeePercent !== undefined ? settings.withdrawalFeePercent : 1.0;
      const feeEth = request.amountEth * (feePercent / 100);

      if (settings) {
        await ctx.db.patch(settings._id, {
          collectedFeesETH: (settings.collectedFeesETH || 0) + feeEth,
        });
      }
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
  args: { userId: v.any() },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    const all = await ctx.db.query("withdrawRequests").collect();
    return all
      .filter((r) => String(r.userId) === String(args.userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
});
