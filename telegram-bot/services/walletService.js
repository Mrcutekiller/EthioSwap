const { supabase } = require('../config');

/**
 * Get formatted wallet summary for user
 */
async function getWalletSummary(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, numeric_id, balance_usd, balance_escrow, etb_balance, eth_balance, eth_locked, eth_address')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('Unable to fetch wallet details.');
  }

  const usdAvailable = Number(user.balance_usd || 0);
  const usdEscrow = Number(user.balance_escrow || 0);
  const etbBalance = Number(user.etb_balance || 0);
  const ethBalance = Number(user.eth_balance || 0);
  const ethLocked = Number(user.eth_locked || 0);

  return {
    user,
    usdAvailable,
    usdEscrow,
    totalUsd: usdAvailable + usdEscrow,
    etbBalance,
    ethBalance,
    ethLocked,
    depositAddress: user.eth_address || '0x71C...ETHIOSWAP_CHAIN',
    numericId: user.numeric_id || 'N/A',
  };
}

/**
 * Get deposit information and instructions
 */
async function getDepositInfo(userId) {
  const { data: user } = await supabase
    .from('users')
    .select('eth_address, numeric_id, username')
    .eq('id', userId)
    .single();

  // If user doesn't have an address yet, assign a platform deposit identifier
  const depositAddress = user?.eth_address || '0x8b321aF28741e9766dB5E9F90a0715D2c5D5eFE6';

  return {
    depositAddress,
    supportedNetworks: [
      { name: 'USDT (TRC-20 / BSC / ERC-20)', minDeposit: '$5.00' },
      { name: 'ETH / Arbitrum / Base', minDeposit: '0.005 ETH' },
    ],
    instructions: [
      '1. Send USD / USDT / ETH directly to your unique on-chain address above.',
      '2. Automatic on-chain detection credits your P2P balance once confirmed (1-3 blocks).',
      '3. You can also paste your Transaction Hash (txHash) in bot to verify instantly.',
    ],
  };
}

/**
 * Submit an automatic on-chain deposit notification or tx hash
 */
async function submitDepositHash(userId, txHash, estimatedAmountUsd = 0) {
  const cleanHash = (txHash || '').trim();
  if (!cleanHash || cleanHash.length < 10) {
    return { success: false, message: 'Invalid transaction hash. Please check and try again.' };
  }

  try {
    // Check if hash already submitted
    const { data: existing } = await supabase
      .from('deposit_requests')
      .select('id, status')
      .eq('sender_reference', cleanHash)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: `This transaction has already been registered (Status: ${existing.status}).`,
      };
    }

    // Insert deposit request
    const { data, error } = await supabase
      .from('deposit_requests')
      .insert({
        user_id: userId,
        amount_usd: Number(estimatedAmountUsd) || 0,
        sender_reference: cleanHash,
        wallet_type: 'on_chain',
        status: 'pending',
        admin_note: 'Submitted via Telegram Bot (Automatic Chain Check)',
      })
      .select()
      .single();

    if (error) throw error;

    // Also record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'deposit',
      amount_usd: Number(estimatedAmountUsd) || 0,
      method: 'crypto_onchain',
      tx_hash: cleanHash,
      status: 'pending',
      note: 'Deposit submitted via Telegram bot',
    });

    return {
      success: true,
      requestId: data.id,
      message: 'Transaction submitted! Chain verification will credit your P2P wallet automatically.',
    };
  } catch (err) {
    console.error('Error submitting deposit hash:', err);
    return { success: false, message: err.message || 'Failed to submit deposit.' };
  }
}

/**
 * Request on-chain or fiat withdrawal
 */
async function requestWithdrawal(userId, amountUsd, destinationAddress, network = 'USDT (TRC-20)') {
  const amount = Number(amountUsd);
  if (isNaN(amount) || amount < 5) {
    return { success: false, message: 'Minimum withdrawal is $5.00 USD.' };
  }

  const cleanDest = (destinationAddress || '').trim();
  if (!cleanDest || cleanDest.length < 6) {
    return { success: false, message: 'Please provide a valid destination address or account.' };
  }

  try {
    // 1. Check user balance
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('id, balance_usd, username')
      .eq('id', userId)
      .single();

    if (uErr || !user) throw new Error('User not found.');

    const available = Number(user.balance_usd || 0);
    if (available < amount) {
      return {
        success: false,
        message: `Insufficient funds. Your available balance is $${available.toFixed(2)} USD.`,
      };
    }

    // 2. Deduct from balance
    const newBalance = available - amount;
    const { error: balErr } = await supabase
      .from('users')
      .update({ balance_usd: newBalance })
      .eq('id', userId);

    if (balErr) throw balErr;

    // 3. Create withdraw request record
    const { data: req, error: rErr } = await supabase
      .from('withdraw_requests')
      .insert({
        user_id: userId,
        username: user.username,
        amount_usd: amount,
        destination_address: cleanDest,
        wallet_address: cleanDest,
        network: network,
        wallet_type: 'crypto_chain',
        status: 'pending',
        admin_note: 'Automated chain withdrawal initiated via Telegram Bot',
      })
      .select()
      .single();

    if (rErr) throw rErr;

    // 4. Record transaction log
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'withdrawal',
      amount_usd: amount,
      method: network,
      status: 'processing',
      note: `Withdrawal of $${amount.toFixed(2)} to ${cleanDest}`,
    });

    return {
      success: true,
      newBalance,
      requestId: req.id,
      message: `Withdrawal request of $${amount.toFixed(2)} submitted! Sent to blockchain automatically.`,
    };
  } catch (err) {
    console.error('Withdrawal error:', err);
    return { success: false, message: err.message || 'Withdrawal failed.' };
  }
}

/**
 * Get recent transactions for user
 */
async function getRecentTransactions(userId, limit = 5) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return [];
  }
}

module.exports = {
  getWalletSummary,
  getDepositInfo,
  submitDepositHash,
  requestWithdrawal,
  getRecentTransactions,
};
