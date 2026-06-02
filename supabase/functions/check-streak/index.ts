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

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Find users with active streaks who haven't traded today
    const { data: users } = await supabase
      .from("users")
      .select("id, username, current_streak, longest_streak, last_trade_date")
      .gt("current_streak", 0);

    let resetCount = 0;

    for (const user of users || []) {
      if (user.last_trade_date) {
        const lastTradeDate = new Date(user.last_trade_date).toISOString().split("T")[0];
        // If last trade was before yesterday, break the streak
        if (lastTradeDate < yesterday) {
          const newLongest = Math.max(user.longest_streak, user.current_streak);
          await supabase
            .from("users")
            .update({
              current_streak: 0,
              longest_streak: newLongest,
            })
            .eq("id", user.id);

          // Notify user
          await supabase.from("notifications").insert({
            user_id: user.id,
            type: "streak_broken",
            message: `Your ${user.current_streak}-day trading streak has ended. Trade today to start a new streak!`,
          });

          resetCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, resetCount }),
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
