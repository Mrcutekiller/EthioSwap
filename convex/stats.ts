import { query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const traders = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("kycStatus"), "approved"))
      .collect();
    
    const completedTrades = await ctx.db
      .query("trades")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const approvedReviews = await ctx.db
      .query("reviews")
      .filter((q) => q.eq(q.field("isApproved"), true))
      .collect();

    const volume = completedTrades.reduce((acc, t) => acc + (t.amountEth * 3000), 0); // Assuming 3000 USD/ETH
    const avgRating = approvedReviews.length 
      ? approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length 
      : 0;

    return {
      traders: traders.length,
      volume: Math.round(volume),
      avg: avgRating.toFixed(1),
      scams: 0, // Placeholder
    };
  },
});
