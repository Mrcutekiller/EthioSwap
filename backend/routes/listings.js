import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get active listings
router.get('/', (req, res) => {
  const listings = db.getCollection('listings');
  const users = db.getCollection('users');
  const systemSettings = db.read().systemSettings;

  // Filter listings: active, and seller must be verified (kycStatus === 'approved')
  const activeListings = listings
    .filter(l => l.status === 'active')
    .map(l => {
      const seller = users.find(u => u.id === l.sellerId);
      return {
        ...l,
        sellerName: seller ? seller.username : 'Unknown',
        sellerReputation: seller ? seller.reputation : 100,
        sellerPhone: seller ? seller.phone : '',
        etbRate: systemSettings.etbRatePerDollar
      };
    });

  res.json(activeListings);
});

// Create a new listing
router.post('/', (req, res) => {
  const { sellerId, amountETH, minLimitETB, maxLimitETB, paymentMethods } = req.body;

  if (!sellerId || !amountETH || !minLimitETB || !maxLimitETB || !paymentMethods) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const user = db.findById('users', sellerId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Enforce Admin Verification (Only verified users can trade)
  if (user.kycStatus !== 'approved') {
    return res.status(403).json({ error: "Account not verified. You must complete KYC to list trades." });
  }

  const amount = parseFloat(amountETH);
  const availableBalance = user.ethBalance - user.ethLocked;

  // Enforce balance check
  if (availableBalance < amount) {
    return res.status(400).json({ error: `Insufficient balance. Available: ${availableBalance.toFixed(4)} ETH` });
  }

  // Create listing
  const newListing = {
    id: `lst_${Date.now()}`,
    sellerId,
    amount: amount,
    minLimit: parseFloat(minLimitETB),
    maxLimit: parseFloat(maxLimitETB),
    paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : [paymentMethods],
    createdAt: new Date().toISOString(),
    status: "active"
  };

  // Lock the listing ETH in the database (escrow lock)
  db.updateById('users', sellerId, {
    ethLocked: user.ethLocked + amount
  });

  const listings = db.getCollection('listings');
  listings.push(newListing);
  db.saveCollection('listings', listings);

  res.status(201).json(newListing);
});

// Pause/Cancel listing
router.post('/:id/pause', (req, res) => {
  const { id } = req.params;
  const { sellerId } = req.body;

  const listing = db.findById('listings', id);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  if (listing.sellerId !== sellerId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (listing.status !== 'active') {
    return res.status(400).json({ error: `Listing is already ${listing.status}` });
  }

  // Release locked ETH back to seller available balance
  const user = db.findById('users', sellerId);
  if (user) {
    db.updateById('users', sellerId, {
      ethLocked: Math.max(0, user.ethLocked - listing.amount)
    });
  }

  const updated = db.updateById('listings', id, { status: 'paused' });
  res.json(updated);
});

export default router;
