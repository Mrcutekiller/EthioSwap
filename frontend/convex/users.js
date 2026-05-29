import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper to generate realistic mock Ethereum credentials
function generateMockEthCredentials() {
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);
  const ethPrivateKey = "0x" + Array.from(privateKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const addressBytes = new Uint8Array(20);
  crypto.getRandomValues(addressBytes);
  const ethAddress = "0x" + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return { ethAddress, ethPrivateKey };
}

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // If it's a legacy usr_admin string
    if (args.id === "usr_admin") {
      const admin = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com")).unique();
      if (admin) {
        return {
          ...admin,
          ethAvailable: admin.ethBalance - (admin.ethLocked || 0)
        };
      }
      return admin;
    }
    let user = null;
    try {
      const id = ctx.db.normalizeId("users", args.id);
      if (id) {
        user = await ctx.db.get(id);
      }
    } catch {}
    
    if (!user) {
      // Fallback: search by id string
      const all = await ctx.db.query("users").collect();
      user = all.find(u => u._id.toString() === args.id || u.username === args.id) || null;
    }

    if (user) {
      return {
        ...user,
        ethAvailable: user.ethBalance - (user.ethLocked || 0)
      };
    }
    return null;
  }
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username.toLowerCase()))
      .unique();
  }
});

export const listAll = query({
  handler: async (ctx) => {
    const list = await ctx.db.query("users").collect();
    return list.map(u => ({
      _id: u._id,
      username: u.username,
      role: u.role,
      kycStatus: u.kycStatus,
      kycStep: u.kycStep,
      phone: u.phone,
      email: u.email,
      fullName: u.fullName,
      ethBalance: u.ethBalance,
      ethLocked: u.ethLocked,
      joinedAt: u.joinedAt,
      lastActive: u.lastActive,
      paymentAccounts: u.paymentAccounts,
      isSuspended: u.isSuspended,
      warnings: u.warnings,
    }));
  }
});

export const register = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    fullName: v.optional(v.string()),
    age: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username.toLowerCase()))
      .unique();
    if (existing) {
      throw new Error("Username is already taken");
    }

    const { ethAddress, ethPrivateKey } = generateMockEthCredentials();

    const newUser = {
      username: args.username.toLowerCase(),
      passwordHash: args.password, // Plain for simulation
      role: args.username.toLowerCase() === "admin@ethioswap.com" || args.username.toLowerCase() === "admin" || args.username.toLowerCase() === "ethioswap@gmail.com" ? "admin" : "user",
      kycStatus: "none",
      kycStep: "none",
      kycIdFront: null,
      kycIdBack: null,
      kycSelfie: null,
      kycDocument: null,
      kycRejectionReason: null,
      phone: args.phone,
      email: args.email,
      fullName: args.fullName,
      age: args.age,
      ethAddress,
      ethPrivateKey,
      ethBalance: 0.0,
      ethLocked: 0.0,
      etbBalance: 0.0,
      displayName: args.fullName || args.username,
      bio: "",
      reputation: 100,
      totalTrades: 0,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    const id = await ctx.db.insert("users", newUser);
    
    // Add welcome notification
    await ctx.db.insert("notifications", {
      userId: id.toString(),
      type: "welcome",
      message: "Welcome to EthioSwap! Complete your KYC verification to start trading.",
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { id: id.toString(), ...newUser };
  }
});

