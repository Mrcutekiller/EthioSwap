import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { encryptText, decryptText } from "./utils";

export const listForTrade = query({
  args: { tradeId: v.id("trades"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) return [];

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const isBuyer = user._id === trade.buyerId;
    const isSeller = user._id === trade.sellerId;
    const isAdmin = user.role === "admin";

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new Error("Unauthorized");
    }

    // Admin can view chat of disputed trades only
    if (isAdmin && !isBuyer && !isSeller) {
      if (trade.status !== "disputed") {
        throw new Error("Admin can only view the chat of disputed trades");
      }
    }

    // Chat auto-locks and messages are hidden from both users once trade is completed or cancelled
    if (trade.status === "completed" || trade.status === "cancelled") {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
      .order("asc")
      .collect();

    // Decrypt messages
    return messages.map((m) => {
      let decryptedText = m.messageText;
      if (m.messageType !== "system") {
        try {
          decryptedText = decryptText(m.messageText);
        } catch (e) {
          decryptedText = m.messageText; // fallback
        }
      }
      return {
        ...m,
        messageText: decryptedText,
      };
    });
  },
});

export const send = mutation({
  args: {
    tradeId: v.id("trades"),
    senderId: v.string(),
    senderUsername: v.optional(v.string()),
    messageText: v.string(),
    messageType: v.string(), // "text" | "image" | "system"
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");

    if (trade.status === "completed" || trade.status === "cancelled") {
      throw new Error("Chat is locked because the trade has finished");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const isBuyer = user._id === trade.buyerId;
    const isSeller = user._id === trade.sellerId;
    if (!isBuyer && !isSeller) {
      throw new Error("You are not part of this trade");
    }

    // Encrypt message text if not system message
    let textToStore = args.messageText;
    if (args.messageType !== "system") {
      textToStore = encryptText(args.messageText);
    }

    return await ctx.db.insert("messages", {
      tradeId: args.tradeId,
      senderId: args.senderId,
      senderUsername: args.senderUsername,
      messageText: textToStore,
      messageType: args.messageType,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  },
});

export const markAsRead = mutation({
  args: { tradeId: v.id("trades"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
      .collect();

    for (const msg of messages) {
      if (msg.senderId !== user._id && !msg.isRead) {
        await ctx.db.patch(msg._id, {
          isRead: true,
          readAt: new Date().toISOString(),
        });
      }
    }
    return { success: true };
  },
});

export const deleteOldMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const allMessages = await ctx.db.query("messages").collect();
    let deletedCount = 0;

    for (const msg of allMessages) {
      if (msg.createdAt < cutoffDate) {
        const trade = await ctx.db.get(msg.tradeId);
        if (trade && (trade.status === "completed" || trade.status === "cancelled")) {
          await ctx.db.delete(msg._id);
          deletedCount++;
        }
      }
    }
    return { deletedCount };
  },
});
