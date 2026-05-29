import express from 'express';
import { db } from '../db.js';

const router = express.Router();
const ETH_USD_PRICE = 3000.0;

// Middleware to verify user is admin (simplified for demo)
function isAdmin(req, res, next) {
  const adminId = req.headers['admin-id'];
  const user = db.findById('users', adminId);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
}

// Get KYC Queue
router.get('/kyc-queue', isAdmin, (req, res) => {
  const users = db.getCollection('users');
  const pendingUsers = users.filter(u => u.kycStatus === 'pending' || u.kycStep === 'pending');
  res.json(pendingUsers);
});

// Action KYC Approval
router.post('/kyc-action', isAdmin, (req, res) => {
  const { userId, approve, reason } = req.body;

  const user = db.findById('users', userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const kycStatus = approve ? 'approved' : 'rejected';
  const kycStep = approve ? 'approved' : 'rejected';
  
  db.updateById('users', userId, { 
    kycStatus, 
    kycStep,
    kycRejectionReason: approve ? null : (reason || "Documents could not be verified.")
  });

  if (approve) {
    db.addNotification(userId, 'kyc_status', '🎉 Congratulations! Your KYC verification has been approved. You are now verified to trade.');
  } else {
    const rejectReason = reason || "Submitted documents were blurry or did not match.";
    db.addNotification(userId, 'kyc_status', `❌ Your KYC verification was rejected. Reason: ${rejectReason}`);
  }

  res.json({ message: `User KYC ${kycStatus} successfully.`, rejectionReason: approve ? null : reason });
});

// Get all disputes
router.get('/disputes', isAdmin, (req, res) => {
  const trades = db.getCollection('trades');
  const users = db.getCollection('users');

  const disputedTrades = trades
    .filter(t => t.status === 'disputed')
    .map(t => {
      const buyer = users.find(u => u.id === t.buyerId);
      const seller = users.find(u => u.id === t.sellerId);
      return {
        ...t,
        buyerName: buyer ? buyer.username : 'Unknown',
        sellerName: seller ? seller.username : 'Unknown'
      };
    });

  res.json(disputedTrades);
});

// Resolve Dispute
router.post('/dispute-resolve', isAdmin, (req, res) => {
  const { tradeId, action } = req.body; // Action: 'release' or 'refund'

  const trade = db.findById('trades', tradeId);
  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  const seller = db.findById('users', trade.sellerId);
  const buyer = db.findById('users', trade.buyerId);
  const systemSettings = db.read().systemSettings;

  if (action === 'release') {
    // 1. Calculate fee
    const commissionType = systemSettings.commissionType || 'percentage';
    const commissionValue = parseFloat(systemSettings.commissionValue ?? 0.5);
    let feeETH = 0;

    if (commissionType === 'percentage') {
      feeETH = trade.amountETH * (commissionValue / 100);
    } else {
      // flat_usd
      feeETH = commissionValue / ETH_USD_PRICE;
    }

    if (feeETH > trade.amountETH) {
      feeETH = trade.amountETH;
    }

    const buyerGetsETH = trade.amountETH - feeETH;

    // 2. Adjust balances
    db.updateById('users', trade.sellerId, {
      ethBalance: seller.ethBalance - trade.amountETH,
      ethLocked: Math.max(0, seller.ethLocked - trade.amountETH)
    });

    db.updateById('users', trade.buyerId, {
      ethBalance: buyer.ethBalance + buyerGetsETH
    });

    // 3. Credit commission to Admin
    const adminUser = db.findById('users', 'usr_admin');
    if (adminUser) {
      db.updateById('users', 'usr_admin', {
        ethBalance: adminUser.ethBalance + feeETH
      });
    }

    // 4. Log the fee transaction record
    db.addTransaction('usr_admin', 'fee', feeETH, feeETH * ETH_USD_PRICE, `Commission collected from dispute release of trade ${trade.id}`);

    // 5. Collect fees settings update
    const newCollectedFees = (systemSettings.collectedFeesETH || 0) + feeETH;
    const updatedSettings = {
      ...systemSettings,
      collectedFeesETH: newCollectedFees
    };
    const currentDb = db.read();
    currentDb.systemSettings = updatedSettings;
    db.write(currentDb);

    db.updateById('listings', trade.listingId, { status: 'completed' });

    // 4. Update trade
    const updatedChat = [...trade.chat, {
      senderId: "system",
      message: `DISPUTE RESOLVED BY ADMIN. Escrow released to Buyer. Admin forced release of ${buyerGetsETH.toFixed(6)} ETH (Fee: ${feeETH.toFixed(6)} ETH).`,
      timestamp: new Date().toISOString()
    }];

    db.updateById('trades', tradeId, {
      status: 'completed',
      chat: updatedChat
    });

    res.json({ message: "Dispute resolved: Escrow released to buyer." });

  } else if (action === 'refund') {
    // 1. Release locked ETH back to seller
    db.updateById('users', trade.sellerId, {
      ethLocked: Math.max(0, seller.ethLocked - trade.amountETH)
    });

    db.updateById('listings', trade.listingId, { status: 'active' });

    // 2. Update trade
    const updatedChat = [...trade.chat, {
      senderId: "system",
      message: "DISPUTE RESOLVED BY ADMIN. Escrow cancelled. Funds refunded to Seller's available balance.",
      timestamp: new Date().toISOString()
    }];

    db.updateById('trades', tradeId, {
      status: 'cancelled',
      chat: updatedChat
    });

    res.json({ message: "Dispute resolved: Escrow refunded to seller." });
  } else {
    res.status(400).json({ error: "Invalid resolution action. Use 'release' or 'refund'" });
  }
});

// Get system settings & global statistics
router.get('/settings', isAdmin, (req, res) => {
  const currentDb = db.read();
  const listings = db.getCollection('listings');
  const trades = db.getCollection('trades');
  const users = db.getCollection('users');

  const totalUsers = users.filter(u => u.role !== 'admin').length;
  const activeOffers = listings.filter(l => l.status === 'active').length;
  const completedTrades = trades.filter(t => t.status === 'completed');
  const totalVolumeUSD = completedTrades.reduce((sum, t) => sum + (t.amountETH * ETH_USD_PRICE), 0);

  res.json({
    settings: currentDb.systemSettings,
    stats: {
      totalUsers,
      activeOffers,
      completedTradesCount: completedTrades.length,
      totalVolumeUSD,
      collectedFeesETH: currentDb.systemSettings.collectedFeesETH,
      collectedFeesUSD: currentDb.systemSettings.collectedFeesETH * ETH_USD_PRICE
    }
  });
});

// Update system settings
router.post('/settings', isAdmin, (req, res) => {
  const { etbRatePerDollar, dailyTradeLimit, flatFeePercent, maxFeeUSD, commissionType, commissionValue } = req.body;

  const currentDb = db.read();
  const updatedSettings = {
    ...currentDb.systemSettings,
    etbRatePerDollar: parseFloat(etbRatePerDollar) || currentDb.systemSettings.etbRatePerDollar,
    dailyTradeLimit: parseFloat(dailyTradeLimit) || currentDb.systemSettings.dailyTradeLimit,
    flatFeePercent: parseFloat(flatFeePercent) || currentDb.systemSettings.flatFeePercent,
    maxFeeUSD: parseFloat(maxFeeUSD) || currentDb.systemSettings.maxFeeUSD,
    commissionType: commissionType || currentDb.systemSettings.commissionType || 'percentage',
    commissionValue: commissionValue !== undefined ? parseFloat(commissionValue) : currentDb.systemSettings.commissionValue
  };

  currentDb.systemSettings = updatedSettings;
  db.write(currentDb);

  res.json({ message: "System settings updated successfully.", settings: updatedSettings });
});

// Revenue stats by time period
router.get('/revenue', isAdmin, (req, res) => {
  const { period } = req.query; // today, week, month, all
  const trades = db.getCollection('trades');
  const transactions = db.read().transactions || [];
  const now = new Date();

  const getStart = (p) => {
    switch(p) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week': return new Date(now.getTime() - 7*24*60*60*1000);
      case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
      default: return new Date(0);
    }
  };

  const start = getStart(period);

  const completed = trades.filter(t => t.status === 'completed' && new Date(t.completedAt || t.createdAt) >= start);
  const deposits = transactions.filter(tx => tx.type === 'deposit' && new Date(tx.createdAt) >= start);

  const volumeUSD = completed.reduce((s, t) => s + (t.amountETH * ETH_USD_PRICE), 0);
  const depositUSD = deposits.reduce((s, tx) => s + tx.amountUSD, 0);
  const feesETH = completed.reduce((s, t) => s + (t.feeETH || 0), 0);
  const feesUSD = feesETH * ETH_USD_PRICE;

  // Calculate Aggregated Metrics (All-time and Week-specific)
  const allDeposits = transactions.filter(tx => tx.type === 'deposit');
  const allWithdrawals = transactions.filter(tx => tx.type === 'withdrawal');
  const allCompletedTrades = trades.filter(t => t.status === 'completed');

  const totalDepositUSD = allDeposits.reduce((s, tx) => s + (tx.amountUSD || (tx.amountETH * ETH_USD_PRICE)), 0);
  const totalWithdrawalUSD = allWithdrawals.reduce((s, tx) => s + (tx.amountUSD || (tx.amountETH * ETH_USD_PRICE)), 0);

  const startOfWeek = new Date(now.getTime() - 7*24*60*60*1000);
  const weekDeposits = transactions.filter(tx => tx.type === 'deposit' && new Date(tx.createdAt) >= startOfWeek);
  const totalWeekDepositUSD = weekDeposits.reduce((s, tx) => s + (tx.amountUSD || (tx.amountETH * ETH_USD_PRICE)), 0);

  const systemSettings = db.read().systemSettings || {};
  const totalProfitETH = systemSettings.collectedFeesETH || 0;
  const totalProfitUSD = totalProfitETH * ETH_USD_PRICE;
  const totalVolumeUSD = allCompletedTrades.reduce((s, t) => s + (t.amountETH * ETH_USD_PRICE), 0);

  // Build chart data (last 7 days)
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i*24*60*60*1000);
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart.getTime() + 24*60*60*1000);
    const dayTrades = completed.filter(t => {
      const d = new Date(t.completedAt || t.createdAt);
      return d >= dayStart && d < dayEnd;
    });
    const dayDeposits = deposits.filter(tx => {
      const d = new Date(tx.createdAt);
      return d >= dayStart && d < dayEnd;
    });
    chartData.push({
      day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      volumeUSD: dayTrades.reduce((s,t) => s + (t.amountETH * ETH_USD_PRICE), 0),
      depositUSD: dayDeposits.reduce((s,tx) => s + tx.amountUSD, 0),
      count: dayTrades.length
    });
  }

  res.json({
    period,
    volumeUSD,
    depositUSD,
    feesUSD,
    tradeCount: completed.length,
    chartData,
    metrics: {
      totalUSD: totalVolumeUSD,
      totalDeposit: totalDepositUSD,
      totalWithdrawal: totalWithdrawalUSD,
      totalMyProfit: totalProfitUSD,
      totalWeekDeposit: totalWeekDepositUSD
    }
  });
});

// Get all transactions log for Admin
router.get('/transactions', isAdmin, (req, res) => {
  const transactions = db.read().transactions || [];
  const sorted = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

export default router;
