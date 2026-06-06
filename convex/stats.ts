import { query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const traders = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("kycStatus"), "approved"))
      .collect();
    
    const completedTrades = await ctx.db
      .query("trades")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const approvedReviews = await ctx.db
      .query("reviews")
      .filter((q) => q.eq(q.field("isApproved"), true))
      .collect();

    const volume = completedTrades.reduce((acc, t) => acc + (t.amountEth * 3000), 0);
    const avgRating = approvedReviews.length 
      ? approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length 
      : 0;

    return {
      traders: traders.length,
      volume: Math.round(volume),
      avg: avgRating.toFixed(1),
      scams: 0,
    };
  },
});

export const getAdminAnalytics = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.userId);
    if (!admin || admin.role !== "admin") {
      console.warn(`Unauthorized getAdminAnalytics query from userId: ${args.userId}`);
      return null;
    }

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const startOfTodayIso = startOfToday.toISOString();

    const users = await ctx.db.query("users").collect();
    const trades = await ctx.db.query("trades").collect();
    const disputes = await ctx.db.query("disputes").collect();

    // Today's Stats
    const completedTradesToday = trades.filter(t => t.status === "completed" && t.completedAt && t.completedAt >= startOfTodayIso);
    const volumeToday = completedTradesToday.reduce((sum, t) => sum + (t.amountEth || 0), 0);
    const newSignupsToday = users.filter(u => u.joinedAt && u.joinedAt >= startOfTodayIso).length;
    const openDisputesCount = disputes.filter(d => d.status === "open").length;
    const pendingKycCount = users.filter(u => u.kycStatus === "pending" || u.kycStatus === "submitted").length;

    // Charts: 30 Days volume
    const dailyVolume: { date: string; volume: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * oneDayMs);
      const startOfD = new Date(d); startOfD.setHours(0,0,0,0);
      const endOfD = new Date(d); endOfD.setHours(23,59,59,999);
      
      const vol = trades
        .filter(t => t.status === "completed" && t.completedAt && t.completedAt >= startOfD.toISOString() && t.completedAt <= endOfD.toISOString())
        .reduce((sum, t) => sum + (t.amountEth || 0), 0);
      dailyVolume.push({ 
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), 
        volume: vol 
      });
    }

    // Charts: Weekly new users (last 6 weeks)
    const weeklyUsers: { week: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const startOfWeek = new Date(now - (i + 1) * 7 * oneDayMs);
      const endOfWeek = new Date(now - i * 7 * oneDayMs);
      const count = users.filter(u => u.joinedAt && u.joinedAt >= startOfWeek.toISOString() && u.joinedAt < endOfWeek.toISOString()).length;
      weeklyUsers.push({ week: `Wk -${i}`, count });
    }

    // Status distributions
    const completedCount = trades.filter(t => t.status === "completed").length;
    const cancelledCount = trades.filter(t => t.status === "cancelled").length;
    const disputedCount = trades.filter(t => t.status === "disputed" || t.status === "resolved").length;

    // Top 10 Traders by volume this month
    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0,0,0,0);
    const completedThisMonth = trades.filter(t => t.status === "completed" && t.completedAt && t.completedAt >= startOfThisMonth.toISOString());

    const traderVolumes: Record<string, { username: string; volume: number; count: number }> = {};
    for (const t of completedThisMonth) {
      const buyerId = String(t.buyerId);
      const sellerId = String(t.sellerId);

      const buyer = users.find(u => String(u._id) === buyerId);
      const seller = users.find(u => String(u._id) === sellerId);

      if (buyer) {
        if (!traderVolumes[buyerId]) traderVolumes[buyerId] = { username: buyer.username, volume: 0, count: 0 };
        traderVolumes[buyerId].volume += t.amountEth || 0;
        traderVolumes[buyerId].count += 1;
      }
      if (seller) {
        if (!traderVolumes[sellerId]) traderVolumes[sellerId] = { username: seller.username, volume: 0, count: 0 };
        traderVolumes[sellerId].volume += t.amountEth || 0;
        traderVolumes[sellerId].count += 1;
      }
    }
    const topTraders = Object.values(traderVolumes)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // Most disputed users
    const userTradeStats: Record<string, { username: string; totalTrades: number; disputeCount: number }> = {};
    for (const u of users) {
      userTradeStats[String(u._id)] = { username: u.username, totalTrades: 0, disputeCount: 0 };
    }

    for (const t of trades) {
      const bId = String(t.buyerId);
      const sId = String(t.sellerId);
      if (userTradeStats[bId]) userTradeStats[bId].totalTrades++;
      if (userTradeStats[sId]) userTradeStats[sId].totalTrades++;
    }

    for (const d of disputes) {
      const t = trades.find(tr => tr._id === d.tradeId);
      if (t) {
        const bId = String(t.buyerId);
        const sId = String(t.sellerId);
        if (userTradeStats[bId]) userTradeStats[bId].disputeCount++;
        if (userTradeStats[sId]) userTradeStats[sId].disputeCount++;
      }
    }

    const highlyDisputedUsers = Object.entries(userTradeStats)
      .map(([userId, stats]) => {
        const rate = stats.totalTrades > 0 ? (stats.disputeCount / stats.totalTrades) : 0;
        return {
          userId,
          username: stats.username,
          totalTrades: stats.totalTrades,
          disputeCount: stats.disputeCount,
          disputeRate: Math.round(rate * 100),
        };
      })
      .filter(item => item.disputeCount >= 2 && item.disputeRate >= 20)
      .sort((a, b) => b.disputeRate - a.disputeRate);

    // Flagged Accounts
    const flaggedAccounts = users.map(u => {
      const disputesCount = disputes.filter(d => {
        const t = trades.find(tr => tr._id === d.tradeId);
        return t && (t.buyerId === u._id || t.sellerId === u._id);
      }).length;

      const rejectedCount = u.kycRejectedCount || 0;
      const isAutoFlagged = disputesCount >= 3 || rejectedCount >= 2 || u.isFlagged === true;
      let reason = u.flaggedReason || "";
      if (disputesCount >= 3 && !reason.includes("3+ disputes")) {
        reason += (reason ? ", " : "") + "3+ trade disputes";
      }
      if (rejectedCount >= 2 && !reason.includes("KYC rejected twice")) {
        reason += (reason ? ", " : "") + "KYC rejected twice or more";
      }

      return {
        userId: u._id,
        username: u.username,
        role: u.role || "user",
        kycStatus: u.kycStatus || "unverified",
        disputesCount,
        kycRejectedCount: rejectedCount,
        isAutoFlagged,
        autoFlaggedReason: reason,
      };
    }).filter(u => u.isAutoFlagged);

    // Recent trades feed
    const lastTenTrades = trades.slice(-10).reverse().map((t) => {
      const buyer = t.buyerId ? users.find(u => u._id === t.buyerId) : null;
      const seller = users.find(u => u._id === t.sellerId);
      return {
        id: t._id,
        buyerName: buyer?.username || "---",
        sellerName: seller?.username || "---",
        amountEth: t.amountEth || 0,
        amountEtb: t.amountEtb || 0,
        status: t.status,
        createdAt: t.createdAt,
      };
    });

    return {
      today: {
        completedTrades: completedTradesToday.length,
        volume: volumeToday,
        newSignups: newSignupsToday,
        openDisputes: openDisputesCount,
        pendingKyc: pendingKycCount,
      },
      charts: {
        dailyVolume,
        weeklyUsers,
        distribution: {
          completed: completedCount,
          cancelled: cancelledCount,
          disputed: disputedCount,
        },
      },
      topTraders,
      highlyDisputedUsers,
      flaggedAccounts,
      recentTrades: lastTenTrades,
    };
  }
});
