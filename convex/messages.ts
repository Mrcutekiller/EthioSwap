import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForTrade = query({
  args: { tradeId: v.id("trades") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
      .order("asc")
      .collect();
  },
});

export const send = mutation({
  args: {
    tradeId: v.id("trades"),
    senderId: v.string(),
    senderUsername: v.optional(v.string()),
    messageText: v.string(),
    messageType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      tradeId: args.tradeId,
      senderId: args.senderId,
      senderUsername: args.senderUsername,
      messageText: args.messageText,
      messageType: args.messageType,
      createdAt: new Date().toISOString(),
    });
  },
});
