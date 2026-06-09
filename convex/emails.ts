"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";


export const sendNotification = action({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({

        from: "EthioSwap <notifications@ethioswap.qzz.io>",
        to: [args.to],
        subject: args.subject,
        text: args.text,
      });

      if (error) {
        console.error("Resend error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err: any) {
      console.error("Unexpected error sending email:", err);
      return { success: false, error: err.message };
    }
  },
});
