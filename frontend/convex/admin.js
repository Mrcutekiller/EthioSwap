import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const USD_RATE = 1; // 1 unit = $1 (USD stable)

async function logAdminAction(ctx, adminId, action, targetId, targetName, details) {
  let adminUsername = "System Admin";
  if (adminId) {
    const adminObjId = ctx.db.normalizeId("users", adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (admin) {
      adminUsername = admin.username;
    }
  }

  await ctx.db.insert("adminAuditLogs", {
    adminId: adminId || "system",
    adminUsername,
    action,
    targetId,
    targetName,
    details,
    createdAt: new Date().toISOString(),
  });
}


export const getRevenue = query({
  args: { period: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const period = args.period || "all";
    const transactions = await ctx.db.query("transactions").collect();
    const trades = await ctx.db
      .query("trades")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();
    const users = (await ctx.db.query("users").collect()).map(u => ({ joinedAt: u.joinedAt }));

    const now = new Date();
    const getStart = (p) => {
      switch (p) {
        case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case "week":  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "month": return new Date(now.getFullYear(), now.getMonth(), 1);
        default:      return new Date(0);
      }
    };

    const start = getStart(period);

    const deposits          = transactions.filter(t => t.type === "deposit"    && new Date(t.createdAt) >= start);
    const withdrawals       = transactions.filter(t => t.type === "withdrawal" && new Date(t.createdAt) >= start);
    const completedInPeriod = trades.filter(t => new Date(t.completedAt || t.createdAt) >= start);

    const totalDeposit    = deposits.reduce((s, t) => s + t.amountUSD, 0);
    const totalWithdrawal = withdrawals.reduce((s, t) => s + t.amountUSD, 0);
    const volumeUSD       = completedInPeriod.reduce((s, t) => s + (t.amountETH * USD_RATE), 0);
    const feesUSD         = completedInPeriod.reduce((s, t) => s + ((t.feeETH || 0) * USD_RATE), 0);

    // Build 7-day chart
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayTrades = completedInPeriod.filter(t => {
        const d = new Date(t.completedAt || t.createdAt);
        return d >= dayStart && d < dayEnd;
      });
      const dayDeposits = deposits.filter(tx => {
        const d = new Date(tx.createdAt);
        return d >= dayStart && d < dayEnd;
      });
      chartData.push({
        day: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        volumeUSD: dayTrades.reduce((s, t) => s + (t.amountETH * USD_RATE), 0),
        depositUSD: dayDeposits.reduce((s, tx) => s + tx.amountUSD, 0),
        feeUSD: dayTrades.reduce((s, t) => s + ((t.feeETH || 0) * USD_RATE), 0),
        count: dayTrades.length,
      });
    }

    // All-time metrics
    const allDeposits    = transactions.filter(t => t.type === "deposit");
    const allWithdrawals = transactions.filter(t => t.type === "withdrawal");
    const allFees        = trades.reduce((s, t) => s + ((t.feeETH || 0) * USD_RATE), 0);
    const allTrades      = trades;

    // Buy / sell count (buyer perspective)
    const buyCount  = allTrades.length; // each completed trade = 1 buy
    const sellCount = allTrades.length; // same number of sells

    // Users this week
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = users.filter(u => new Date(u.joinedAt) >= oneWeekAgo).length;

    return {
      period,
      volumeUSD,
      depositUSD: totalDeposit,
      withdrawalUSD: totalWithdrawal,
      feesUSD,
      tradeCount: completedInPeriod.length,
      userCount: users.length,
      chartData,
      metrics: {
        totalUSD:          allTrades.reduce((s, t) => s + (t.amountETH * USD_RATE), 0),
        totalDeposit:      allDeposits.reduce((s, t) => s + t.amountUSD, 0),
        totalWithdrawal:   allWithdrawals.reduce((s, t) => s + t.amountUSD, 0),
        totalMyProfit:     allFees,
        totalUsers:        users.length,
        newUsersThisWeek,
        buyCount,
        sellCount,
        feesThisWeek:      trades
          .filter(t => new Date(t.completedAt || t.createdAt) >= oneWeekAgo)
          .reduce((s, t) => s + ((t.feeETH || 0) * USD_RATE), 0),
      },
    };
  }
});

export const getKycQueue = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter(u => u.kycStatus === "pending" || u.kycStep === "pending")
      .map(u => ({
        id: u._id.toString(),
        _id: u._id,
        username: u.username,
        phone: u.phone,
        email: u.email,
        fullName: u.fullName,
        kycStatus: u.kycStatus,
        kycStep: u.kycStep,
        kycData: u.kycData,
        joinedAt: u.joinedAt,
      }));
  }
});

