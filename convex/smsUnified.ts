import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { normalizeEthiopianPhone } from "./phone";

type SmsSendResult = {
  success: boolean;
  provider: "vonage" | "africas_talking" | "mock" | "none";
  normalizedPhone: string;
  error?: string;
  messageId?: string;
};

/**
 * Unified SMS sender.
 *  - Normalizes Ethiopian numbers to E.164 (+2519XXXXXXXX)
 *  - Tries Africa's Talking first (best Ethiopia delivery)
 *  - Falls back to Vonage
 *  - Records a notification log with delivery status
 */
export const sendSmsUnifiedAction = internalAction({
  args: {
    userId: v.id("users"),
    phone: v.string(),
    message: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args): Promise<SmsSendResult> => {
    const normalized = normalizeEthiopianPhone(args.phone);
    if (!normalized.ok) {
      console.warn("SMS send skipped — invalid phone:", args.phone, normalized.error);
      return { success: false, provider: "none", normalizedPhone: args.phone, error: normalized.error };
    }

    const e164 = normalized.e164;

    // Create the delivery log first so we can update it from any provider
    const logId = await ctx.runMutation(internal.sms.createSmsLog, {
      userId: args.userId,
      type: args.type,
      message: args.message,
    });

    // 1) Try Africa's Talking first (better Ethiopia delivery)
    const atKey = process.env.AFRICAS_TALKING_API_KEY;
    const atUser = process.env.AFRICAS_TALKING_USERNAME || "sandbox";
    const atSender = process.env.AFRICAS_TALKING_SENDER_ID || "EthioSwap";

    if (atKey && atKey !== "mock_key") {
      try {
        const response = await fetch("https://api.africastalking.com/version1/messaging", {
          method: "POST",
          headers: {
            "ApiKey": atKey,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
          },
          body: new URLSearchParams({
            username: atUser,
            to: e164,
            message: args.message,
            from: atSender,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const recipients = data?.SMSMessageData?.Recipients || [];
          const status = recipients[0]?.status;
          if (status === "Success") {
            await ctx.runMutation(internal.sms.updateSmsLogStatus, {
              logId,
              status: "delivered",
            });
            return {
              success: true,
              provider: "africas_talking",
              normalizedPhone: e164,
              messageId: recipients[0]?.messageId,
            };
          }
          console.warn("Africa's Talking delivery issue:", status, recipients[0]?.statusCode);
        } else {
          console.warn("Africa's Talking HTTP", response.status, await response.text().catch(() => ""));
        }
      } catch (e) {
        console.error("Africa's Talking send failed:", e);
      }
    }

    // 2) Fall back to Vonage
    const vKey = process.env.VONAGE_API_KEY;
    const vSecret = process.env.VONAGE_API_SECRET;
    const vFrom = process.env.VONAGE_FROM_NUMBER || "EthioSwap";

    if (vKey && vSecret && vKey !== "mock_key" && vSecret !== "mock_secret") {
      try {
        // Use the new api.nexmo.com endpoint with Basic auth
        const auth = "Basic " + Buffer.from(`${vKey}:${vSecret}`).toString("base64");
        const response = await fetch("https://api.nexmo.com/v1/messages", {
          method: "POST",
          headers: {
            "Authorization": auth,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            from: { type: "alphanumeric", alias: vFrom },
            to: { type: "sms", number: e164 },
            message: {
              content: {
                type: "text",
                text: args.message,
              },
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const msgUuid = data?.messages?.[0]?.uuid;
          // v1/messages returns 202 with a UUID; delivery is async
          await ctx.runMutation(internal.sms.updateSmsLogStatus, {
            logId,
            status: "delivered",
          });
          return { success: true, provider: "vonage", normalizedPhone: e164, messageId: msgUuid };
        }

        // If the new API rejects, fall back to the legacy endpoint
        const fallback = await fetch("https://rest.nexmo.com/sms/json", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            api_key: vKey,
            api_secret: vSecret,
            to: e164,
            from: vFrom,
            text: args.message,
          }),
        });
        if (fallback.ok) {
          const data = await fallback.json();
          const m = data?.messages?.[0];
          if (m?.status === "0") {
            await ctx.runMutation(internal.sms.updateSmsLogStatus, {
              logId,
              status: "delivered",
            });
            return { success: true, provider: "vonage", normalizedPhone: e164, messageId: m["message-id"] };
          }
          await ctx.runMutation(internal.sms.updateSmsLogStatus, {
            logId,
            status: "failed",
          });
          return {
            success: false,
            provider: "vonage",
            normalizedPhone: e164,
            error: m?.["error-text"] || "Vonage rejected the message",
          };
        }
      } catch (e) {
        console.error("Vonage send failed:", e);
        await ctx.runMutation(internal.sms.updateSmsLogStatus, { logId, status: "failed" });
        return { success: false, provider: "vonage", normalizedPhone: e164, error: (e as Error).message };
      }
    }

    // 3) No provider configured — log and return
    console.warn("No SMS provider configured. Message:", args.message, "→", e164);
    await ctx.runMutation(internal.sms.updateSmsLogStatus, { logId, status: "failed" });
    return {
      success: false,
      provider: "none",
      normalizedPhone: e164,
      error: "No SMS provider configured on the server.",
    };
  },
});

// Re-export for use by other files
export { normalizeEthiopianPhone };
