import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    email: v.optional(v.string()),
    fullName: v.optional(v.string()),
    role: v.string(), // "user" | "admin"
    phone: v.optional(v.string()),
    ethAddress: v.string(),
    ethPrivateKey: v.string(), // Encrypted or handled by server
    etbBalance: v.number(),
    ethBalance: v.number(),
    ethLocked: v.number(),
    reputation: v.number(),
    totalTrades: v.number(),
    joinedAt: v.string(),
    kycStatus: v.string(), // "none" | "pending" | "approved" | "rejected"
    paymentAccounts: v.optional(v.array(v.any())),
    isSuspended: v.optional(v.boolean()),
    age: v.optional(v.number()),
    bio: v.optional(v.string()),
    displayName: v.optional(v.string()),
    kycDocument: v.optional(v.any()),
    kycIdBack: v.optional(v.any()),
    kycIdFront: v.optional(v.any()),
    kycRejectionReason: v.optional(v.any()),
    kycSelfie: v.optional(v.any()),
    kycStep: v.optional(v.string()),
    kycData: v.optional(v.any()),
    lastActive: v.optional(v.string()),
    numericId: v.optional(v.number()),
    passwordHash: v.optional(v.string()),
    warnings: v.optional(v.array(v.object({
      id: v.string(),
      message: v.string(),
      createdAt: v.string(),
    }))),
    successfulInvites: v.optional(v.number()),
    totalInviteEarnings: v.optional(v.number()),
  })
  .index("by_username", ["username"])
  .index("by_email", ["email"]),

  listings: defineTable({
    sellerId: v.id("users"),
    amountEth: v.number(),
    minLimitEtb: v.number(),
    maxLimitEtb: v.number(),
    paymentMethods: v.array(v.string()),
    status: v.string(), // "active" | "inactive" | "deleted"
    type: v.string(), // "sell" | "buy"
    customRateEtb: v.optional(v.number()),
    createdAt: v.string(),
  })
  .index("by_seller", ["sellerId"])
  .index("by_status", ["status"]),

  trades: defineTable({
    buyerId: v.id("users"),
    sellerId: v.id("users"),
    listingId: v.id("listings"),
    amountEth: v.number(),
    amountEtb: v.number(),
    status: v.string(), // "payment_pending" | "paid" | "completed" | "cancelled" | "disputed"
    createdAt: v.string(),
    completedAt: v.optional(v.string()),
    feeEth: v.number(),
  })
  .index("by_buyer", ["buyerId"])
  .index("by_seller", ["sellerId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    message: v.optional(v.string()),
    type: v.string(),
    isRead: v.boolean(),
    createdAt: v.string(),
  })
  .index("by_user", ["userId"]),

  systemSettings: defineTable({
    etbRatePerDollar: v.number(),
    etbRatePerDollarSell: v.optional(v.number()),
    flatFeePercent: v.number(),
    maxFeeUSD: v.number(),
    commissionType: v.string(),
    commissionValue: v.number(),
    masterWalletAddress: v.string(),
    masterWalletBalanceETH: v.optional(v.number()),
    collectedFeesETH: v.optional(v.number()),
    inviteEarnStatus: v.optional(v.string()),
    inviteUnlockTarget: v.optional(v.number()),
    currentVerifiedUsers: v.optional(v.number()),
    inviteRewardAmount: v.optional(v.number()),
    p2pCommission: v.optional(v.number()),
    isP2pFreePeriod: v.optional(v.boolean()),
    depositFeePercent: v.optional(v.number()),
    withdrawalFeePercent: v.optional(v.number()),
    minDepositUSD: v.optional(v.number()),
    minWithdrawalUSD: v.optional(v.number()),
    maxDailyWithdrawalUSD: v.optional(v.number()),
    pointsPerTrade: v.optional(v.number()),
    referralBonusPoints: v.optional(v.number()),
    isLeaderboardEnabled: v.optional(v.boolean()),
  }),

  reviews: defineTable({
    userId: v.id("users"),
    username: v.string(),
    rating: v.number(),
    content: v.string(),
    isApproved: v.boolean(),
    createdAt: v.string(),
  })
  .index("by_approved", ["isApproved"]),

  adminAuditLogs: defineTable({
    adminId: v.id("users"),
    adminUsername: v.string(),
    action: v.string(),
    targetId: v.optional(v.string()),
    details: v.string(),
    createdAt: v.string(),
  }),

  supportTickets: defineTable({
    userId: v.id("users"),
    username: v.string(),
    subject: v.string(),
    status: v.string(), // "open" | "closed"
    messages: v.array(v.object({
      senderId: v.string(),
      text: v.string(),
      createdAt: v.string(),
    })),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),

  depositRequests: defineTable({
    userId: v.id("users"),
    amountUsd: v.number(),
    amountEth: v.number(),
    status: v.string(), // "pending" | "approved" | "rejected"
    screenshotUrl: v.optional(v.string()),
    createdAt: v.string(),
    reviewedAt: v.optional(v.string()),
    adminNote: v.optional(v.string()),
  }),

  withdrawRequests: defineTable({
    userId: v.id("users"),
    amountEth: v.number(),
    address: v.string(),
    status: v.string(), // "pending" | "approved" | "rejected"
    createdAt: v.string(),
    reviewedAt: v.optional(v.string()),
    adminNote: v.optional(v.string()),
  }),

  inviteRewards: defineTable({
    referrerId: v.id("users"),
    referredId: v.id("users"),
    rewardAmount: v.number(),
    rewardStatus: v.string(), // "pending" | "paid"
    createdAt: v.string(),
  }),
});
