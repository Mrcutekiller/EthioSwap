import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BADGE_THRESHOLDS = {
  elite: { trades: 100, rating: 4.9 },
  top_rated: { trades: 50, rating: 4.8 },
  trusted: { trades: 20, rating: 4.0 },
  new_trader: { trades: 1, rating: 0 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all users
    const { data: users } = await supabase
      .from("users")
      .select("id, username, total_trades_completed, avg_rating, badge_level");

    let upgradedCount = 0;

    for (const user of users || []) {
      let newBadge = "none";

      for (const [badge, thresholds] of Object.entries(BADGE_THRESHOLDS)) {
        if (
          user.total_trades_completed >= thresholds.trades &&
          user.avg_rating >= thresholds.rating
        ) {
          newBadge = badge;
          break;
        }
      }

      if (newBadge !== user.badge_level && newBadge !== "none") {
        await supabase
          .from("users")
          .update({ badge_level: newBadge })
          .eq("id", user.id);

        // Notify user of upgrade
        const badgeNames = {
          elite: "💎 Elite",
          top_rated: "🏆 Top Rated",
          trusted: "👍 Trusted",
          new_trader: "⭐ New Trader",
        };

        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "badge_upgrade",
          message: `🎉 Congratulations! You've been upgraded to ${badgeNames[newBadge]} status!`,
        });

        upgradedCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, upgradedCount }),
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