export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const adminEmail = "ethioswap@gmail.com";
    const adminPassword = "Et20sw26#";
    
    let user = await ctx.db.query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username.toLowerCase()))
      .unique();
    
    if (!user) {
      // Allow logging in via email as well
      const allUsers = await ctx.db.query("users").collect();
      user = allUsers.find(u => u.email?.toLowerCase() === args.username.toLowerCase()) || null;
    }
    
    // Special handling for the specified admin credentials
    if (args.username.toLowerCase() === adminEmail && args.password === adminPassword) {
      if (!user) {
        // Auto-create the admin if it doesn't exist yet
        const { ethAddress, ethPrivateKey } = generateMockEthCredentials();
        const id = await ctx.db.insert("users", {
          username: adminEmail,
          passwordHash: adminPassword,
          role: "admin",
          kycStatus: "approved",
          kycStep: "approved",
          kycIdFront: null,
          kycIdBack: null,
          kycSelfie: null,
          kycDocument: null,
          kycRejectionReason: null,
          phone: "+251000000000",
          ethAddress,
          ethPrivateKey,
          ethBalance: 100.0,
          ethLocked: 0.0,
          etbBalance: 1000000.0,
          displayName: "System Admin",
          bio: "EthioSwap Official Admin",
          reputation: 1000,
          totalTrades: 0,
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        });
        user = await ctx.db.get(id);
      } else if (user.role !== "admin") {
        // Ensure the role is admin if the credentials match
        await ctx.db.patch(user._id, { role: "admin", kycStatus: "approved", kycStep: "approved" });
        user = await ctx.db.get(user._id);
      }
    }

    if (!user || user.passwordHash !== args.password) {
      throw new Error("Invalid username or password");
    }

    const lastActive = new Date().toISOString();
    await ctx.db.patch(user._id, { lastActive });

    return { id: user._id.toString(), ...user, lastActive };
  }
});

export const getStats = query({
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const totalUsers = allUsers.length;
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    const newThisWeek = allUsers.filter(u => new Date(u.joinedAt) >= oneWeekAgo).length;
    const newThisMonth = allUsers.filter(u => new Date(u.joinedAt) >= oneMonthAgo).length;
    
    return {
      totalUsers,
      newThisWeek,
      newThisMonth
    };
  }
});

export const updateKycInfo = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    phone: v.string(),
    age: v.string(),
    address: v.string(),
    idType: v.string(),
  },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(userObjId, {
      kycStep: "info_submitted",
      kycData: {
        name: args.name,
        phone: args.phone,
        age: args.age,
        address: args.address,
        idType: args.idType,
      }
    });

    return { kycStep: "info_submitted", kycData: { name: args.name, phone: args.phone, age: args.age, address: args.address, idType: args.idType } };
  }
});

export const updateKycDocs = mutation({
  args: {
    userId: v.string(),
    idFront: v.string(),
    idBack: v.string(),
  },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(userObjId, {
      kycIdFront: args.idFront,
      kycIdBack: args.idBack,
      kycStep: "id_uploaded",
    });

    return { kycStep: "id_uploaded" };
  }
});

