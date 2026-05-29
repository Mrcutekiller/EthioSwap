import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Setup Multer for upload storage
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ETH mock price in USD for conversion
const ETH_USD_PRICE = 3000.0;

// Get active trades for a user (buyer or seller)
router.get('/', (req, res) => {
  const { userId } = req.query;
  const trades = db.getCollection('trades');
  const users = db.getCollection('users');

  if (!userId) {
    return res.status(400).json({ error: "Missing userId query param" });
  }

  const userTrades = trades
    .filter(t => t.buyerId === userId || t.sellerId === userId)
    .map(t => {
      const buyer = users.find(u => u.id === t.buyerId);
      const seller = users.find(u => u.id === t.sellerId);
      return {
        ...t,
        buyerName: buyer ? buyer.username : 'Unknown',
        sellerName: seller ? seller.username : 'Unknown',
        sellerPhone: seller ? seller.phone : '',
        buyerPhone: buyer ? buyer.phone : ''
      };
    });

  res.json(userTrades);
});

// Get a single trade
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const trade = db.findById('trades', id);
  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  const users = db.getCollection('users');
  const buyer = users.find(u => u.id === trade.buyerId);
  const seller = users.find(u => u.id === trade.sellerId);

  res.json({
    ...trade,
    buyerName: buyer ? buyer.username : 'Unknown',
    sellerName: seller ? seller.username : 'Unknown',
    sellerPhone: seller ? seller.phone : '',
    buyerPhone: buyer ? buyer.phone : ''
  });
});

// Initiate a trade
router.post('/', (req, res) => {
  const { buyerId, listingId, amountETH } = req.body;

  if (!buyerId || !listingId || !amountETH) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const buyer = db.findById('users', buyerId);
  if (!buyer) {
    return res.status(404).json({ error: "Buyer not found" });
  }

  if (buyer.kycStatus !== 'approved') {
    return res.status(403).json({ error: "Your account KYC must be approved by admin before trading." });
  }

  const listing = db.findById('listings', listingId);
  if (!listing || listing.status !== 'active') {
    return res.status(400).json({ error: "Listing is no longer active" });
  }

  const amount = parseFloat(amountETH);
  if (amount > listing.amount) {
    return res.status(400).json({ error: "Amount exceeds listing size" });
  }

  const seller = db.findById('users', listing.sellerId);
  if (!seller) {
    return res.status(404).json({ error: "Seller not found" });
  }

  // Calculate ETB rate
  const systemSettings = db.read().systemSettings;
  const priceUSD = amount * ETH_USD_PRICE;
  const amountETB = priceUSD * systemSettings.etbRatePerDollar;

  // Daily trade volume limit enforcement ($5000 max)
  const today = new Date().toISOString().substring(0, 10);
  const trades = db.getCollection('trades');
  const buyerTodayVolumeUSD = trades
    .filter(t => t.buyerId === buyerId && t.status === 'completed' && t.createdAt?.startsWith(today))
    .reduce((sum, t) => sum + (t.amountETH * ETH_USD_PRICE), 0);

  if (buyerTodayVolumeUSD + priceUSD > systemSettings.dailyTradeLimit) {
    return res.status(400).json({ error: `Daily limit exceeded. You can only trade up to $${systemSettings.dailyTradeLimit} per day. Today traded: $${buyerTodayVolumeUSD.toFixed(2)}` });
  }

  // Lock the listing status to in_trade
  db.updateById('listings', listingId, { status: 'in_trade' });

  // Create active trade
  const newTrade = {
    id: `trd_${Date.now()}`,
    listingId,
    buyerId,
    sellerId: listing.sellerId,
    amountETH: amount,
    amountETB: Math.round(amountETB * 100) / 100,
    status: "payment_pending",
    createdAt: new Date().toISOString(),
    timerExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes limit
    proofImage: null,
    chat: [
      {
        senderId: "system",
        message: `Trade initiated. Seller's ${amount} ETH is locked in escrow. Buyer has 30 minutes to make the payment of ${Math.round(amountETB).toLocaleString()} ETB.`,
        timestamp: new Date().toISOString()
      }
    ]
  };

  trades.push(newTrade);
  db.saveCollection('trades', trades);

  res.status(201).json(newTrade);
});

// Send Chat Message
router.post('/:id/message', (req, res) => {
  const { id } = req.params;
  const { senderId, message } = req.body;

  const trade = db.findById('trades', id);
  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  const updatedChat = [...trade.chat, {
    senderId,
    message,
    timestamp: new Date().toISOString()
  }];

  const updated = db.updateById('trades', id, { chat: updatedChat });
  res.json(updated);
});

