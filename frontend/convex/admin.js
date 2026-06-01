import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const USD_RATE = 1; // 1 unit = $1 (USD stable)

async function logAdminAction(ctx, adminId, action, targetId, targetName, details) {
  let adminUsername = "System Admin";
  if (adminId) {
    const adminObjId = ctx.db.normalizeId("users", adminId);
    let admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin) {
      const allUsers = await ctx.db.query("users").collect();
      admin = allUsers.find(u => u._id.toString() === adminId || u.username === adminId || (adminId === "usr_admin" && u.role === "admin")) || null;
    }
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
    const depositReqs = await ctx.db
      .query("depositRequests")
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();
    const withdrawReqs = await ctx.db
      .query("withdrawRequests")
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    const settings = await ctx.db.query("systemSettings").first();
    const feePercent = settings?.flatFeePercent ?? 1.0;

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
    const depositsInPeriod   = depositReqs.filter(r => new Date(r.reviewedAt || r.createdAt) >= start);
    const withdrawalsInPeriod = withdrawReqs.filter(r => new Date(r.reviewedAt || r.createdAt) >= start);

    const totalDeposit    = deposits.reduce((s, t) => s + t.amountUSD, 0);
    const totalWithdrawal = withdrawals.reduce((s, t) => s + t.amountUSD, 0);
    const volumeUSD       = completedInPeriod.reduce((s, t) => s + (t.amountETH * USD_RATE), 0);

    // Helper to calculate exact hybrid withdrawal fee for revenue calculations
    const getWithdrawalFee = (r) => {
      let networkFee = 0.00;
      const isExchange = r.walletType.includes("Binance") || r.walletType.includes("Bybit") || r.walletType.includes("Pay");
      if (!isExchange) {
        const dest = r.destinationAddress.trim();
        if (dest.startsWith("T") || dest.startsWith("t")) {
          networkFee = 0.10;
        } else if (dest.startsWith("0x") || dest.startsWith("0X")) {
          networkFee = 0.50;
        } else {
          networkFee = 0.10;
        }
      }
      const platformFee = Math.round((r.amountUSD * (feePercent / 100)) * 100) / 100;
      return Math.round((platformFee + networkFee) * 100) / 100;
    };

    // Calculate detailed fees in period
    const p2pFeesPeriod = completedInPeriod.reduce((s, t) => s + ((t.feeETH || 0) * USD_RATE), 0);
    const depositFeesPeriod = depositsInPeriod.reduce((s, r) => {
      const fee = r.amountUSD - Math.round((r.amountUSD / (1 + feePercent / 100)) * 100) / 100;
      return s + Math.max(fee, 0);
    }, 0);
    const withdrawalFeesPeriod = withdrawalsInPeriod.reduce((s, r) => s + getWithdrawalFee(r), 0);
    const feesUSD = p2pFeesPeriod + depositFeesPeriod + withdrawalFeesPeriod;

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
      const dayDepositReqsApproved = depositReqs.filter(r => {
        const d = new Date(r.reviewedAt || r.createdAt);
        return d >= dayStart && d < dayEnd;
      });
      const dayWithdrawReqsApproved = withdrawReqs.filter(r => {
        const d = new Date(r.reviewedAt || r.createdAt);
        return d >= dayStart && d < dayEnd;
      });

      const dayP2pFees = dayTrades.reduce((s, t) => s + ((t.feeETH || 0) * USD_RATE), 0);
      const dayDepFees = dayDepositReqsApproved.reduce((s, r) => {
        const fee = r.amountUSD - Math.round((r.amountUSD / (1 + feePercent / 100)) * 100) / 100;
        return s + Math.max(fee, 0);
      }, 0);
      const dayWithFees = dayWithdrawReqsApproved.reduce((s, r) => s + getWithdrawalFee(r), 0);

      chartData.push({
        day: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        volumeUSD: dayTrades.reduce((s, t) => s + (t.amountETH * USD_RATE), 0),
        depositUSD: dayDeposits.reduce((s, tx) => s + tx.amountUSD, 0),
        feeUSD: Math.round((dayP2pFees + dayDepFees + dayWithFees) * 100) / 100,
        count: dayTrades.length,
      });
    }

    // All-time metrics
    const allDeposits    = transactions.filter(t => t.type === "deposit");
    const allWithdrawals = transactions.filter(t => t.type === "withdrawal");
    
    const allP2pFees = trades.reduce((s, t) => s + ((t.feeETH || 0) * USD_RATE), 0);
    const allDepositFees = depositReqs.reduce((s, r) => {
      const fee = r.amountUSD - Math.round((r.amountUSD / (1 + feePercent / 100)) * 100) / 100;
      return s + Math.max(fee, 0);
    }, 0);
    const allWithdrawalFees = withdrawReqs.reduce((s, r) => s + getWithdrawalFee(r), 0);
    const allFees = Math.round((allP2pFees + allDepositFees + allWithdrawalFees) * 100) / 100;
    
    const allTrades      = trades;
    const buyCount  = allTrades.length;
    const sellCount = allTrades.length;

    // Users this week
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = users.filter(u => new Date(u.joinedAt) >= oneWeekAgo).length;

    // Fees this week
    const weekP2pFees = trades
      .filter(t => new Date(t.completedAt || t.createdAt) >= oneWeekAgo)
      .reduce((s, t) => s + ((t.feeETH || 0) * USD_RATE), 0);
    const weekDepFees = depositReqs
      .filter(r => new Date(r.reviewedAt || r.createdAt) >= oneWeekAgo)
      .reduce((s, r) => {
        const fee = r.amountUSD - Math.round((r.amountUSD / (1 + feePercent / 100)) * 100) / 100;
        return s + Math.max(fee, 0);
      }, 0);
    const weekWithFees = withdrawReqs
      .filter(r => new Date(r.reviewedAt || r.createdAt) >= oneWeekAgo)
      .reduce((s, r) => s + (r.amountUSD * (feePercent / 100)), 0);
    const feesThisWeek = Math.round((weekP2pFees + weekDepFees + weekWithFees) * 100) / 100;

    return {
      period,
      volumeUSD,
      depositUSD: totalDeposit,
      withdrawalUSD: totalWithdrawal,
      feesUSD: Math.round(feesUSD * 100) / 100,
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
        feesThisWeek,
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
    let user = null;
    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (userObjId) user = await ctx.db.get(userObjId);
    if (!user) {
      const allUsers = await ctx.db.query("users").collect();
      user = allUsers.find(u => u._id.toString() === args.userId) || null;
    }
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
      binanceBalance: admin.binanceBalance || 0,
      bybitBalance:  admin.bybitBalance || 0,
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
    let admin = null;
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    if (adminObjId) admin = await ctx.db.get(adminObjId);
    if (!admin) {
      const allUsers = await ctx.db.query("users").collect();
      admin = allUsers.find(u => u._id.toString() === args.adminId || u.username === args.adminId || (args.adminId === "usr_admin" && u.role === "admin")) || null;
    }
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const reqId = ctx.db.normalizeId("withdrawRequests", args.requestId);
    let req = reqId ? await ctx.db.get(reqId) : null;
    if (!req) {
      const allReqs = await ctx.db.query("withdrawRequests").collect();
      req = allReqs.find(r => r._id.toString() === args.requestId) || null;
    }
    if (!req) throw new Error("Withdrawal request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    const settings = await ctx.db.query("systemSettings").first();
    const feePercent = settings?.flatFeePercent ?? 1.0;
    
    // Determine dynamic flat network fee
    let networkFee = 0.00;
    const isExchange = req.walletType && (req.walletType.includes("Binance") || req.walletType.includes("Bybit") || req.walletType.includes("Pay"));
    if (!isExchange) {
      const dest = req.destinationAddress ? req.destinationAddress.trim() : "";
      if (dest.startsWith("T") || dest.startsWith("t")) {
        networkFee = 0.10;
      } else if (dest.startsWith("0x") || dest.startsWith("0X")) {
        networkFee = 0.50;
      } else {
        networkFee = 0.10; // Default to Tron TRC20 network fee
      }
    }

    const amountUSD = req.amountUSD || 0;
    const rawPlatformFee = amountUSD * (feePercent / 100);
    const platformFee = Math.round(rawPlatformFee * 100) / 100;
    const fee = Math.round((platformFee + networkFee) * 100) / 100;
    const netAmount = Math.round((amountUSD - fee) * 100) / 100;

    const systemAdmin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com"))
      .unique();
    if (systemAdmin) {
      await ctx.db.patch(systemAdmin._id, {
        ethBalance: (systemAdmin.ethBalance || 0) + fee,
      });
    }

    await ctx.db.patch(req._id, {
      status: "approved",
      adminNote: args.adminNote,
      reviewedAt: new Date().toISOString(),
    });

    await ctx.db.insert("transactions", {
      userId: req.userId,
      type: "withdrawal",
      amountETH: amountUSD,
      amountUSD: amountUSD,
      note: `Withdrawal approved to ${req.walletType || "External"} (${req.destinationAddress || "N/A"}) — Fee: $${fee.toFixed(2)} USD, Net Sent: $${netAmount.toFixed(2)} USD`,
      createdAt: new Date().toISOString(),
    });

    await ctx.db.insert("notifications", {
      userId: req.userId,
      type: "withdrawal_approved",
      message: `✅ Your withdrawal of $${amountUSD.toFixed(2)} USD has been approved. Net sent: $${netAmount.toFixed(2)} USD (after ${feePercent}% fee of $${fee.toFixed(2)} USD) to ${req.walletType || "External"}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await logAdminAction(ctx, args.adminId, "approve_withdrawal", args.requestId, req.username || "Unknown", `Approved withdrawal of $${amountUSD.toFixed(2)} USD to ${req.walletType || "External"}. Net: $${netAmount.toFixed(2)} USD`);

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
    let admin = null;
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    if (adminObjId) admin = await ctx.db.get(adminObjId);
    if (!admin) {
      const allUsers = await ctx.db.query("users").collect();
      admin = allUsers.find(u => u._id.toString() === args.adminId || u.username === args.adminId || (args.adminId === "usr_admin" && u.role === "admin")) || null;
    }
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const reqId = ctx.db.normalizeId("withdrawRequests", args.requestId);
    let req = reqId ? await ctx.db.get(reqId) : null;
    if (!req) {
      const allReqs = await ctx.db.query("withdrawRequests").collect();
      req = allReqs.find(r => r._id.toString() === args.requestId) || null;
    }
    if (!req) throw new Error("Withdrawal request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    const userObjId = ctx.db.normalizeId("users", req.userId);
    let user = userObjId ? await ctx.db.get(userObjId) : null;
    if (!user) {
      const allUsers = await ctx.db.query("users").collect();
      user = allUsers.find(u => u._id.toString() === req.userId) || null;
    }
    if (user) {
      await ctx.db.patch(user._id, {
        ethBalance: (user.ethBalance || 0) + (req.amountUSD || 0),
      });
    }

    await ctx.db.patch(req._id, {
      status: "rejected",
      adminNote: args.adminNote,
      reviewedAt: new Date().toISOString(),
    });

    await ctx.db.insert("notifications", {
      userId: req.userId,
      type: "withdrawal_rejected",
      message: `❌ Your withdrawal of $${(req.amountUSD || 0).toFixed(2)} USD has been rejected by the administrator. Reason: ${args.adminNote}. Refunded to active balance.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await logAdminAction(ctx, args.adminId, "reject_withdrawal", args.requestId, req.username || "Unknown", `Rejected withdrawal of $${(req.amountUSD || 0).toFixed(2)} USD. Reason: ${args.adminNote}`);

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

export const backfillNumericIds = mutation({
  args: { adminId: v.string() },
  handler: async (ctx, args) => {
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const allUsers = await ctx.db.query("users").collect();
    let updatedCount = 0;

    for (const u of allUsers) {
      if (!u.numericId || u.numericId < 100000 || u.numericId > 999999) {
        let unique6DigitId;
        let attempts = 0;
        while (attempts < 50) {
          const candidateId = Math.floor(100000 + Math.random() * 900000);
          const existingUser = await ctx.db.query("users")
            .withIndex("by_numericId", (q) => q.eq("numericId", candidateId))
            .unique();
          if (!existingUser) {
            unique6DigitId = candidateId;
            break;
          }
          attempts++;
        }
        if (unique6DigitId) {
          await ctx.db.patch(u._id, { numericId: unique6DigitId });
          updatedCount++;
        }
      }
    }

    return { success: true, updatedCount };
  }
});

