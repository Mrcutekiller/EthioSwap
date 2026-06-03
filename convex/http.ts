import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/getStats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const stats = await ctx.runQuery(api.stats.get);
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

http.route({
  path: "/getReviews",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const reviews = await ctx.runQuery(api.reviews.listApproved);
    return new Response(JSON.stringify(reviews), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

export default http;
