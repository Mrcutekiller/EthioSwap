import { query, mutation, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const get = query({
  args: { id: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.id) return null;
    return await ctx.db.get(args.id);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const create = mutation({
  args: {
    username: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    password: v.string(),
    fullName: v.optional(v.union(v.string(), v.null())),
    role: v.string(),
    phone: v.optional(v.union(v.string(), v.null())),
    ethAddress: v.string(),
    ethPrivateKey: v.string(),
    age: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    if (args.email) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
      if (existing) throw new Error("Email already registered");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (existingUser) throw new Error("Username already taken");

    const { password, ...userData } = args;

    const userId = await ctx.db.insert("users", {
      ...userData,
      passwordHash: password, // In production, hash this!
      etbBalance: 0,
      ethBalance: 0,
      ethLocked: 0,
      reputation: 100,
      totalTrades: 0,
      joinedAt: new Date().toISOString(),
      kycStatus: "none",
      paymentAccounts: [],
      isSuspended: false,
    });

    // Welcome Notification
    await ctx.db.insert("notifications", {
      userId,
      type: "welcome",
      title: "Welcome to EthioSwap! 🇪🇹",
      message: "We're thrilled to have you! Complete your ID verification to unlock all trading features and start swapping.",
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // Send Welcome Email via Action
    if (args.email) {
      await ctx.scheduler.runAfter(0, internal.users.sendWelcomeEmailAction, {
        email: args.email,
        username: args.username,
      });
    }

    return userId;
  },
});

export const sendWelcomeEmailAction = action({
  args: { email: v.string(), username: v.string() },
  handler: async (ctx, args) => {
    await ctx.runAction(internal.emails.sendNotification, {
      to: args.email,
      subject: "Welcome to EthioSwap! 🇪🇹",
      text: `Hi ${args.username},\n\nWelcome to EthioSwap! We're thrilled to have you join our community.\n\nEthioSwap is Ethiopia's most trusted P2P platform for digital asset exchange. To get started, please complete your Identity Verification (KYC) in your profile settings.\n\nIf you have any questions, our support team is always here to help.\n\nHappy Trading!\nThe EthioSwap Team`,
    });
  },
});

export const authenticate = query({
  args: {
    identifier: v.string(), // username or email
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Try by email index first
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.identifier))
      .first();

    // Fall back to username index (handles admins whose email field is missing
    // but their username IS the email address)
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.identifier))
        .first();
    }

    if (!user) return null;
    if (user.passwordHash !== args.password) return null;

    // Don't return the password hash to the client
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const listKycQueue = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) =>
        q.or(q.eq(q.field("kycStatus"), "pending"), q.eq(q.field("kycStatus"), "submitted"))
      )
      .order("desc")
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("users"),
    isSuspended: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isSuspended: args.isSuspended });
  },
});

export const updateKycStatus = mutation({
  args: {
    id: v.id("users"),
    status: v.string(),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      kycStatus: args.status,
      kycRejectionReason: args.rejectionReason,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.updates);
  },
});

export const addWarning = mutation({
  args: {
    id: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) return;
    const warnings = user.warnings || [];
    await ctx.db.patch(args.id, {
      warnings: [
        ...warnings,
        {
          id: Math.random().toString(36).substring(2, 9),
          message: args.message,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  },
});

export const updateBalances = mutation({
  args: {
    userId: v.id("users"),
    ethChange: v.optional(v.number()),
    ethLockedChange: v.optional(v.number()),
    etbChange: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const newEthBalance = (user.ethBalance || 0) + (args.ethChange || 0);
    const newEthLocked = (user.ethLocked || 0) + (args.ethLockedChange || 0);
    const newEtbBalance = (user.etbBalance || 0) + (args.etbChange || 0);

    if (newEthBalance < 0) throw new Error("Insufficient ETH balance");
    if (newEthLocked < 0) throw new Error("Insufficient locked ETH");
    if (newEtbBalance < 0) throw new Error("Insufficient ETB balance");

    await ctx.db.patch(args.userId, {
      ethBalance: newEthBalance,
      ethLocked: newEthLocked,
      etbBalance: newEtbBalance,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getByIdentifier = query({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.identifier))
      .first();
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.identifier))
        .first();
    }
    return user ? { exists: true } : { exists: false };
  },
});

