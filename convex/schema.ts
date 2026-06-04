import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    fullName: v.optional(v.string()),
    username: v.string(),
    email: v.string(),
    role: v.optional(v.string()),          // "user" | "admin"
    kycStatus: v.optional(v.string()),     // "none" | "pending" | "approved" | "rejected"
    kycRejectionReason: v.optional(v.string()),
    kycIdImage: v.optional(v.string()),    // file URL
    kycSelfie: v.optional(v.string()),     // file URL
    balanceUsd: v.optional(v.number()),
    balanceEscrow: v.optional(v.number()),
    tradeCount: v.optional(v.number()),
    isBanned: v.optional(v.boolean()),
    isSuspended: v.optional(v.boolean()),
    successfulInvites: v.optional(v.number()),
    totalTrades: v.optional(v.number()),
    
    // Auth legacy compatibility
    passwordHash: v.optional(v.string()),
    ethAddress: v.optional(v.string()),
    ethPrivateKey: v.optional(v.string()),
    etbBalance: v.optional(v.number()),
    ethBalance: v.optional(v.number()),
    ethLocked: v.optional(v.number()),
    reputation: v.optional(v.number()),
    joinedAt: v.optional(v.string()),
    paymentAccounts: v.optional(v.array(v.any())),
    warnings: v.optional(v.array(v.object({
      id: v.string(),
      message: v.string(),
      createdAt: v.string(),
      acknowledged: v.optional(v.boolean()),
    }))),
  })
  .index("by_username", ["username"])
  .index("by_email", ["email"]),

  trades: defineTable({
    buyerId: v.optional(v.id("users")),
    sellerId: v.id("users"),
    listingId: v.id("listings"),
    type: v.optional(v.string()),                      // "buy" | "sell"
    amountUsd: v.optional(v.number()),
    rate: v.optional(v.number()),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    status: v.string(),                    // "payment_pending"|"paid"|"completed"|"disputed"|"cancelled"
    escrowLocked: v.optional(v.boolean()),
    createdAt: v.string(),
    completedAt: v.optional(v.string()),
    
    // Legacy support for older components
    amountEth: v.number(),
    amountEtb: v.number(),
    feeEth: v.number(),
  })
  .index("by_buyer", ["buyerId"])
  .index("by_seller", ["sellerId"]),

  listings: defineTable({
    sellerId: v.id("users"),
    amountEth: v.number(),
    minLimitEtb: v.number(),
    maxLimitEtb: v.number(),
    paymentMethods: v.array(v.string()),
    type: v.string(),                      // "buy" | "sell"
    customRateEtb: v.optional(v.number()),
    paymentAccounts: v.array(v.any()),
    status: v.string(),                    // "active" | "inactive" | ...
    createdAt: v.string(),
  })
  .index("by_status", ["status"]),

  transactions: defineTable({
    userId: v.id("users"),
    type: v.string(),                      // "deposit"|"withdrawal"|"send"|"receive"|"trade"
    amountUsd: v.number(),
    amountEtb: v.optional(v.number()),
    method: v.optional(v.string()),
    status: v.string(),                    // "pending"|"completed"|"failed"
    txHash: v.optional(v.string()),
    createdAt: v.string(),
  }),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.string(),
  })
  .index("by_user", ["userId"]),

  reviews: defineTable({
    userId: v.id("users"),
    username: v.string(),
    rating: v.number(),
    content: v.string(),
    isApproved: v.boolean(),
    createdAt: v.string(),
  })
  .index("by_approved", ["isApproved"]),

  disputes: defineTable({
    tradeId: v.id("trades"),
    openedBy: v.id("users"),
    reason: v.string(),
    status: v.string(),                    // "open"|"resolved"|"fraud"
    adminNote: v.optional(v.string()),
    createdAt: v.number(),
  }),

  exchangeRates: defineTable({
    buyRate: v.number(),                  // ETB per $1 (user buys USD)
    sellRate: v.number(),                 // ETB per $1 (user sells USD)
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  }),

  systemSettings: defineTable({
    etbRatePerDollar: v.number(),
    etbRatePerDollarSell: v.optional(v.number()),
    flatFeePercent: v.number(),
    maxFeeUSD: v.number(),
    commissionType: v.string(),
    commissionValue: v.number(),
    isP2pFreePeriod: v.optional(v.boolean()),
    depositFeePercent: v.optional(v.number()),
    withdrawalFeePercent: v.optional(v.number()),
    minDepositUSD: v.optional(v.number()),
    minWithdrawalUSD: v.optional(v.number()),
    maxDailyWithdrawalUSD: v.optional(v.number()),
    pointsPerTrade: v.optional(v.number()),
    referralBonusPoints: v.optional(v.number()),
    isLeaderboardEnabled: v.optional(v.boolean()),
    collectedFeesETH: v.optional(v.number()),
  }),

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
