import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.union(v.string(), v.null())),
    fullName: v.optional(v.union(v.string(), v.null())),
    username: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    role: v.optional(v.union(v.string(), v.null())),
    kycStatus: v.optional(v.union(v.string(), v.null())),
    kycRejectionReason: v.optional(v.union(v.string(), v.null())),
    kycIdImage: v.optional(v.union(v.string(), v.null())),
    kycSelfie: v.optional(v.union(v.string(), v.null())),
    kycStep: v.optional(v.union(v.string(), v.null())),
    kycData: v.optional(v.any()),
    balanceUsd: v.optional(v.union(v.number(), v.null())),
    balanceEscrow: v.optional(v.union(v.number(), v.null())),
    tradeCount: v.optional(v.union(v.number(), v.null())),
    isBanned: v.optional(v.union(v.boolean(), v.null())),
    isSuspended: v.optional(v.union(v.boolean(), v.null())),
    successfulInvites: v.optional(v.union(v.number(), v.null())),
    totalTrades: v.optional(v.union(v.number(), v.null())),
    totalVolume: v.optional(v.union(v.number(), v.null())),
    loyalty_points: v.optional(v.union(v.number(), v.null())),
    longest_streak: v.optional(v.union(v.number(), v.null())),
    is_verified_trader: v.optional(v.union(v.boolean(), v.null())),
    referralCode: v.optional(v.union(v.string(), v.null())),
    referredBy: v.optional(v.union(v.string(), v.null())),
    numericId: v.optional(v.union(v.number(), v.null())),
    twoFaEnabled: v.optional(v.union(v.boolean(), v.null())),
    twoFaMethod: v.optional(v.union(v.string(), v.null())),
    themePreference: v.optional(v.union(v.string(), v.null())),
    preferredLanguage: v.optional(v.union(v.string(), v.null())),
    onboarding_completed: v.optional(v.union(v.boolean(), v.null())),
    passwordHash: v.optional(v.union(v.string(), v.null())),
    ethAddress: v.optional(v.union(v.string(), v.null())),
    ethPrivateKey: v.optional(v.union(v.string(), v.null())),
    etbBalance: v.optional(v.union(v.number(), v.null())),
    ethBalance: v.optional(v.union(v.number(), v.null())),
    ethLocked: v.optional(v.union(v.number(), v.null())),
    reputation: v.optional(v.union(v.number(), v.null())),
    joinedAt: v.optional(v.union(v.string(), v.null())),
    paymentAccounts: v.optional(v.array(v.any())),
    warnings: v.optional(v.array(v.any())),
    // Extra fields found in live data
    age: v.optional(v.union(v.number(), v.null())),
    bio: v.optional(v.union(v.string(), v.null())),
    displayName: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    lastActive: v.optional(v.union(v.string(), v.null())),
    kycDocument: v.optional(v.any()),
    kycIdFront: v.optional(v.any()),
    kycIdBack: v.optional(v.any()),
    
    // Ratings & Verification
    averageRating: v.optional(v.number()),
    
    // Telegram Connection
    telegramChatId: v.optional(v.string()),
    telegramLinkCode: v.optional(v.string()),
    telegramLinkExpires: v.optional(v.number()),
    
    // Notification toggles
    smsEnabled: v.optional(v.boolean()),
    telegramEnabled: v.optional(v.boolean()),
    emailEnabled: v.optional(v.boolean()),
    preferredVerificationMethod: v.optional(v.string()),
    status: v.optional(v.string()), // "pending_verification" | "active"

    // KYC Additional fields
    kycFullName: v.optional(v.string()),
    kycDob: v.optional(v.string()),
    kycRejectedCount: v.optional(v.number()),
    isFlagged: v.optional(v.boolean()),
    flaggedReason: v.optional(v.string()),
  })
  .index("by_username", ["username"])
  .index("by_email", ["email"]),

  trades: defineTable({
    buyerId: v.optional(v.id("users")),
    sellerId: v.id("users"),
    listingId: v.id("listings"),
    type: v.optional(v.string()),
    amountUsd: v.optional(v.number()),
    amountEth: v.optional(v.number()),
    amountEtb: v.optional(v.number()),
    feeEth: v.optional(v.number()),
    rate: v.optional(v.number()),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    status: v.string(),
    escrowLocked: v.optional(v.boolean()),
    createdAt: v.string(),
    completedAt: v.optional(v.string()),
  })
  .index("by_buyer", ["buyerId"])
  .index("by_seller", ["sellerId"]),

  listings: defineTable({
    sellerId: v.id("users"),
    amountEth: v.optional(v.number()),
    minLimitEtb: v.optional(v.number()),
    maxLimitEtb: v.optional(v.number()),
    paymentMethods: v.optional(v.array(v.string())),
    type: v.string(),
    customRateEtb: v.optional(v.number()),
    paymentAccounts: v.optional(v.array(v.any())),
    status: v.string(),
    createdAt: v.string(),
  })
  .index("by_status", ["status"]),

  transactions: defineTable({
    userId: v.id("users"),
    type: v.string(),
    amountUsd: v.optional(v.number()),
    amountUSD: v.optional(v.number()),   // legacy uppercase
    amountETH: v.optional(v.number()),   // legacy uppercase
    amountEtb: v.optional(v.number()),
    method: v.optional(v.string()),
    status: v.optional(v.string()),
    txHash: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.string(),
  }),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.optional(v.string()),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.string(),
  })
  .index("by_user", ["userId"]),

  reviews: defineTable({
    userId: v.id("users"),
    username: v.optional(v.string()),
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
    status: v.string(),
    buyerEvidence: v.optional(v.array(v.string())),
    sellerEvidence: v.optional(v.array(v.string())),
    adminNote: v.optional(v.string()),
    resolvedAt: v.optional(v.string()),
    resolvedBy: v.optional(v.id("users")),
    resolution: v.optional(v.string()),
    splitBuyerPercent: v.optional(v.number()),
    createdAt: v.optional(v.any()), // number or string in live data
  }).index("by_trade", ["tradeId"]),

  exchangeRates: defineTable({
    buyRate: v.number(),
    sellRate: v.number(),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
  }),

  systemSettings: defineTable({
    etbRatePerDollar: v.number(),
    etbRatePerDollarSell: v.optional(v.number()),
    flatFeePercent: v.optional(v.number()),
    maxFeeUSD: v.optional(v.number()),
    commissionType: v.optional(v.string()),
    commissionValue: v.optional(v.number()),
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
    masterWalletAddress: v.optional(v.string()),
    masterWalletBalanceETH: v.optional(v.number()),
    isSmsChannelDisabled: v.optional(v.boolean()),
    isTelegramChannelDisabled: v.optional(v.boolean()),
    isEmailChannelDisabled: v.optional(v.boolean()),
  }),

  adminAuditLogs: defineTable({
    adminId: v.id("users"),
    adminUsername: v.string(),
    action: v.string(),
    targetId: v.optional(v.string()),
    targetName: v.optional(v.string()),
    details: v.string(),
    createdAt: v.string(),
  }),

  supportTickets: defineTable({
    userId: v.id("users"),
    username: v.optional(v.string()),
    subject: v.optional(v.string()),
    status: v.string(),
    messages: v.optional(v.array(v.any())),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  }),

  depositRequests: defineTable({
    userId: v.id("users"),
    amountUsd: v.optional(v.number()),
    amountUSD: v.optional(v.number()),   // legacy capital D variant
    amountEth: v.optional(v.number()),
    status: v.string(),
    screenshotUrl: v.optional(v.string()),
    createdAt: v.string(),
    reviewedAt: v.optional(v.string()),
    adminNote: v.optional(v.string()),
    username: v.optional(v.string()),
    walletType: v.optional(v.string()),
    senderReference: v.optional(v.string()),
  }),

  withdrawRequests: defineTable({
    userId: v.id("users"),
    amountEth: v.optional(v.number()),
    amountUSD: v.optional(v.number()),
    address: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),
    status: v.string(),
    createdAt: v.string(),
    reviewedAt: v.optional(v.string()),
    adminNote: v.optional(v.string()),
    username: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
    walletType: v.optional(v.string()),
    network: v.optional(v.string()),
  }),

  inviteRewards: defineTable({
    referrerId: v.id("users"),
    referredId: v.id("users"),
    rewardAmount: v.optional(v.number()),
    rewardStatus: v.optional(v.string()),
    createdAt: v.string(),
  }),

  messages: defineTable({
    tradeId: v.id("trades"),
    senderId: v.string(), // userId or "system"
    senderUsername: v.optional(v.string()),
    messageText: v.string(),
    messageType: v.string(), // "text" | "image" | "system"
    createdAt: v.string(),
    isRead: v.optional(v.boolean()),
    readAt: v.optional(v.string()),
  }).index("by_trade", ["tradeId"]),

  tradeRatings: defineTable({
    tradeId: v.id("trades"),
    raterId: v.id("users"),
    ratedId: v.id("users"),
    rating: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.string(),
  })
  .index("by_trade", ["tradeId"])
  .index("by_rated", ["ratedId"]),

  disputeAuditLogs: defineTable({
    adminId: v.id("users"),
    adminUsername: v.string(),
    tradeId: v.id("trades"),
    action: v.string(),
    details: v.string(),
    createdAt: v.string(),
  })
  .index("by_trade", ["tradeId"]),

  rateHistory: defineTable({
    buyRate: v.number(),
    sellRate: v.number(),
    averageRate: v.number(),
    createdAt: v.string(),
  })
  .index("by_created", ["createdAt"]),

  notificationLogs: defineTable({
    userId: v.id("users"),
    type: v.string(),
    channel: v.string(), // "sms" | "telegram" | "in_app"
    message: v.string(),
    status: v.string(), // "delivered" | "failed"
    sentAt: v.string(),
  })
  .index("by_user", ["userId"]),

  otps: defineTable({
    userId: v.id("users"),
    purpose: v.string(), // "login" | "withdrawal" | "sensitive_change"
    code: v.string(),
    expiresAt: v.number(),
    attempts: v.number(),
    resends: v.number(),
    channel: v.string(), // "sms" | "telegram"
    status: v.string(), // "pending" | "verified" | "expired" | "invalidated"
    createdAtEpoch: v.number(),
    createdAt: v.string(),
  })
  .index("by_user_purpose_status", ["userId", "purpose", "status"]),

  otpAttemptsLogs: defineTable({
    userId: v.id("users"),
    purpose: v.string(),
    codeEntered: v.string(),
    channel: v.string(),
    status: v.string(), // "success" | "failed_expired" | "failed_incorrect" | "failed_not_found"
    createdAt: v.string(),
  })
  .index("by_user", ["userId"]),

  trustedDevices: defineTable({
    userId: v.id("users"),
    deviceFingerprint: v.string(),
    deviceName: v.string(),
    location: v.optional(v.string()),
    trustedUntil: v.number(),
    createdAt: v.string(),
  })
  .index("by_user_fingerprint", ["userId", "deviceFingerprint"]),
});