// Buyer marks as paid (with screenshot)
router.post('/:id/pay', upload.single('proof'), (req, res) => {
  const { id } = req.params;
  const { buyerId } = req.body;

  const trade = db.findById('trades', id);
  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  if (trade.buyerId !== buyerId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const proofPath = req.file ? `/uploads/${req.file.filename}` : null;
  if (!proofPath) {
    return res.status(400).json({ error: "Please upload a valid payment proof screenshot." });
  }

  const updatedChat = [...trade.chat, {
    senderId: "system",
    message: "Buyer marked payment as completed. Proof of payment screenshot has been uploaded. Waiting for seller confirmation.",
    timestamp: new Date().toISOString()
  }];

  const updated = db.updateById('trades', id, {
    status: 'paid',
    proofImage: proofPath,
    chat: updatedChat
  });

  res.json(updated);
});

// Seller releases ETH (complete trade)
router.post('/:id/release', (req, res) => {
  const { id } = req.params;
  const { sellerId } = req.body;

  const trade = db.findById('trades', id);
  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  if (trade.sellerId !== sellerId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const seller = db.findById('users', sellerId);
  const buyer = db.findById('users', trade.buyerId);
  // Commission calculation based on system settings
  const commissionType = systemSettings.commissionType || 'percentage';
  const commissionValue = parseFloat(systemSettings.commissionValue ?? 0.5);
  let feeETH = 0;

  if (commissionType === 'percentage') {
    feeETH = trade.amountETH * (commissionValue / 100);
  } else {
    // flat_usd
    feeETH = commissionValue / ETH_USD_PRICE;
  }

  // Cap fee at total trade amount
  if (feeETH > trade.amountETH) {
    feeETH = trade.amountETH;
  }

  const buyerGetsETH = trade.amountETH - feeETH;

  // Perform transaction database balancing:
  // 1. Deduct seller's balance and locked balance
  db.updateById('users', sellerId, {
    ethBalance: seller.ethBalance - trade.amountETH,
    ethLocked: Math.max(0, seller.ethLocked - trade.amountETH)
  });

  // 2. Add buyer's balance
  db.updateById('users', trade.buyerId, {
    ethBalance: buyer.ethBalance + buyerGetsETH
  });

  // 3. Add commission to Admin user's wallet balance
  const adminUser = db.findById('users', 'usr_admin');
  if (adminUser) {
    db.updateById('users', 'usr_admin', {
      ethBalance: adminUser.ethBalance + feeETH
    });
  }

  // 4. Log the fee transaction record
  db.addTransaction('usr_admin', 'fee', feeETH, feeETH * ETH_USD_PRICE, `Commission collected from trade ${trade.id}`);

  // 5. Add to platform collected fees settings
  const newCollectedFees = (systemSettings.collectedFeesETH || 0) + feeETH;
  const updatedSettings = {
    ...systemSettings,
    collectedFeesETH: newCollectedFees
  };
  
  const currentDb = db.read();
  currentDb.systemSettings = updatedSettings;
  db.write(currentDb);

  // Update listing status
  db.updateById('listings', trade.listingId, { status: 'completed' });

  // Update trade status
  const updatedChat = [...trade.chat, {
    senderId: "system",
    message: `Trade completed successfully! Escrow released. Buyer received ${buyerGetsETH.toFixed(6)} ETH (Fee: ${feeETH.toFixed(6)} ETH deducted).`,
    timestamp: new Date().toISOString()
  }];

  const updated = db.updateById('trades', id, {
    status: 'completed',
    chat: updatedChat
  });

  res.json(updated);
});

// Open a dispute (either buyer, seller, or auto-triggered)
router.post('/:id/dispute', (req, res) => {
  const { id } = req.params;
  const { userId, reason } = req.body;

  const trade = db.findById('trades', id);
  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  const user = db.findById('users', userId);
  const username = user ? user.username : 'A user';

  const updatedChat = [...trade.chat, {
    senderId: "system",
    message: `Dispute opened by ${username}. Reason: ${reason || 'Unresponsive party.'}. Admin notification sent.`,
    timestamp: new Date().toISOString()
  }];

  const updated = db.updateById('trades', id, {
    status: 'disputed',
    chat: updatedChat
  });

  res.json(updated);
});

// Buyer cancels trade
router.post('/:id/cancel', (req, res) => {
  const { id } = req.params;
  const { buyerId } = req.body;

  const trade = db.findById('trades', id);
  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  if (trade.buyerId !== buyerId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (trade.status !== 'payment_pending') {
    return res.status(400).json({ error: "Trade cannot be cancelled at this stage." });
  }

  // Release escrow lock back to seller available balance
  const seller = db.findById('users', trade.sellerId);
  if (seller) {
    db.updateById('users', trade.sellerId, {
      ethLocked: Math.max(0, seller.ethLocked - trade.amountETH)
    });
  }

  db.updateById('listings', trade.listingId, { status: 'active' });

  const updatedChat = [...trade.chat, {
    senderId: "system",
    message: "Trade was cancelled by the buyer. Escrow returned to seller's available balance.",
    timestamp: new Date().toISOString()
  }];

  const updated = db.updateById('trades', id, {
    status: 'cancelled',
    chat: updatedChat
  });

  res.json(updated);
});

export default router;
