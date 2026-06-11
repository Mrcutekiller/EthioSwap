import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const createSessionForUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("sessions", {
      userId: args.userId,
      sessionToken,
      expiresAt,
    });

    return { sessionToken, expiresAt };
  },
});

export const createSession = internalMutation({
  args: {
    userId: v.id("users"),
    sessionToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      sessionToken: args.sessionToken,
      expiresAt: args.expiresAt,
    });
    return sessionId;
  },
});

export const getSessionByToken = internalQuery({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    return { session, user: safeUser };
  },
});

export const deleteSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
    return { success: true };
  },
});

export const deleteSessionsForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
  },
});
