import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// --- GET /settings ---
http.route({
  path: "/settings",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const settings = await ctx.runQuery(api.settings.get);
    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/settings",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

// --- GET /trades ---
http.route({
  path: "/trades",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const trades = await ctx.runQuery(api.trades.getRecentCompleted);
    return new Response(JSON.stringify(trades), {
      status: 200,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/trades",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

// --- GET /listings ---
http.route({
  path: "/listings",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const listings = await ctx.runQuery(api.listings.listAll);
    return new Response(JSON.stringify(listings), {
      status: 200,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/listings",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

export default http;