export const getUserKycImages = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    const user = userObjId ? await ctx.db.get(userObjId) : null;
    if (!user) return null;
    return {
      kycIdFront: user.kycIdFront,
      kycIdBack: user.kycIdBack,
      kycSelfie: user.kycSelfie,
      kycDocument: user.kycDocument,
    };
  }
});

export const getDisputes = query({
  handler: async (ctx) => {
    const trades = await ctx.db.query("trades")
      .filter((q) => q.eq(q.field("status"), "disputed"))
      .collect();

    return await Promise.all(trades.map(async (t) => {
      let buyer  = null;
      let seller = null;
      try {
        const buyerId  = ctx.db.normalizeId("users", t.buyerId);
        if (buyerId)  buyer  = await ctx.db.get(buyerId);
      } catch {}
      try {
        const sellerId = ctx.db.normalizeId("users", t.sellerId);
        if (sellerId) seller = await ctx.db.get(sellerId);
      } catch {}
      return {
        ...t,
        id: t._id.toString(),
        buyerName:  buyer?.username  || "Unknown",
        sellerName: seller?.username || "Unknown",
      };
    }));
  }
});

export const getTransactions = query({
  handler: async (ctx) => {
    const txs = await ctx.db.query("transactions").collect();
    return txs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100)
      .map(t => ({ ...t, id: t._id.toString() }));
  }
});

// New: admin earnings summary for the earnings card
export const getAdminEarnings = query({
  args: { adminId: v.string() },
  handler: async (ctx, args) => {
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin) return null;

    const trades = await ctx.db.query("trades")
      .filter(q => q.eq(q.field("status"), "completed"))
      .collect();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalEarned  = trades.reduce((s, t) => s + ((t.feeETH || 0)), 0);
    const earnedWeek   = trades.filter(t => new Date(t.completedAt || t.createdAt) >= weekAgo).reduce((s, t) => s + ((t.feeETH || 0)), 0);
    const earnedMonth  = trades.filter(t => new Date(t.completedAt || t.createdAt) >= monthAgo).reduce((s, t) => s + ((t.feeETH || 0)), 0);

    return {
      walletBalance: admin.ethBalance,
      walletLocked:  admin.ethLocked || 0,
      totalEarned,
      earnedWeek,
      earnedMonth,
    };
  }
});

export const warnUser = mutation({
  args: { userId: v.string(), message: v.string(), adminId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    const newWarning = {
      id: Math.random().toString(36).substring(2, 9),
      message: args.message,
      createdAt: new Date().toISOString(),
    };

    const currentWarnings = user.warnings || [];
    const updatedWarnings = [...currentWarnings, newWarning];

    await ctx.db.patch(userObjId, { warnings: updatedWarnings });

    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "warning",
      message: `⚠️ Admin Warning: ${args.message}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await logAdminAction(ctx, args.adminId, "warn_user", args.userId, user.username, `Issued warning: "${args.message}"`);

    return { success: true, warning: newWarning };
  }
});


export const toggleSuspendUser = mutation({
  args: { userId: v.string(), isSuspended: v.boolean(), adminId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    if (user.role === "admin") {
      throw new Error("Cannot suspend an administrator account");
    }

    await ctx.db.patch(userObjId, { isSuspended: args.isSuspended });

    if (args.isSuspended) {
      const userListings = await ctx.db.query("listings")
        .filter(q => q.eq(q.field("sellerId"), args.userId))
        .collect();
      for (const listing of userListings) {
        await ctx.db.patch(listing._id, { status: "paused" });
      }
    }

    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "status_change",
      message: args.isSuspended 
        ? "🛑 Your account has been suspended by the administration due to violating our guidelines."
        : "✅ Your account suspension has been lifted by the administration.",
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await logAdminAction(ctx, args.adminId, args.isSuspended ? "suspend_user" : "unsuspend_user", args.userId, user.username, args.isSuspended ? "Suspended user account" : "Restored user account");

    return { success: true };
  }
});


export const removeUser = mutation({
  args: { userId: v.string(), adminId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    if (user.role === "admin") {
      throw new Error("Cannot remove an administrator account");
    }

    const userListings = await ctx.db.query("listings")
      .filter(q => q.eq(q.field("sellerId"), args.userId))
      .collect();
    for (const listing of userListings) {
      await ctx.db.delete(listing._id);
    }

    const username = user.username;
    await ctx.db.delete(userObjId);

    await logAdminAction(ctx, args.adminId, "remove_user", args.userId, username, "Permanently deleted user account");

    return { success: true };
  }
});


export const listAllWithdrawalRequests = query({
  handler: async (ctx) => {
    const list = await ctx.db.query("withdrawRequests").collect();
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
});

export const approveWithdrawal = mutation({
  args: {
    requestId: v.string(),
    adminId: v.string(),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const reqId = ctx.db.normalizeId("withdrawRequests", args.requestId);
    const req = reqId ? await ctx.db.get(reqId) : null;
    if (!req) throw new Error("Withdrawal request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    const settings = await ctx.db.query("systemSettings").first();
    const feePercent = settings?.flatFeePercent ?? 1.0;
    const fee = req.amountUSD * (feePercent / 100);
    const netAmount = req.amountUSD - fee;

    const systemAdmin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com"))
      .unique();
    if (systemAdmin) {
      await ctx.db.patch(systemAdmin._id, {
        ethBalance: systemAdmin.ethBalance + fee,
      });
    }

    await ctx.db.patch(reqId, {
      status: "approved",
      adminNote: args.adminNote,
      reviewedAt: new Date().toISOString(),
    });

    await ctx.db.insert("transactions", {
      userId: req.userId,
      type: "withdrawal",
      amountETH: req.amountUSD,
      amountUSD: req.amountUSD,
      note: `Withdrawal approved to ${req.walletType} (${req.destinationAddress}) — Fee: $${fee.toFixed(2)} USD, Net Sent: $${netAmount.toFixed(2)} USD`,
      createdAt: new Date().toISOString(),
    });

    await ctx.db.insert("notifications", {
      userId: req.userId,
      type: "withdrawal_approved",
      message: `✅ Your withdrawal of $${req.amountUSD.toFixed(2)} USD has been approved. Net sent: $${netAmount.toFixed(2)} USD (after ${feePercent}% fee of $${fee.toFixed(2)} USD) to ${req.walletType}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await logAdminAction(ctx, args.adminId, "approve_withdrawal", args.requestId, req.username, `Approved withdrawal of $${req.amountUSD.toFixed(2)} USD to ${req.walletType}. Net: $${netAmount.toFixed(2)} USD`);

    return { success: true };
  }
});

