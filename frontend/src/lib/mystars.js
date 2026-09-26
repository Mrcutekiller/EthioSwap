/**
 * MyStars Telegram Premium & Stars API Integration
 * Documentation: https://mystars.tg/docs#description/introduction
 */

export const MYSTARS_CONFIG = {
  baseUrl: 'https://api.mystars.tg',
  apiKey: 'faas_2a19ef9912dea131431f9d643fdddd0a9370956e2b9deb5dff4c590191f438e1',
  webhookSecret: 'a516b73beb2e49fca4d438b5cf7d1b0492c770ffc3e1d9e80021af77ff0de4b8',
};

/**
 * Clean telegram username by removing '@' and URL prefixes
 */
export const cleanTelegramUsername = (input) => {
  if (!input) return '';
  let clean = input.trim();
  clean = clean.replace(/^(https?:\/\/)?(t\.me\/|telegram\.me\/)/i, '');
  clean = clean.replace(/^@/, '');
  return clean.split('/')[0].split('?')[0].trim();
};

/**
 * Pre-flight eligibility check: verifies if a Telegram username can receive Premium
 * @param {string} username - Telegram handle without '@'
 * @param {number} months - 3, 6, or 12
 * @param {string} [apiKey] - Optional custom API key
 */
export async function checkRecipientEligibility(username, months = 3, apiKey = MYSTARS_CONFIG.apiKey) {
  const clean = cleanTelegramUsername(username);
  if (!clean) return { eligible: false, message: 'Please enter a valid Telegram username.' };

  try {
    const res = await fetch(`${MYSTARS_CONFIG.baseUrl}/v1/recipients/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        type: 'premium',
        recipient: { username: clean },
        months: Number(months),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        eligible: false,
        message: data?.error?.message || 'Failed to verify recipient eligibility',
        data,
      };
    }

    return {
      eligible: Boolean(data.eligible),
      resolved: Boolean(data.resolved),
      recipientName: data.recipient_name,
      message: data.telegram_message || (data.eligible ? 'Recipient is eligible for Telegram Premium!' : 'User cannot receive Premium at this time.'),
      data,
    };
  } catch (err) {
    return {
      eligible: true, // Non-blocking fallback if check network is restricted
      message: `Eligibility check skipped (${err.message}). Proceeding.`,
      fallback: true,
    };
  }
}

/**
 * Get real-time wholesale pricing quote from MyStars API
 * @param {number} months - 3, 6, or 12
 * @param {string} paymentCurrency - 'usdt_ton' or 'ton'
 * @param {string} [apiKey]
 */
export async function getLivePricing(months = 3, paymentCurrency = 'usdt_ton', apiKey = MYSTARS_CONFIG.apiKey) {
  try {
    const res = await fetch(`${MYSTARS_CONFIG.baseUrl}/v1/pricing?type=premium&months=${months}&payment_currency=${paymentCurrency}`, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('MyStars pricing fetch fallback:', err.message);
    // Standard fallback wholesale costs
    const fallbackAmounts = { 3: 13.44, 6: 17.74, 12: 32.17 };
    return {
      type: 'premium',
      months,
      amount: String(fallbackAmounts[months] || 13.44),
      currency: paymentCurrency,
      fallback: true,
    };
  }
}

/**
 * Create a Telegram Premium fulfillment order via MyStars API
 * @param {Object} params
 * @param {string} params.username - Recipient handle
 * @param {number} params.months - 3, 6, or 12
 * @param {string} [params.paymentCurrency] - 'usdt_ton' or 'ton'
 * @param {string} [params.callbackUrl]
 * @param {string} [params.apiKey]
 */
export async function createTelegramPremiumOrder({
  username,
  months = 3,
  paymentCurrency = 'usdt_ton',
  callbackUrl = null,
  apiKey = MYSTARS_CONFIG.apiKey,
}) {
  const clean = cleanTelegramUsername(username);
  if (!clean) throw new Error('Telegram username is required');

  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `mst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const body = {
    type: 'premium',
    recipient: { username: clean },
    months: Number(months),
    payment_currency: paymentCurrency,
  };
  if (callbackUrl) body.callback_url = callbackUrl;

  const res = await fetch(`${MYSTARS_CONFIG.baseUrl}/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error?.message || data?.message || `MyStars API Error (${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}

/**
 * Query current order status by MyStars order ID
 */
export async function getMyStarsOrderStatus(orderId, apiKey = MYSTARS_CONFIG.apiKey) {
  if (!orderId) throw new Error('Order ID is required');
  const res = await fetch(`${MYSTARS_CONFIG.baseUrl}/v1/orders/${orderId}`, {
    headers: { 'X-Api-Key': apiKey },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
