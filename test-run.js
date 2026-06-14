import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexClient("https://tangible-nightingale-795.convex.cloud");

async function main() {
  try {
    console.log("Trying to authenticate linktest1@example.com with wrong password...");
    const res = await client.query(api.users.authenticate, {
      email: "linktest1@example.com",
      password: "wrong-password",
      deviceFingerprint: "test-device"
    });
    console.log("Result (wrong password):", res);
  } catch (err) {
    console.error("Failure! Error:", err);
  }

  try {
    console.log("Trying to authenticate non-existent user...");
    const res = await client.query(api.users.authenticate, {
      email: "nonexistent@example.com",
      password: "wrong-password",
      deviceFingerprint: "test-device"
    });
    console.log("Result (non-existent):", res);
  } catch (err) {
    console.error("Failure! Error:", err);
  }
}

main();
