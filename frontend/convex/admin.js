import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const USD_RATE = 1; // 1 unit = $1 (USD stable)

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
  args: { userId: v.string(), message: v.string() },
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

    return { success: true, warning: newWarning };
  }
});

export const toggleSuspendUser = mutation({
  args: { userId: v.string(), isSuspended: v.boolean() },
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

    return { success: true };
  }
});

export const removeUser = mutation({
  args: { userId: v.string() },
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

    await ctx.db.delete(userObjId);

    return { success: true };
  }
});
