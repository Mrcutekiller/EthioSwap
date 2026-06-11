import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import bcrypt from "bcryptjs";
import { sha256Sync } from "./utils";

export const signInUser = action({
  args: {
    identifier: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { identifier, password }) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    // Single query: find by email OR username
    const user = await ctx.runQuery(internal.users.findUserByIdentifier, {
      identifier: normalizedIdentifier,
    });

    if (!user) {
      throw new Error("Invalid email/username or password.");
    }

    if (user.isSuspended) {
      throw new Error("This account is suspended. Please contact support.");
    }

    // Compare password (no round-trips — pure computation)
    let passwordMatches = false;

    if (user.passwordHash && user.passwordHash.startsWith("$2")) {
      // bcrypt hash
      passwordMatches = await bcrypt.compare(password, user.passwordHash);
    } else if (user.passwordHash) {
      // sha256 or plaintext legacy
      const inputHash = sha256Sync(password);
      passwordMatches = user.passwordHash === inputHash || user.passwordHash === password;
    }

    if (!passwordMatches) {
      throw new Error("Invalid email/username or password.");
    }

    // Create session (single mutation round-trip)
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.runMutation(internal.sessions.createSession, {
      userId: user._id,
      sessionToken,
      expiresAt,
    });

    const { passwordHash, ...safeUser } = user;
    return { success: true, userId: user._id, sessionToken, user: safeUser };
  },
});
