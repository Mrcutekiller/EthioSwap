import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("supportTickets").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("supportTickets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    username: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("supportTickets", {
      userId: args.userId,
      username: args.username,
      subject: args.subject,
      status: "open",
      messages: [{
        senderId: args.userId,
        text: args.message,
        createdAt: now,
      }],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const reply = mutation({
  args: {
    id: v.id("supportTickets"),
    senderId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.id);
    if (!ticket) throw new Error("Ticket not found");

    const now = new Date().toISOString();
    await ctx.db.patch(args.id, {
      messages: [
        ...ticket.messages,
        {
          senderId: args.senderId,
          text: args.text,
          createdAt: now,
        },
      ],
      updatedAt: now,
    });
  },
});

export const close = mutation({
  args: { id: v.id("supportTickets") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "closed", updatedAt: new Date().toISOString() });
  },
});
