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

http.route({
  path: "/api/kyc-document",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const docType = url.searchParams.get("type"); // "front" or "selfie"
    const requesterEmail = url.searchParams.get("email");

    if (!requesterEmail || !userId || !docType) {
      return new Response("Unauthorized", { status: 401 });
    }

    const requester = await ctx.runQuery(api.users.getByEmail, { email: requesterEmail });
    if (!requester) {
      return new Response("Forbidden", { status: 403 });
    }

    const isSelf = requester._id === userId;
    const isAdmin = requester.role === "admin";

    if (!isSelf && !isAdmin) {
      return new Response("Forbidden", { status: 403 });
    }

    const user = await ctx.runQuery(api.users.get, { id: userId as any });
    if (!user) return new Response("User not found", { status: 404 });

    const base64Data = docType === "front" ? user.kycIdFront : user.kycSelfie;
    if (!base64Data) return new Response("Document not found", { status: 404 });

    try {
      const parts = base64Data.split(",");
      const contentType = parts[0].split(":")[1].split(";")[0];
      const base64Content = parts[1];
      
      // Decode base64 to binary array
      const binaryString = atob(base64Content);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Response(bytes.buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (e) {
      return new Response("Error decoding file", { status: 500 });
    }
  }),
});

http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      await ctx.runAction(internal.telegram.handleTelegramWebhook, { body });
    } catch (e) {
      console.error("Error in telegram webhook:", e);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
