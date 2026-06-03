import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("adminAuditLogs").order("desc").collect();
  },
});

export const insert = mutation({
  args: {
    adminId: v.id("users"),
    adminUsername: v.string(),
    action: v.string(),
    targetId: v.optional(v.string()),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("adminAuditLogs", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});
