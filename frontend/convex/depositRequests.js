import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// ── User creates a deposit request ──────────────────────────────
export const create = mutation({
  args: {
    userId: v.string(),
    amountUSD: v.number(),
    walletType: v.string(),
    senderReference: v.string(),
    screenshotUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    const user = userObjId ? await ctx.db.get(userObjId) : null;
    if (!user) throw new ConvexError("User not found");
    if (args.amountUSD < 5) throw new ConvexError("Minimum deposit amount is $5.00 USD");

    // Anti-spam velocity gating: max 3 pending deposits per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const pendingDeposits = await ctx.db
      .query("depositRequests")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const recentPending = pendingDeposits.filter(
      (r) => r.status === "pending" && r.createdAt >= oneHourAgo
    );
    if (recentPending.length >= 3) {
      throw new Error("Velocity limit exceeded: Maximum 3 pending manual deposits allowed per hour. Please wait for an administrator to review your pending requests.");
    }

    const id = await ctx.db.insert("depositRequests", {
      userId: args.userId,
      username: user.username,
      amountUSD: args.amountUSD,
      walletType: args.walletType,
      senderReference: args.senderReference,
      screenshotUrl: args.screenshotUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Notify admin
    const admin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com"))
      .unique();
    if (admin) {
      await ctx.db.insert("notifications", {
        userId: admin._id.toString(),
        type: "deposit_request",
        message: `💵 New deposit request from @${user.username}: $${args.amountUSD.toFixed(2)} USD via ${args.walletType}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return id.toString();
  },
});

// ── Admin: list all pending requests ────────────────────────────
export const listPending = query({
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("depositRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
    return requests.map((r) => {
      const { screenshotUrl, ...rest } = r;
      return { ...rest, id: r._id.toString(), hasScreenshot: !!screenshotUrl };
    });
  },
});

// ── Admin: list all requests (all statuses) ─────────────────────
export const listAll = query({
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("depositRequests")
      .order("desc")
      .collect();
    return requests.map((r) => {
      const { screenshotUrl, ...rest } = r;
      return { ...rest, id: r._id.toString(), hasScreenshot: !!screenshotUrl };
    });
  },
});

// ── User: list own requests ─────────────────────────────────────
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("depositRequests")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return requests.map((r) => {
      const { screenshotUrl, ...rest } = r;
      return { ...rest, id: r._id.toString(), hasScreenshot: !!screenshotUrl };
    });
  },
});

// ── Fetch screenshot on demand ──────────────────────────────────
export const getDepositScreenshot = query({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("depositRequests", args.requestId);
    const req = reqId ? await ctx.db.get(reqId) : null;
    return req ? req.screenshotUrl : null;
  }
});

// ── Admin: approve a deposit request ────────────────────────────
export const approve = mutation({
  args: {
    requestId: v.string(),
    adminId: v.string(),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const reqId = ctx.db.normalizeId("depositRequests", args.requestId);
    const req = reqId ? await ctx.db.get(reqId) : null;
    if (!req) throw new Error("Deposit request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    // Credit user wallet (net) and admin (fee)
    const userObjId = ctx.db.normalizeId("users", req.userId);
    const user = userObjId ? await ctx.db.get(userObjId) : null;
    if (!user) throw new Error("User not found");

    const settings = await ctx.db.query("systemSettings").first();
    const feePercent = settings?.flatFeePercent ?? 1.0;
    const rawFee = req.amountUSD * (feePercent / 100);
    const fee = Math.round(rawFee * 100) / 100;
    const netAmount = Math.round((req.amountUSD - fee) * 100) / 100;

    await ctx.db.patch(user._id, {
      ethBalance: user.ethBalance + req.amountUSD,
    });

    // Credit fee to admin
    const systemAdmin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com"))
      .unique();
    if (systemAdmin) {
      const isBinance = req.walletType && req.walletType.toLowerCase().includes("binance");
      const isBybit = req.walletType && req.walletType.toLowerCase().includes("bybit");
      if (isBinance) {
        await ctx.db.patch(systemAdmin._id, {
          binanceBalance: (systemAdmin.binanceBalance || 0) + fee,
        });
      } else if (isBybit) {
        await ctx.db.patch(systemAdmin._id, {
          bybitBalance: (systemAdmin.bybitBalance || 0) + fee,
        });
      } else {
        await ctx.db.patch(systemAdmin._id, {
          ethBalance: (systemAdmin.ethBalance || 0) + fee,
        });
      }
    }

    // Mark request approved
    await ctx.db.patch(reqId, {
      status: "approved",
      adminNote: args.adminNote,
      reviewedAt: new Date().toISOString(),
    });

    // Log admin action to audit logs
    const adminUser = await ctx.db.get(adminObjId);
    const adminUsername = adminUser ? adminUser.username : "Admin";
    await ctx.db.insert("adminAuditLogs", {
      adminId: args.adminId,
      adminUsername,
      action: "approve_deposit",
      targetId: args.requestId,
      targetName: req.username,
      details: `Approved deposit request of $${req.amountUSD.toFixed(2)} USD via ${req.walletType}. Credited: $${netAmount.toFixed(2)} USD`,
      createdAt: new Date().toISOString(),
    });

    // Log transaction
    await ctx.db.insert("transactions", {
      userId: req.userId,
      type: "deposit",
      amountETH: netAmount,
      amountUSD: netAmount,
      note: `Manual deposit approved via ${req.walletType} — Fee: $${fee.toFixed(2)} USD, Ref: ${req.senderReference}`,
      createdAt: new Date().toISOString(),
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: req.userId,
      type: "deposit_approved",
      message: `✅ Your deposit of $${req.amountUSD.toFixed(2)} USD has been approved. Credited: $${netAmount.toFixed(2)} USD (after ${feePercent}% fee of $${fee.toFixed(2)} USD)`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// ── Admin: reject a deposit request ─────────────────────────────
export const reject = mutation({
  args: {
    requestId: v.string(),
    adminId: v.string(),
    adminNote: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const reqId = ctx.db.normalizeId("depositRequests", args.requestId);
    const req = reqId ? await ctx.db.get(reqId) : null;
    if (!req) throw new Error("Deposit request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    await ctx.db.patch(reqId, {
      status: "rejected",
      adminNote: args.adminNote,
      reviewedAt: new Date().toISOString(),
    });

    // Log admin action to audit logs
    const adminUser = await ctx.db.get(adminObjId);
    const adminUsername = adminUser ? adminUser.username : "Admin";
    await ctx.db.insert("adminAuditLogs", {
      adminId: args.adminId,
      adminUsername,
      action: "reject_deposit",
      targetId: args.requestId,
      targetName: req.username,
      details: `Rejected deposit request of $${req.amountUSD.toFixed(2)} USD. Reason: ${args.adminNote}`,
      createdAt: new Date().toISOString(),
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: req.userId,
      type: "deposit_rejected",
      message: `❌ Your deposit request of $${req.amountUSD.toFixed(2)} USD was not approved. Reason: ${args.adminNote}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const autoApproveOnchain = mutation({
  args: {
    userId: v.string(),
    amountUSD: v.number(),
    senderReference: v.string(),
  },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    const user = userObjId ? await ctx.db.get(userObjId) : null;
    if (!user) throw new ConvexError("User not found");
    if (args.amountUSD < 5) throw new ConvexError("Minimum deposit amount is $5.00 USD");

    // Insert pending deposit request record for admin review (Real Money only, no auto-credit)
    const requestId = await ctx.db.insert("depositRequests", {
      userId: args.userId,
      username: user.username,
      amountUSD: args.amountUSD,
      walletType: "On-Chain (USDT)",
      senderReference: args.senderReference,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Notify admin to review and check their actual TRON wallet
    const admin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com"))
      .unique();
    if (admin) {
      await ctx.db.insert("notifications", {
        userId: admin._id.toString(),
        type: "deposit_request",
        message: `💵 New on-chain deposit request from @${user.username}: $${args.amountUSD.toFixed(2)} USD (TxID: ${args.senderReference})`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return { success: true, id: requestId.toString(), ethBalance: user.ethBalance };
  }
});
