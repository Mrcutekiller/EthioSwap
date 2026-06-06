import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Submit a new rating for a trade
export const submitTradeRating = mutation({
  args: {
    tradeId: v.id("trades"),
    rating: v.number(), // stars: 1 to 5
    comment: v.optional(v.string()), // short review text (max 200 chars)
    lowRatingReason: v.optional(v.string()), // required if rating < 3
    userId: v.id("users"), // rater ID
  },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "completed") throw new Error("Trade is not completed yet");

    const raterId = args.userId;
    if (raterId !== trade.buyerId && raterId !== trade.sellerId) {
      throw new Error("You are not part of this trade");
    }

    const ratedId = raterId === trade.buyerId ? trade.sellerId : trade.buyerId!;
    const raterType = raterId === trade.buyerId ? "buyer" : "seller";

    // 1. One rating per trade per person
    const existing = await ctx.db
      .query("tradeRatings")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
      .filter((q) => q.eq(q.field("raterId"), raterId))
      .first();
    if (existing) throw new Error("You have already rated this trade");

    // 2. Rating window limit: 48 hours
    if (trade.completedAt) {
      const timeDiff = Date.now() - new Date(trade.completedAt).getTime();
      if (timeDiff > 48 * 60 * 60 * 1000) {
        throw new Error("The 48-hour rating window has expired.");
      }
    }

    // 3. Low rating handling: below 3 stars requires a reason
    if (args.rating < 3 && (!args.lowRatingReason || !args.lowRatingReason.trim())) {
      throw new Error("Please select or write a reason for the low rating.");
    }

    // Insert the rating
    const ratingId = await ctx.db.insert("tradeRatings", {
      tradeId: args.tradeId,
      raterId,
      ratedId,
      rating: args.rating,
      comment: args.comment ? args.comment.substring(0, 200) : undefined,
      raterType,
      lowRatingReason: args.rating < 3 ? args.lowRatingReason : undefined,
      isFlagged: false,
      createdAt: new Date().toISOString(),
    });

    // 4. Update the rated user stats & badge
    await recalculateUserStats(ctx, ratedId);

    // 5. Handle low rating notifications and alerts
    if (args.rating < 3) {
      const rater = await ctx.db.get(raterId);
      const ratedUser = await ctx.db.get(ratedId);
      const reason = args.lowRatingReason || "None provided";

      // Notify the rated user
      await ctx.db.insert("notifications", {
        userId: ratedId,
        type: "low_rating",
        title: "Low Rating Received ⚠️",
        message: `You received a low rating (${args.rating} stars) for trade #${args.tradeId.substring(0, 8)}. Provide great service to maintain your reputation.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // Dispatch Telegram low-rating alert if connected
      if (ratedUser && ratedUser.telegramChatId) {
        await ctx.scheduler.runAfter(0, api.notifications.dispatchNotification, {
          userId: ratedId,
          type: "low_rating",
          extraText: `You received a low rating (${args.rating} stars) for trade #${args.tradeId.substring(0, 8)}.\nReason: ${reason}.`,
        });
      }

      // Notify Admin
      const admins = await ctx.db.query("users").filter((q) => q.eq(q.field("role"), "admin")).collect();
      for (const admin of admins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "low_rating_admin",
          title: "Low Rating Alert",
          message: `User @${ratedUser?.username || "unknown"} received a ${args.rating}-star rating from @${rater?.username || "unknown"}. Reason: "${reason}"`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      await ctx.db.insert("adminAuditLogs", {
        adminId: ratedId, // Log against system/user context
        adminUsername: "system",
        action: "low_rating_received",
        details: `User @${ratedUser?.username || "unknown"} received a ${args.rating}-star rating from @${rater?.username || "unknown"}. Reason: "${reason}"`,
        createdAt: new Date().toISOString(),
      });
    }

    // 6. Handle 3 consecutive 1-star ratings lockout check
    const recentRatings = await ctx.db
      .query("tradeRatings")
      .withIndex("by_rated", (q) => q.eq("ratedId", ratedId))
      .order("desc")
      .take(3);

    if (recentRatings.length === 3 && recentRatings.every(r => r.rating === 1)) {
      await ctx.db.patch(ratedId, {
        isFlagged: true,
        flaggedReason: "Account flagged for review due to 3 consecutive 1-star ratings",
      });

      // Send critical alert to admins
      const admins = await ctx.db.query("users").filter((q) => q.eq(q.field("role"), "admin")).collect();
      for (const admin of admins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "critical_flag",
          title: "🚨 Trader Flagged Automatically",
          message: `Trader @${(await ctx.db.get(ratedId))?.username} has been flagged for admin review after receiving 3 consecutive 1-star ratings.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return { success: true };
  },
});

// Helper function to recalculate user stars average, positive review percent, and updates badge
async function recalculateUserStats(ctx: any, userId: any) {
  const ratings = await ctx.db
    .query("tradeRatings")
    .withIndex("by_rated", (q) => q.eq("ratedId", userId))
    .filter((q) => q.ne(q.field("isFlagged"), true))
    .collect();

  const user = await ctx.db.get(userId);
  if (!user) return;

  const totalCompletedTrades = user.totalCompletedTrades || user.totalTrades || 0;
  const totalRatings = ratings.length;

  let avgRating = 0.0;
  let positivePercentage = 0;

  if (totalRatings > 0) {
    const sum = ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0);
    avgRating = Math.round((sum / totalRatings) * 10) / 10;

    const positiveCount = ratings.filter((r: any) => r.rating >= 4).length;
    positivePercentage = Math.round((positiveCount / totalRatings) * 100);
  }

  // Calculate badge based on thresholds
  // 4.0+ rating + 20 trades = Trusted badge
  // 4.8+ rating + 50 trades = Top Rated badge
  // 4.9+ rating + 100 trades = Elite badge
  let badge = "none";
  if (avgRating >= 4.9 && totalCompletedTrades >= 100) {
    badge = "Elite";
  } else if (avgRating >= 4.8 && totalCompletedTrades >= 50) {
    badge = "Top Rated";
  } else if (avgRating >= 4.0 && totalCompletedTrades >= 20) {
    badge = "Trusted";
  }

  await ctx.db.patch(userId, {
    averageRating: avgRating,
    avg_rating: avgRating,
    total_ratings: totalRatings,
    positive_percentage: positivePercentage,
    reputationBadge: badge,
  });
}

// Get reputation breakdown details and reviews for trader profile card
export const getTraderProfileStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const ratings = await ctx.db
      .query("tradeRatings")
      .withIndex("by_rated", (q) => q.eq("ratedId", args.userId))
      .filter((q) => q.ne(q.field("isFlagged"), true))
      .collect();

    // Calculate rating counts for 1-5 stars
    const counts = [0, 0, 0, 0, 0, 0]; // index matches star count
    for (const r of ratings) {
      if (r.rating >= 1 && r.rating <= 5) {
        counts[r.rating]++;
      }
    }

    const totalRatings = ratings.length;
    const breakdown = [5, 4, 3, 2, 1].map((stars) => {
      const count = counts[stars];
      const pct = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
      return { stars, count, pct };
    });

    // Get resolved and unresolved disputes counts
    const buyerTrades = await ctx.db
      .query("trades")
      .withIndex("by_buyer", (q) => q.eq("buyerId", args.userId))
      .collect();
    const sellerTrades = await ctx.db
      .query("trades")
      .withIndex("by_seller", (q) => q.eq("sellerId", args.userId))
      .collect();
    const allTrades = [...buyerTrades, ...sellerTrades];
    const tradeIds = new Set(allTrades.map(t => t._id));

    const allDisputes = await ctx.db.query("disputes").collect();
    const userDisputes = allDisputes.filter(d => tradeIds.has(d.tradeId));
    const totalDisputes = userDisputes.length;
    const resolvedDisputes = userDisputes.filter(d => d.status === "resolved").length;

    // Get recent reviews enriched with rater username
    const recentReviews = await Promise.all(
      ratings
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(async (r) => {
          const rater = await ctx.db.get(r.raterId);
          return {
            _id: r._id,
            rating: r.rating,
            comment: r.comment || "",
            raterName: rater?.username || "unknown",
            raterType: r.raterType,
            createdAt: r.createdAt,
          };
        })
    );

    return {
      userId: user._id,
      username: user.username,
      averageRating: user.avg_rating || user.averageRating || 0.0,
      totalRatings: user.total_ratings || 0,
      totalCompletedTrades: user.totalCompletedTrades || user.totalTrades || 0,
      positivePercentage: user.positive_percentage || 0,
      reputationBadge: user.reputationBadge || "none",
      kycApproved: user.kycStatus === "approved",
      totalDisputes,
      resolvedDisputes,
      breakdown,
      recentReviews,
    };
  },
});

// Admin Query: List recent P2P trade ratings and statistics
export const listAllTradeRatings = query({
  args: { adminId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || admin.role !== "admin") {
      return {
        ratings: [],
        totalRatings: 0,
        averagePlatformRating: 5.0,
        todayCount: 0,
      };
    }

    const allRatings = await ctx.db.query("tradeRatings").order("desc").collect();

    // Enrich ratings with usernames
    const enrichedRatings = await Promise.all(
      allRatings.map(async (r) => {
        const rater = await ctx.db.get(r.raterId);
        const rated = await ctx.db.get(r.ratedId);
        return {
          ...r,
          raterUsername: rater?.username || "unknown",
          ratedUsername: rated?.username || "unknown",
        };
      })
    );

    // Calculate Platform Averages
    const totalRatings = allRatings.length;
    const sum = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const averagePlatformRating = totalRatings > 0 ? Math.round((sum / totalRatings) * 10) / 10 : 5.0;

    // Filter ratings given today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayCount = allRatings.filter(
      r => new Date(r.createdAt).getTime() >= startOfToday.getTime()
    ).length;

    return {
      ratings: enrichedRatings,
      totalRatings,
      averagePlatformRating,
      todayCount,
    };
  },
});

// Admin Query: Get given/received ratings history for a user drawer
export const getUserRatingsHistory = query({
  args: { adminId: v.id("users"), targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || admin.role !== "admin") {
      return { received: [], given: [] };
    }

    const received = await ctx.db
      .query("tradeRatings")
      .withIndex("by_rated", (q) => q.eq("ratedId", args.targetUserId))
      .collect();

    const given = await ctx.db
      .query("tradeRatings")
      .withIndex("by_rater", (q) => q.eq("raterId", args.targetUserId))
      .collect();

    const enrichedReceived = await Promise.all(
      received.map(async (r) => {
        const rater = await ctx.db.get(r.raterId);
        return {
          ...r,
          partnerUsername: rater?.username || "unknown",
        };
      })
    );

    const enrichedGiven = await Promise.all(
      given.map(async (r) => {
        const rated = await ctx.db.get(r.ratedId);
        return {
          ...r,
          partnerUsername: rated?.username || "unknown",
        };
      })
    );

    return {
      received: enrichedReceived,
      given: enrichedGiven,
    };
  },
});

// Admin Mutation: Flag a review as fake/abusive
export const flagFakeRating = mutation({
  args: { adminId: v.id("users"), ratingId: v.id("tradeRatings"), flaggedReason: v.string() },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const rating = await ctx.db.get(args.ratingId);
    if (!rating) throw new Error("Rating not found");

    await ctx.db.patch(args.ratingId, {
      isFlagged: true,
      flaggedReason: args.flaggedReason,
    });

    // Recalculate target user ratings since this flagged review will now be skipped
    await recalculateUserStats(ctx, rating.ratedId);

    // Audit Log
    await ctx.db.insert("adminAuditLogs", {
      adminId: args.adminId,
      adminUsername: admin.username,
      action: "flag_fake_rating",
      details: `Flagged rating #${args.ratingId.substring(0, 8)} on user ID: ${rating.ratedId}. Reason: ${args.flaggedReason}`,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Admin Mutation: Delete a review completely
export const deleteTradeRating = mutation({
  args: { adminId: v.id("users"), ratingId: v.id("tradeRatings") },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const rating = await ctx.db.get(args.ratingId);
    if (!rating) throw new Error("Rating not found");

    await ctx.db.delete(args.ratingId);

    // Recalculate user aggregates
    await recalculateUserStats(ctx, rating.ratedId);

    // Audit Log
    await ctx.db.insert("adminAuditLogs", {
      adminId: args.adminId,
      adminUsername: admin.username,
      action: "delete_trade_rating",
      details: `Deleted rating #${args.ratingId.substring(0, 8)} on user ID: ${rating.ratedId}.`,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  },
});
