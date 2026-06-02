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

    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    // Get all trades from last month
    const startOfMonth = new Date(lastMonthYear, lastMonth - 1, 1).toISOString();
    const endOfMonth = new Date(lastMonthYear, lastMonth, 0, 23, 59, 59).toISOString();

    const { data: trades } = await supabase
      .from("trades")
      .select("buyer_id, seller_id, amount_eth")
      .eq("status", "completed")
      .gte("completed_at", startOfMonth)
      .lte("completed_at", endOfMonth);

    // Calculate volume per user
    const userVolumes = {};
    for (const trade of trades || []) {
      if (!userVolumes[trade.buyer_id]) userVolumes[trade.buyer_id] = { volume: 0, trades: 0 };
      if (!userVolumes[trade.seller_id]) userVolumes[trade.seller_id] = { volume: 0, trades: 0 };
      userVolumes[trade.buyer_id].volume += trade.amount_eth;
      userVolumes[trade.buyer_id].trades += 1;
      userVolumes[trade.seller_id].volume += trade.amount_eth;
      userVolumes[trade.seller_id].trades += 1;
    }

    // Get ratings for each user
    const leaderboard = [];
    for (const [userId, stats] of Object.entries(userVolumes)) {
      const { data: user } = await supabase
        .from("users")
        .select("username, avg_rating")
        .eq("id", userId)
        .single();

      const points = Math.round(stats.volume * 10 + stats.trades * 5);

      leaderboard.push({
        user_id: userId,
        month: lastMonth,
        year: lastMonthYear,
        total_volume: stats.volume,
        total_trades: stats.trades,
        avg_rating: user?.avg_rating || 0,
        points,
      });
    }

    // Sort by points and assign ranks
    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Save leaderboard
    if (leaderboard.length > 0) {
      await supabase.from("leaderboard_monthly").insert(leaderboard);
    }

    // Notify top 3
    const top3 = leaderboard.slice(0, 3);
    const medals = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
    for (let i = 0; i < top3.length; i++) {
      await supabase.from("notifications").insert({
        user_id: top3[i].user_id,
        type: "leaderboard",
        message: `🏆 Congratulations! You placed ${medals[i]} in last month's leaderboard with ${top3[i].points} points!`,
      });
    }

    // Update system settings reset date
    await supabase
      .from("system_settings")
      .update({ leaderboard_reset_date: now.toISOString() })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    return new Response(
      JSON.stringify({ success: true, participants: leaderboard.length, top3: top3.map(t => t.user_id) }),
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
