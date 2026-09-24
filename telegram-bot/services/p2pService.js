const { supabase, MIN_ORDER_USD } = require('../config');

/**
 * Get active listings for BUYING $ (seller is selling, user is buying)
 */
async function getBuyListings(currentUserId = null) {
  try {
    let query = supabase
      .from('listings')
      .select(`
        id,
        seller_id,
        seller_name,
        type,
        amount_eth,
        custom_rate_etb,
        min_limit_etb,
        max_limit_etb,
        payment_methods,
        payment_accounts,
        description,
        status,
        created_at
      `)
      .eq('status', 'active')
      .eq('type', 'sell')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: listings, error } = await query;
    if (error) throw error;

    // Filter out user's own listing if logged in
    const filtered = (listings || []).filter(l => !currentUserId || l.seller_id !== currentUserId);

    // Enrich with seller stats (orders count, reputation)
    const enriched = await Promise.all(
      filtered.map(async (item) => {
        let sellerStats = {
          trade_count: 0,
          reputation: 100,
          is_verified: false,
        };

        if (item.seller_id) {
          const { data: seller } = await supabase
            .from('users')
            .select('trade_count, total_trades, reputation, is_verified_trader, username')
            .eq('id', item.seller_id)
            .maybeSingle();

          if (seller) {
            sellerStats.trade_count = seller.trade_count || seller.total_trades || 0;
            sellerStats.reputation = seller.reputation || 100;
            sellerStats.is_verified = seller.is_verified_trader || false;
            if (!item.seller_name) item.seller_name = seller.username;
          }
        }

        const rate = Number(item.custom_rate_etb || 190.0);
        // Default min limit in USD is at least 5 USD
        const minUsd = item.min_limit_etb ? Math.max(MIN_ORDER_USD, Math.round(item.min_limit_etb / rate)) : MIN_ORDER_USD;
        const maxUsd = item.max_limit_etb ? Math.round(item.max_limit_etb / rate) : 500;

        return {
          ...item,
          rate,
          minUsd,
          maxUsd,
          sellerStats,
        };
      })
    );

    return enriched;
  } catch (err) {
    console.error('Error fetching buy listings:', err.message);
    return [];
  }
}

/**
 * Get active listings for SELLING $ (buyer is buying, user is selling)
 */
async function getSellListings(currentUserId = null) {
  try {
    let query = supabase
      .from('listings')
      .select(`
        id,
        seller_id,
        seller_name,
        type,
        amount_eth,
        custom_rate_etb,
        min_limit_etb,
        max_limit_etb,
        payment_methods,
        payment_accounts,
        description,
        status,
        created_at
      `)
      .eq('status', 'active')
      .eq('type', 'buy')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: listings, error } = await query;
    if (error) throw error;

    const filtered = (listings || []).filter(l => !currentUserId || l.seller_id !== currentUserId);

    const enriched = await Promise.all(
      filtered.map(async (item) => {
        let buyerStats = {
          trade_count: 0,
          reputation: 100,
          is_verified: false,
        };

        if (item.seller_id) {
          const { data: maker } = await supabase
            .from('users')
            .select('trade_count, total_trades, reputation, is_verified_trader, username')
            .eq('id', item.seller_id)
            .maybeSingle();

          if (maker) {
            buyerStats.trade_count = maker.trade_count || maker.total_trades || 0;
            buyerStats.reputation = maker.reputation || 100;
            buyerStats.is_verified = maker.is_verified_trader || false;
            if (!item.seller_name) item.seller_name = maker.username;
          }
        }

        const rate = Number(item.custom_rate_etb || 186.0);
        const minUsd = item.min_limit_etb ? Math.max(MIN_ORDER_USD, Math.round(item.min_limit_etb / rate)) : MIN_ORDER_USD;
        const maxUsd = item.max_limit_etb ? Math.round(item.max_limit_etb / rate) : 500;

        return {
          ...item,
          rate,
          minUsd,
          maxUsd,
          sellerStats: buyerStats,
        };
      })
    );

    return enriched;
  } catch (err) {
    console.error('Error fetching sell listings:', err.message);
    return [];
  }
}

/**
 * Get listing by ID
 */
async function getListingById(listingId) {
  try {
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (error || !listing) return null;

    let seller = null;
    if (listing.seller_id) {
      const { data: user } = await supabase
        .from('users')
        .select('id, username, trade_count, total_trades, reputation, is_verified_trader, phone, payment_accounts')
        .eq('id', listing.seller_id)
        .maybeSingle();
      seller = user;
    }

    const rate = Number(listing.custom_rate_etb || 190.0);
    const minUsd = listing.min_limit_etb ? Math.max(MIN_ORDER_USD, Math.round(listing.min_limit_etb / rate)) : MIN_ORDER_USD;
    const maxUsd = listing.max_limit_etb ? Math.round(listing.max_limit_etb / rate) : 1000;

    return {
      ...listing,
      rate,
      minUsd,
      maxUsd,
      seller,
    };
  } catch (err) {
    console.error('Error getting listing:', err.message);
    return null;
  }
}

/**
 * Create a new P2P Trade Order
 */
