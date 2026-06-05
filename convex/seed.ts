import { mutation } from "./_generated/server";
import { sha256Sync } from "./utils";

export const seedAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "ethioswap@gmail.com"))
      .first();

    const adminPayload = {
      username: "ethioswap@gmail.com",
      email: "ethioswap@gmail.com",
      passwordHash: sha256Sync("Et20sw26#"),
      fullName: "EthioSwap Admin",
      displayName: "System Admin",
      role: "admin",
      phone: "+251911223344",
      bio: "EthioSwap Official Admin",
      ethAddress: "0x6a6df72d17e32b2384a17125208829fc6a1a5de4",
      ethPrivateKey: "0xaea37e8fcc276a69d7731580e66ebc750e5f8bea03d3d2305f1f31da655af6a3",
      etbBalance: 1000000,
      ethBalance: 100,
      ethLocked: 0,
      reputation: 1000,
      totalTrades: 0,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      kycStatus: "approved",
      kycStep: "approved",
      kycDocument: "",
      kycIdBack: "",
      kycIdFront: "",
      kycSelfie: "",
      kycRejectionReason: "",
      paymentAccounts: [],
      warnings: [],
      isSuspended: false,
      isBanned: false,
    };

    if (existing) {
      await ctx.db.patch(existing._id, adminPayload);
      return { status: "updated", id: existing._id };
    }

    const existingByUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com"))
      .first();
    if (existingByUsername) {
      await ctx.db.patch(existingByUsername._id, adminPayload);
      return { status: "updated_by_username", id: existingByUsername._id };
    }

    const id = await ctx.db.insert("users", adminPayload);
    return { status: "created", id };
  },
});
