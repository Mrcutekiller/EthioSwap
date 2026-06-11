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

    // Step 1: Find user by email, then by username
    let user = await ctx.runQuery(internal.users.getUserByEmail, {
      email: normalizedIdentifier,
    });

    if (!user) {
      user = await ctx.runQuery(internal.users.getUserByUsername, {
        username: normalizedIdentifier,
      });
    }

    if (!user) {
      console.error("signInUser: No user found for identifier:", normalizedIdentifier);
      throw new Error("Invalid email/username or password.");
    }

    if (user.isSuspended) {
      throw new Error("This account is suspended. Please contact support.");
    }

    // Step 2: Compare password
    let passwordMatches = false;

    // Try bcrypt first (new users)
    if (user.passwordHash && user.passwordHash.startsWith("$2")) {
      passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (passwordMatches) {
        console.log("Password matches via bcrypt");
      }
    }

    // Fall back to sha256 (legacy users)
    if (!passwordMatches && user.passwordHash) {
      const inputHash = sha256Sync(password);
      if (user.passwordHash === inputHash) {
        passwordMatches = true;
        console.log("Password matches via sha256 (legacy) — upgrading to bcrypt");

        // Upgrade to bcrypt in the background
        const newHash = await bcrypt.hash(password, 10);
        await ctx.runMutation(internal.users.updatePasswordHash, {
          userId: user._id,
          passwordHash: newHash,
        });
      }
    }

    // Also check plaintext (very old legacy accounts)
    if (!passwordMatches && user.passwordHash === password) {
      passwordMatches = true;
      console.log("Password matches via plaintext (legacy) — upgrading to bcrypt");

      const newHash = await bcrypt.hash(password, 10);
      await ctx.runMutation(internal.users.updatePasswordHash, {
        userId: user._id,
        passwordHash: newHash,
      });
    }

    if (!passwordMatches) {
      console.error("signInUser: Password does NOT match for user:", user.username);
      throw new Error("Invalid email/username or password.");
    }

    // Step 3: Create session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.runMutation(internal.sessions.createSession, {
      userId: user._id,
      sessionToken,
      expiresAt,
    });

    // Step 4: Return safe user data + session
    const { passwordHash, ...safeUser } = user;

    return {
      success: true,
      userId: user._id,
      sessionToken,
      user: safeUser,
    };
  },
});
