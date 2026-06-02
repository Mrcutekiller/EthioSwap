import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get system settings for timeout
    const { data: settings } = await supabase
      .from("system_settings")
      .select("escrow_seller_confirm_timeout_mins, auto_escalate_to_dispute")
      .limit(1)
      .single();

    const timeoutMins = settings?.escrow_seller_confirm_timeout_mins || 120;
    const autoEscalate = settings?.auto_escalate_to_dispute !== false;

    // Find trades in 'paid' status (waiting for seller confirmation)
    const { data: pendingTrades } = await supabase
      .from("trades")
      .select("*, seller:users!seller_id(id, username)")
      .eq("status", "paid");

    let reminderCount = 0;
    let escalatedCount = 0;

    for (const trade of pendingTrades || []) {
      const createdAt = new Date(trade.created_at).getTime();
      const now = Date.now();
      const elapsedMins = (now - createdAt) / 60000;

      // Send reminder at 30 minutes
      if (elapsedMins >= 30 && elapsedMins < 31) {
        await supabase.from("notifications").insert({
          user_id: trade.seller_id,
          type: "escrow_reminder",
          message: `⏰ Reminder: Buyer has sent payment for trade #${trade.id.substring(0, 8)}. Please confirm receipt to release USDT.`,
        });
        reminderCount++;
      }

      // Auto-escalate after timeout
      if (elapsedMins >= timeoutMins && autoEscalate) {
        // Check if already disputed
        const { data: existingDispute } = await supabase
          .from("disputes")
          .select("id")
          .eq("trade_id", trade.id)
          .limit(1);

        if (!existingDispute || existingDispute.length === 0) {
          // Create dispute
          await supabase.from("disputes").insert({
            trade_id: trade.id,
            opened_by: trade.buyer_id,
            against_user: trade.seller_id,
            reason: "Seller did not respond within timeout period",
            status: "open",
          });

          await supabase.from("trades").update({ status: "disputed" }).eq("id", trade.id);
          await supabase.from("escrow_accounts").update({ status: "disputed" }).eq("trade_id", trade.id);

          // Notify both parties
          await supabase.from("notifications").insert([
            {
              user_id: trade.buyer_id,
              type: "dispute_opened",
              message: `A dispute has been automatically opened for trade #${trade.id.substring(0, 8)}. Admin will review.`,
            },
            {
              user_id: trade.seller_id,
              type: "dispute_opened",
              message: `Trade #${trade.id.substring(0, 8)} has been escalated to a dispute due to no response. Please respond.`,
            },
          ]);

          escalatedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminderCount, escalatedCount }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