export const rejectWithdrawal = mutation({
  args: {
    requestId: v.string(),
    adminId: v.string(),
    adminNote: v.string(),
  },
  handler: async (ctx, args) => {
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const reqId = ctx.db.normalizeId("withdrawRequests", args.requestId);
    const req = reqId ? await ctx.db.get(reqId) : null;
    if (!req) throw new Error("Withdrawal request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    const userObjId = ctx.db.normalizeId("users", req.userId);
    const user = userObjId ? await ctx.db.get(userObjId) : null;
    if (user) {
      await ctx.db.patch(user._id, {
        ethBalance: user.ethBalance + req.amountUSD,
      });
    }

    await ctx.db.patch(reqId, {
      status: "rejected",
      adminNote: args.adminNote,
      reviewedAt: new Date().toISOString(),
    });

    await ctx.db.insert("notifications", {
      userId: req.userId,
      type: "withdrawal_rejected",
      message: `❌ Your withdrawal of $${req.amountUSD.toFixed(2)} USD has been rejected by the administrator. Reason: ${args.adminNote}. Refunded to active balance.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await logAdminAction(ctx, args.adminId, "reject_withdrawal", args.requestId, req.username, `Rejected withdrawal of $${req.amountUSD.toFixed(2)} USD. Reason: ${args.adminNote}`);

    return { success: true };
  }
});

export const getAuditLogs = query({
  handler: async (ctx) => {
    const logs = await ctx.db.query("adminAuditLogs").collect();
    return logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100);
  }
});

export const adminSetKycStatus = mutation({
  args: {
    adminId: v.string(),
    userId: v.string(),
    status: v.string(),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    const step = args.status === "approved" ? "approved" : "none";

    await ctx.db.patch(userObjId, {
      kycStatus: args.status,
      kycStep: step,
      kycRejectionReason: args.status === "rejected" ? (args.reason || "Reset by admin") : null
    });

    await logAdminAction(
      ctx,
      args.adminId,
      args.status === "approved" ? "admin_verify_user" : "admin_unverify_user",
      args.userId,
      user.username,
      args.status === "approved"
        ? "Administratively verified user account (instant KYC approval)"
        : `Administratively unverified user account. Reason: ${args.reason || "Reset by administrator"}`
    );

    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.status === "approved" ? "kyc_approved" : "kyc_rejected",
      message: args.status === "approved"
        ? "✓ Your account has been administratively verified by the team. You can now trade freely."
        : `⚠ Your identity verification status has been reset by the administrator: ${args.reason || "Reset by administrator"}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  }
});

export const getUserTransactionsForAdmin = query({
  args: { adminId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const txs = await ctx.db.query("transactions")
      .withIndex("by_userId", q => q.eq("userId", args.userId))
      .collect();

    return txs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
  }
});

