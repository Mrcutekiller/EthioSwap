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
    const apiKey = process.env.VONAGE_API_KEY || "mock_key";
    const apiSecret = process.env.VONAGE_API_SECRET || "mock_secret";
    const from = process.env.VONAGE_FROM_NUMBER || "EthioSwap";

    if (apiKey === "mock_key" || apiSecret === "mock_secret") {
      console.warn("VONAGE_API_KEY not set. Mock SMS delivery to", args.phone, ":", args.message);
      await ctx.runMutation(internal.sms.updateSmsLogStatus, {
        logId: args.logId,
        status: "delivered",
      });
      return { success: true };
    }

    try {
      const response = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          api_key: apiKey,
          api_secret: apiSecret,
          to: args.phone,
          from,
          text: args.message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Vonage API returned status ${response.status}`);
      }

      const result = await response.json();
      const status = result.messages?.[0]?.status === "0" ? "delivered" : "failed";

      await ctx.runMutation(internal.sms.updateSmsLogStatus, {
        logId: args.logId,
        status,
      });

      if (status === "failed") {
        throw new Error(result.messages?.[0]?.["error-text"] || "Vonage delivery failed");
      }

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
    const apiKey = process.env.VONAGE_API_KEY || "mock_key";
    const apiSecret = process.env.VONAGE_API_SECRET || "mock_secret";
    const from = process.env.VONAGE_FROM_NUMBER || "EthioSwap";

    if (apiKey === "mock_key" || apiSecret === "mock_secret") {
      console.warn("Mock SMS retry to", args.phone, ":", args.message);
      return;
    }

    try {
      const response = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          api_key: apiKey,
          api_secret: apiSecret,
          to: args.phone,
          from,
          text: args.message + " (Retry)",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const status = result.messages?.[0]?.status === "0" ? "delivered" : "failed";
        await ctx.runMutation(internal.sms.updateSmsLogStatus, {
          logId: args.logId,
          status,
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
