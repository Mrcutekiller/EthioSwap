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

    // Fetch current USDT/ETB rate from CoinGecko
    const rateRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=etb"
    );
    const rateData = await rateRes.json();
    const currentRate = rateData?.tether?.etb;

    if (!currentRate) {
      return new Response(JSON.stringify({ error: "Failed to fetch rate" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check all active alerts
    const { data: alerts } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("is_active", true)
      .eq("is_triggered", false);

    const triggeredAlerts = [];

    for (const alert of alerts || []) {
      let shouldTrigger = false;
      if (alert.condition === "above" && currentRate >= alert.target_price) {
        shouldTrigger = true;
      } else if (alert.condition === "below" && currentRate <= alert.target_price) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        // Mark as triggered
        await supabase
          .from("price_alerts")
          .update({ is_triggered: true, triggered_at: new Date().toISOString() })
          .eq("id", alert.id);

        // Create notification
        await supabase.from("notifications").insert({
          user_id: alert.user_id,
          type: "price_alert",
          message: `📈 Price Alert! USDT is now ${currentRate} ETB. Your target was ${alert.condition} ${alert.target_price} ETB.`,
        });

        triggeredAlerts.push(alert.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        currentRate,
        checkedAlerts: alerts?.length || 0,
        triggered: triggeredAlerts.length,
      }),
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
