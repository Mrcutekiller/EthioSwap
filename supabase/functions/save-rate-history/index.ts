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

    // Fetch current USDT/ETB rate
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

    // Save rate history
    const { error } = await supabase.from("rate_history").insert({
      usdt_etb_rate: currentRate,
      source: "coingecko",
    });

    if (error) throw error;

    // Clean up old records (keep 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("rate_history").delete().lt("recorded_at", ninetyDaysAgo);

    return new Response(
      JSON.stringify({ success: true, rate: currentRate }),
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
