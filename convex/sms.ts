import { action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const sendSmsAction = internalAction({
  args: {
    userId: v.id("users"),
    phone: v.string(),
    message: v.string(),
    type: v.string(),
    logId: v.id("notificationLogs"),
  },
  handler: async (ctx, args) => {
    const username = process.env.AT_USERNAME || "sandbox";
    const apiKey = process.env.AT_API_KEY || "your_sandbox_api_key";
    
    const url = username === "sandbox" 
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    const body = new URLSearchParams();
    body.append("username", username);
    body.append("to", args.phone);
    body.append("message", args.message);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey": apiKey,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error(`Africa's Talking API returned status ${response.status}`);
      }

      await ctx.runMutation(internal.sms.updateSmsLogStatus, {
        logId: args.logId,
        status: "delivered",
      });

      return { success: true };
    } catch (error) {
      console.error("SMS sending failed:", error);
      
      await ctx.runMutation(internal.sms.updateSmsLogStatus, {
        logId: args.logId,
        status: "failed",
      });

      // Retry once after 5 minutes (300 seconds)
      await ctx.scheduler.runAfter(300, internal.sms.retrySmsAction, {
        userId: args.userId,
        phone: args.phone,
        message: args.message,
        type: args.type,
        logId: args.logId,
      });

      return { success: false, error: (error as Error).message };
    }
  },
});

export const retrySmsAction = internalAction({
  args: {
    userId: v.id("users"),
    phone: v.string(),
    message: v.string(),
    type: v.string(),
    logId: v.id("notificationLogs"),
  },
  handler: async (ctx, args) => {
    const username = process.env.AT_USERNAME || "sandbox";
    const apiKey = process.env.AT_API_KEY || "your_sandbox_api_key";
    
    const url = username === "sandbox" 
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    const body = new URLSearchParams();
    body.append("username", username);
    body.append("to", args.phone);
    body.append("message", args.message + " (Retry)");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey": apiKey,
        },
        body: body.toString(),
      });

      if (response.ok) {
        await ctx.runMutation(internal.sms.updateSmsLogStatus, {
          logId: args.logId,
          status: "delivered",
        });
      }
    } catch (e) {
      console.error("SMS retry failed:", e);
    }
  },
});

export const updateSmsLogStatus = internalMutation({
  args: {
    logId: v.id("notificationLogs"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, {
      status: args.status,
    });
  },
});

export const createSmsLog = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notificationLogs", {
      userId: args.userId,
      type: args.type,
      channel: "sms",
      message: args.message,
      status: "pending",
      sentAt: new Date().toISOString(),
    });
  },
});
