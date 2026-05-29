import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    return notifs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50)
      .map(n => ({ ...n, id: n._id.toString() }));
  }
});

export const markRead = mutation({
  args: { userId: v.string(), notifId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const n of notifs) {
      if (!args.notifId || n._id.toString() === args.notifId) {
        await ctx.db.patch(n._id, { isRead: true });
      }
    }
  }
});