export const updateKycSelfie = mutation({
  args: {
    userId: v.string(),
    selfie: v.string(),
  },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(userObjId, {
      kycSelfie: args.selfie,
      kycStep: "pending",
      kycStatus: "pending",
    });

    // Add user notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "kyc_submitted",
      message: "Your KYC documents are under admin review. We will notify you within 24 hours.",
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // Notify admin
    const admin = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com")).unique();
    if (admin) {
      await ctx.db.insert("notifications", {
        userId: admin._id.toString(),
        type: "kyc_submission",
        message: `New KYC submission from @${user.username}. Review ID and selfie in admin panel.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return { kycStep: "pending", kycStatus: "pending" };
  }
});

export const kycAction = mutation({
  args: {
    adminId: v.string(),
    userId: v.string(),
    approve: v.boolean(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const adminObjId = ctx.db.normalizeId("users", args.adminId);
    const admin = adminObjId ? await ctx.db.get(adminObjId) : null;
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized admin action");
    }

    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    const status = args.approve ? "approved" : "rejected";
    const step = args.approve ? "approved" : "rejected";

    await ctx.db.patch(userObjId, {
      kycStatus: status,
      kycStep: step,
      kycRejectionReason: args.approve ? null : args.reason,
    });

    // Add user notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.approve ? "kyc_approved" : "kyc_rejected",
      message: args.approve
        ? "✓ Congratulations! Your identity verification has been approved. You can now buy and sell USD."
        : `⚠ KYC Rejected: ${args.reason}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { message: `KYC ${status} successfully.` };
  }
});

export const faucetDeposit = mutation({
  args: {
    userId: v.string(),
    amountETH: v.number(),
  },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    const user = userObjId ? await ctx.db.get(userObjId) : null;
    if (!user) throw new Error("User not found");

    const newBalance = user.ethBalance + args.amountETH;
    await ctx.db.patch(user._id, { ethBalance: newBalance });

    const ethUsdPrice = 1;
    const amountUSD = args.amountETH * ethUsdPrice;

    // Transaction
    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "deposit",
      amountETH: args.amountETH,
      amountUSD,
      note: `Faucet Deposit of $${args.amountETH.toFixed(2)} USD`,
      createdAt: new Date().toISOString(),
    });

    // Notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "deposit",
      message: `Your deposit of $${args.amountETH.toFixed(2)} USD has been confirmed.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { id: user._id.toString(), ethBalance: newBalance };
  }
});

export const withdrawETH = mutation({
  args: {
    userId: v.string(),
    amountETH: v.number(),
    destinationAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    const user = userObjId ? await ctx.db.get(userObjId) : null;
    if (!user) throw new Error("User not found");

    if (args.amountETH < 10) {
      throw new Error("Minimum withdrawal amount is $10.00 USD");
    }

    if (user.ethBalance < args.amountETH) {
      throw new Error("Insufficient USD balance");
    }

    const fee = args.amountETH * 0.01;
    const netAmount = args.amountETH - fee;

    const newBalance = user.ethBalance - args.amountETH;
    await ctx.db.patch(user._id, { ethBalance: newBalance });

    // Credit fee to admin
    const admin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "ethioswap@gmail.com"))
      .unique();
    if (admin) {
      await ctx.db.patch(admin._id, {
        ethBalance: admin.ethBalance + fee,
      });
    }

    const ethUsdPrice = 1;
    const amountUSD = args.amountETH * ethUsdPrice;

    // Transaction
    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "withdrawal",
      amountETH: args.amountETH,
      amountUSD,
      note: `Withdrawal of $${args.amountETH.toFixed(2)} USD to ${args.destinationAddress.substring(0, 8)}... — Fee: $${fee.toFixed(2)} USD, Net Sent: $${netAmount.toFixed(2)} USD`,
      createdAt: new Date().toISOString(),
    });

    // Notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "withdrawal",
      message: `Successfully withdrew $${args.amountETH.toFixed(2)} USD (Net sent: $${netAmount.toFixed(2)} USD, 1% fee: $${fee.toFixed(2)} USD) to ${args.destinationAddress.substring(0, 8)}...`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // Mock Tx Hash
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
    const txHash = "0x" + randomHex;

    return { id: user._id.toString(), ethBalance: newBalance, txHash };
  }
});

export const savePaymentAccounts = mutation({
  args: {
    userId: v.string(),
    accounts: v.array(v.object({
      id: v.string(),
      bankName: v.string(),
      accountNumber: v.string(),
      holderName: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(userObjId, {
      paymentAccounts: args.accounts,
    });

    const updatedUser = await ctx.db.get(userObjId);
    return {
      ...updatedUser,
      id: updatedUser._id.toString(),
      ethAvailable: updatedUser.ethBalance - (updatedUser.ethLocked || 0),
    };
  }
});

export const acknowledgeWarning = mutation({
  args: { userId: v.string(), warningId: v.string() },
  handler: async (ctx, args) => {
    const userObjId = ctx.db.normalizeId("users", args.userId);
    if (!userObjId) throw new Error("Invalid user ID");
    const user = await ctx.db.get(userObjId);
    if (!user) throw new Error("User not found");

    const currentWarnings = user.warnings || [];
    const updatedWarnings = currentWarnings.filter(w => w.id !== args.warningId);

    await ctx.db.patch(userObjId, { warnings: updatedWarnings });

    const updatedUser = await ctx.db.get(userObjId);
    return {
      ...updatedUser,
      id: updatedUser._id.toString(),
      ethAvailable: updatedUser.ethBalance - (updatedUser.ethLocked || 0),
    };
  }
});