async function initiateTrade({ buyerId, sellerId, listingId, amountUsd, paymentMethod }) {
  const usd = Number(amountUsd);
  if (isNaN(usd) || usd < MIN_ORDER_USD) {
    return { success: false, message: `Minimum order amount is $${MIN_ORDER_USD}.` };
  }

  const listing = await getListingById(listingId);
  if (!listing) {
    return { success: false, message: 'This listing is no longer available.' };
  }

  const rate = listing.rate || 190.0;
  const amountEtb = Math.round(usd * rate * 100) / 100;

  try {
    // Insert trade into database
    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        listing_id: listingId,
        type: listing.type === 'sell' ? 'buy' : 'sell',
        amount_usd: usd,
        amount_etb: amountEtb,
        rate: rate,
        payment_method: paymentMethod || 'Telebirr / CBE',
        status: 'payment_pending',
        escrow_locked: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Send in-app notification to seller
    try {
      await supabase.from('notifications').insert({
        user_id: sellerId,
        type: 'new_trade',
        title: 'New P2P Trade Order',
        message: `A buyer opened an order for $${usd.toFixed(2)} (${amountEtb} ETB) via Telegram.`,
      });
    } catch (_) {}

    return {
      success: true,
      trade,
      amountEtb,
      rate,
    };
  } catch (err) {
    console.error('Error creating trade:', err);
    return { success: false, message: err.message || 'Failed to create trade.' };
  }
}

/**
 * Get active trades for a user (both buyer and seller)
 */
async function getUserTrades(userId) {
  try {
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return trades || [];
  } catch (err) {
    console.error('Error fetching trades:', err.message);
    return [];
  }
}

/**
 * Get trade by ID with buyer and seller info
 */
async function getTradeById(tradeId) {
  try {
    const { data: trade, error } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (error || !trade) return null;

    let buyer = null;
    let seller = null;

    if (trade.buyer_id) {
      const { data: b } = await supabase
        .from('users')
        .select('id, username, phone, telegram_chat_id')
        .eq('id', trade.buyer_id)
        .maybeSingle();
      buyer = b;
    }

    if (trade.seller_id) {
      const { data: s } = await supabase
        .from('users')
        .select('id, username, phone, payment_accounts, telegram_chat_id')
        .eq('id', trade.seller_id)
        .maybeSingle();
      seller = s;
    }

    return { ...trade, buyer, seller };
  } catch (err) {
    console.error('Error getting trade details:', err.message);
    return null;
  }
}

/**
 * Buyer marks trade as paid
 */
async function markPaid(tradeId, buyerId) {
  try {
    const { data: trade } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (!trade) return { success: false, message: 'Trade not found.' };
    if (trade.buyer_id !== buyerId) {
      return { success: false, message: 'Only the buyer can mark this trade as paid.' };
    }

    const { error } = await supabase
      .from('trades')
      .update({ status: 'paid' })
      .eq('id', tradeId);

    if (error) throw error;

    // Notify seller
    try {
      await supabase.from('notifications').insert({
        user_id: trade.seller_id,
        type: 'payment_sent',
        title: 'Payment Sent by Buyer',
        message: `Buyer marked trade #${tradeId.slice(0, 8)} as paid. Please check your bank/Telebirr and release escrow.`,
      });
    } catch (_) {}

    return { success: true };
  } catch (err) {
    console.error('Error marking trade paid:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Seller releases escrow to buyer
 */
async function releaseEscrow(tradeId, sellerId) {
  try {
    const { data: trade } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (!trade) return { success: false, message: 'Trade not found.' };
    if (trade.seller_id !== sellerId) {
      return { success: false, message: 'Only the seller can release the escrow.' };
    }

    // Transfer balance: credit buyer balance_usd
    const { data: buyer } = await supabase
      .from('users')
      .select('balance_usd')
      .eq('id', trade.buyer_id)
      .single();

    const currentBuyerBal = Number(buyer?.balance_usd || 0);
    await supabase
      .from('users')
      .update({ balance_usd: currentBuyerBal + Number(trade.amount_usd) })
      .eq('id', trade.buyer_id);

    // Update trade status to completed
    await supabase
      .from('trades')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        escrow_locked: false,
      })
      .eq('id', tradeId);

    // Increment trade counts
    await supabase.rpc('increment_trade_counts', {
      p_buyer_id: trade.buyer_id,
      p_seller_id: trade.seller_id,
    }).catch(() => {
      // Fallback manual increment if RPC doesn't exist
    });

    return { success: true };
  } catch (err) {
    console.error('Error releasing escrow:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Create a new P2P Listing (Sell or Buy ad)
 */
async function createListing({ userId, username, type, amountUsd, rateEtb, minUsd, maxUsd, paymentMethods, paymentAccounts }) {
  try {
    const usd = Number(amountUsd);
    const rate = Number(rateEtb) || 190.0;
    const minLimitEtb = Math.round((minUsd || MIN_ORDER_USD) * rate);
    const maxLimitEtb = Math.round((maxUsd || usd) * rate);

    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        seller_id: userId,
        seller_name: username,
        type: type || 'sell',
        amount_eth: usd, // used for USD amount in listings
        custom_rate_etb: rate,
        min_limit_etb: minLimitEtb,
        max_limit_etb: maxLimitEtb,
        payment_methods: paymentMethods || ['Telebirr', 'CBE'],
        payment_accounts: paymentAccounts || [],
        status: 'active',
        description: `P2P ${type.toUpperCase()} order on Telegram Bot. Instant release.`,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, listing };
  } catch (err) {
    console.error('Error creating listing:', err);
    return { success: false, message: err.message || 'Failed to create listing.' };
  }
}

module.exports = {
  getBuyListings,
  getSellListings,
  getListingById,
  initiateTrade,
  getUserTrades,
  getTradeById,
  markPaid,
  releaseEscrow,
  createListing,
};
