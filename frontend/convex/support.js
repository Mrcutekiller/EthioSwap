import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  handler: async (ctx) => {
    const tickets = await ctx.db.query("supportTickets").collect();
    return tickets.map(t => ({ ...t, id: t._id.toString() }));
  }
});

export const getUserTicket = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tickets = await ctx.db.query("supportTickets").collect();
    const ticket = tickets.find(t => t.userId === args.userId);
    return ticket ? { ...ticket, id: ticket._id.toString() } : null;
  }
});

export const createOrGetTicket = mutation({
  args: { userId: v.string(), username: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("supportTickets").collect();
    const found = existing.find(t => t.userId === args.userId && t.status === "open");
    if (found) return found._id.toString();

    const id = await ctx.db.insert("supportTickets", {
      userId: args.userId,
      username: args.username,
      status: "open",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return id.toString();
  }
});

export const addMessage = mutation({
  args: {
    ticketId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("supportTickets", args.ticketId);
    const ticket = id ? await ctx.db.get(id) : null;
    if (!ticket) throw new Error("Ticket not found");

    await ctx.db.patch(id, {
      messages: [...ticket.messages, {
        senderId: args.senderId,
        senderName: args.senderName,
        message: args.message,
        timestamp: new Date().toISOString(),
      }],
      updatedAt: new Date().toISOString(),
    });
  }
});

export const replyTicket = mutation({
  args: {
    ticketId: v.string(),
    adminId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("supportTickets", args.ticketId);
    const ticket = id ? await ctx.db.get(id) : null;
    if (!ticket) throw new Error("Ticket not found");

    await ctx.db.patch(id, {
      messages: [...ticket.messages, {
        senderId: args.adminId,
        senderName: "EthioSwap Support",
        message: args.message,
        timestamp: new Date().toISOString(),
      }],
      updatedAt: new Date().toISOString(),
    });

    // Notify the user
    await ctx.db.insert("notifications", {
      userId: ticket.userId,
      type: "support_reply",
      message: `Support replied: "${args.message.substring(0, 80)}..."`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
});

export const closeTicket = mutation({
  args: { ticketId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("supportTickets", args.ticketId);
    if (id) await ctx.db.patch(id, { status: "closed", updatedAt: new Date().toISOString() });
  }
});
