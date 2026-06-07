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
    amountUSD: v.optional(v.number()),
    network: v.optional(v.string()),
    walletType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Telegram is the only OTP channel. Without it the user cannot
    // receive the withdrawal code, so we reject the request.
    if (user.role !== "admin" && (!user.telegramLinked || !user.telegramChatId)) {
      throw new Error("Telegram is not connected. Please reconnect Telegram in Settings before withdrawing.");
    }

    // 1. Verify OTP for withdrawal first!
    await verifyAndInvalidateOtp(ctx.db, args.userId, "withdrawal", args.otpCode);

    if ((user.ethBalance || 0) < args.amountEth) {
      throw new Error("Insufficient balance for withdrawal");
    }

    // Enforce minimum withdrawal limit
    const settings = await ctx.db.query("systemSettings").first();
    const minWithdraw = settings?.minWithdrawalUSD ?? 10; // Default to $10
    const checkUsdAmount = args.amountUSD ?? (args.amountEth * 3000);
    if (checkUsdAmount < minWithdraw) {
      throw new Error(`Withdrawal amount $${checkUsdAmount.toFixed(2)} is below the minimum limit of $${minWithdraw}`);
    }

    // Lock the ETH (USD balance)
    await ctx.db.patch(args.userId, {
      ethBalance: user.ethBalance - args.amountEth,
      ethLocked: (user.ethLocked || 0) + args.amountEth,
    });

    const { otpCode, ...insertArgs } = args;
    const request = await ctx.db.insert("withdrawRequests", {
      ...insertArgs,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Dispatch withdrawal notification
    const usdAmount = Math.round(checkUsdAmount);
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

      // Dispatch approval notification
      const usdAmount = Math.round(request.amountEth * 3000);
      await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
        userId: request.userId,
        type: "withdrawal_approved",
        extraText: `${usdAmount}`,
      });
    } else if (args.status === "rejected") {
      // Return to available balance
      await ctx.db.patch(request.userId, {
        ethBalance: (user.ethBalance || 0) + request.amountEth,
        ethLocked: (user.ethLocked || 0) - request.amountEth,
      });

      // Dispatch rejection notification
      await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
        userId: request.userId,
        type: "withdrawal_rejected",
        extraText: args.adminNote || "Rejected by administration",
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
