import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.error("VITE_CONVEX_URL is not defined. Please check your environment variables.");
}

export const convex = new ConvexReactClient(convexUrl || "https://dummy-url.convex.cloud");
