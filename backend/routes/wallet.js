import express from 'express';
import { db } from '../db.js';
import { ethers } from 'ethers';

const router = express.Router();
const ETH_USD_PRICE = 3000.0;

// Get wallet balance and details
router.get('/balance/:userId', async (req, res) => {
  const { userId } = req.params;
  const user = db.findById('users', userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Calculate USD value of balances
  const ethAvailable = user.ethBalance - user.ethLocked;
  const balanceUSD = user.ethBalance * ETH_USD_PRICE;
  const availableUSD = ethAvailable * ETH_USD_PRICE;
  const lockedUSD = user.ethLocked * ETH_USD_PRICE;

  res.json({
    ethAddress: user.ethAddress,
    ethBalance: user.ethBalance,
    ethLocked: user.ethLocked,
    ethAvailable: ethAvailable,
    balanceUSD: balanceUSD,
    availableUSD: availableUSD,
    lockedUSD: lockedUSD,
    etbBalance: user.etbBalance
  });
});

// Mock Deposit (Faucet)
router.post('/deposit-mock', (req, res) => {
  const { userId, amountETH } = req.body;

  if (!userId || !amountETH) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const user = db.findById('users', userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const amount = parseFloat(amountETH);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const updatedUser = db.updateById('users', userId, {
    ethBalance: user.ethBalance + amount
  });

  db.addTransaction(userId, 'deposit', parseFloat(amountETH), parseFloat(amountETH) * 3000, `Mock deposit of ${amountETH} ETH`);
  db.addNotification(userId, 'deposit', `Your deposit of ${amountETH} ETH ($${(parseFloat(amountETH) * 3000).toFixed(2)}) has been confirmed.`);

  res.json({
    message: "Simulated deposit successful!",
    ethBalance: updatedUser.ethBalance
  });
});

// Withdraw ETH
router.post('/withdraw', async (req, res) => {
  const { userId, amountETH, destinationAddress } = req.body;

  if (!userId || !amountETH || !destinationAddress) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!ethers.isAddress(destinationAddress)) {
    return res.status(400).json({ error: "Invalid Ethereum address format." });
  }

  const user = db.findById('users', userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const amount = parseFloat(amountETH);
  const available = user.ethBalance - user.ethLocked;

  if (amount <= 0 || amount > available) {
    return res.status(400).json({ error: "Insufficient available balance or invalid amount." });
  }

  // Estimate network gas fee
  const estGasFeeETH = 0.00021; // Mock gas fee equivalent to ~21000 gas

  // Subtract amount + gas fee from user balance
  const finalBalance = user.ethBalance - (amount + estGasFeeETH);
  
  if (finalBalance < 0) {
    return res.status(400).json({ error: "Insufficient balance to cover estimated transaction gas fees." });
  }

  // 1. Update Database
  db.updateById('users', userId, {
    ethBalance: finalBalance
  });

  // 2. Perform Real Blockchain Send (Sepolia) or fall back gracefully
  let txHash = `0x${Math.random().toString(16).substring(2, 66)}`; // Random fallback txHash
  let blockchainNote = "Simulation";

  try {
    // If a master wallet key is configured in env, we can execute real transfer
    const providerUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
    const masterKey = process.env.MASTER_WALLET_PRIVATE_KEY;
    
    if (masterKey) {
      const provider = new ethers.JsonRpcProvider(providerUrl);
      const wallet = new ethers.Wallet(masterKey, provider);
      
      const tx = await wallet.sendTransaction({
        to: destinationAddress,
        value: ethers.parseEther(amount.toString())
      });
      
      txHash = tx.hash;
      blockchainNote = "Real Sepolia Transaction Sent!";
    }
  } catch (error) {
    console.error("Blockchain execution failed, falling back to simulation:", error.message);
    blockchainNote = "Simulation (RPC connection unavailable or insufficient faucet funds)";
  }

  // 3. Log transaction and notify user
  db.addTransaction(userId, 'withdrawal', amount, amount * ETH_USD_PRICE, `Withdrawal of ${amount} ETH to ${destinationAddress}. Tx: ${txHash}`);
  db.addNotification(userId, 'withdrawal', `Your withdrawal of ${amount} ETH ($${(amount * ETH_USD_PRICE).toFixed(2)}) to ${destinationAddress} has been completed.`);


  res.json({
    success: true,
    txHash,
    note: blockchainNote,
    amount: amount,
    gasFee: estGasFeeETH,
    recipient: destinationAddress
  });
});

export default router;
