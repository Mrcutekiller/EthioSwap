const TelegramBot = require('node-telegram-bot-api');
const { BOT_TOKEN, MIN_ORDER_USD, WEB_APP_URL } = require('./config');
const authService = require('./services/authService');
const walletService = require('./services/walletService');
const p2pService = require('./services/p2pService');

// Initialize Telegram Bot with polling
const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
  filepath: false,
});

// Global error handlers so bot never crashes on unhandled errors
process.on('unhandledRejection', (reason) => {
  console.warn('[Handled Promise Rejection]:', reason?.message || reason);
});
process.on('uncaughtException', (error) => {
  console.warn('[Handled Uncaught Exception]:', error?.message || error);
});

// Suppress polling errors gracefully
bot.on('polling_error', (error) => {
  // Common Telegram polling errors: 409 conflict (another instance running) or network drops
  if (error.code === 'ETELEGRAM' && error.message?.includes('409 Conflict')) {
    console.warn('[Telegram Polling]: Another instance was detected polling. Waiting for exclusive connection...');
  } else {
    console.warn('[Telegram Polling Warning]:', error.code || error.message);
  }
});

// Safely wrap sendMessage to prevent 403 Forbidden (bot blocked by user) from crashing the bot
const originalSendMessage = bot.sendMessage.bind(bot);
bot.sendMessage = async function(chatId, text, form = {}) {
  try {
    return await originalSendMessage(chatId, text, form);
  } catch (err) {
    if (err.message && (err.message.includes('blocked by the user') || err.message.includes('chat not found') || err.message.includes('user is deactivated'))) {
      console.warn(`[Bot Notice] User ${chatId} blocked the bot or chat is closed.`);
    } else {
      console.warn(`[Bot Warning] sendMessage to ${chatId} failed:`, err.message);
    }
    return null;
  }
};

const originalAnswerCallbackQuery = bot.answerCallbackQuery.bind(bot);
bot.answerCallbackQuery = async function(...args) {
  try {
    return await originalAnswerCallbackQuery(...args);
  } catch (_) {
    return null;
  }
};

if (bot.setChatMenuButton) {
  const originalSetChatMenuButton = bot.setChatMenuButton.bind(bot);
  bot.setChatMenuButton = async function(...args) {
    try {
      return await originalSetChatMenuButton(...args);
    } catch (_) {
      return null;
    }
  };
}

console.log('🚀 EthioSwap P2P Telegram Bot is starting...');

// Register bot commands for @EthioSwap_bot
bot.setMyCommands([
  { command: 'start',    description: '🚀 Open EthioSwap P2P & Mini App' },
  { command: 'buy',      description: '🛒 Buy $ (USD/USDT) with Telebirr/CBE' },
  { command: 'sell',     description: '💵 Sell $ (USD/USDT) for ETB' },
  { command: 'wallet',   description: '💼 P2P Wallet & Balances' },
  { command: 'orders',   description: '📋 My Active Orders' },
  { command: 'history',  description: '📜 Transaction History' },
  { command: 'escrow',   description: '🔒 Start a Group Escrow Trade' },
  { command: 'dca',      description: '🔄 Set Up Recurring Auto-Buy Order' },
  { command: 'referral', description: '🎁 My Referral Link & Earnings' },
  { command: 'badges',   description: '🏅 My Trader Badges & Credit Score' },
  { command: 'login',    description: '🔐 Log In / Connect Account' },
  { command: 'logout',   description: '🚪 Log Out' },
]).then(() => console.log('✅ Registered commands for @EthioSwap_bot'))
  .catch((err) => console.warn('[Bot Commands Warning]:', err.message));

// ========================================================
// KEYBOARDS & MENUS (INLINE ONLY - REMOVE BOTTOM MENU)
// ========================================================

function getMainMenuKeyboard() {
  // Always remove the persistent bottom keyboard as requested
  return {
    reply_markup: {
      remove_keyboard: true,
    },
  };
}

function getAppInlineKeyboard(user = null, chatId = null) {
  const targetUrl = chatId
    ? (WEB_APP_URL.includes('?') ? `${WEB_APP_URL}&chat_id=${chatId}` : `${WEB_APP_URL}?chat_id=${chatId}`)
    : WEB_APP_URL;

  return {
    inline_keyboard: [
      [
        { text: '⚡ Open EthioSwap App', web_app: { url: targetUrl } },
      ],
      [
        { text: '🛒 Buy USDT', callback_data: 'menu_buy' },
        { text: '💵 Sell USDT', callback_data: 'menu_sell' },
      ],
      [
        { text: '💼 Wallet', callback_data: 'menu_wallet' },
        { text: '📋 Orders', callback_data: 'menu_orders' },
      ],
      [
        { text: '🏅 Badges & Score', callback_data: 'show_badges' },
        { text: user ? '👤 Profile' : '🔐 Login', callback_data: user ? 'menu_profile' : 'action_login' },
      ],
      [
        { text: '🎁 Referral', callback_data: 'show_referral' },
        { text: '🔒 Escrow', callback_data: 'show_escrow_help' },
      ],
    ],
  };
}

function getCancelKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: '✕ Cancel', callback_data: 'menu_start' }]],
    },
  };
}

// ─── Shared brand helpers ───────────────────────────────────────────────────
const DIVIDER     = '─────────────────────';
const DIVIDER_GOLD = '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰';
const BRAND_TAG   = '\n_🇪🇹 EthioSwap · Ethiopia\'s #1 P2P Exchange_';

function creditBar(score = 500) {
  const filled = Math.round(score / 100);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function creditLabel(score = 500) {
  if (score >= 800) return '🟢 Elite';
  if (score >= 650) return '🟡 Good';
  if (score >= 500) return '🟠 Fair';
  return '🔴 Low';
}

function statusEmoji(status) {
  const map = { completed: '✅', paid: '🟡', payment_pending: '🟠', pending: '⏳', cancelled: '❌', disputed: '⚖️', expired: '⏱' };
  return map[status] || '⏳';
}

// ========================================================
// START COMMAND & WELCOME (SUPER FAST & SMOOTH)
// ========================================================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  authService.clearStep(chatId);

  // Fast in-memory user lookup for sub-10ms response
  const session = authService.getSession(chatId);
  let user = session?.user;

  // Background async refresh (never blocks message)
  if (!user) {
    authService.getCurrentUser(chatId).then(u => { user = u; }).catch(() => {});
  }

  // Reset chat menu button to default so no persistent buttons take over
  bot.setChatMenuButton({
    chat_id: chatId,
    menu_button: { type: 'default' },
  }).catch(() => {});

  // ── PREMIUM WELCOME CARD ────────────────────────────────────────────────
  let text;

  if (user) {
    const balUsd   = Number(user.balance_usd || 0).toFixed(2);
    const balEtb   = Number(user.etb_balance || 0).toLocaleString();
    const rep      = user.reputation || 100;
    const trades   = user.trade_count || 0;
    const score    = user.credit_score || 500;
    const scoreBar = creditBar(score);
    const scoreLbl = creditLabel(score);
    const kycBadge = user.kyc_status === 'approved' ? '✅ KYC Verified' : '⏳ Unverified';
    const verified  = user.is_verified_trader ? ' 🏅' : '';

    text =
      `╔═══════════════════════╗\n` +
      `║  🇪🇹  *ETHIOSWAP P2P*  ║\n` +
      `╚═══════════════════════╝\n\n` +
      `👤 *@${user.username}*${verified}  •  ${kycBadge}\n` +
      `${DIVIDER}\n` +
      `💵  Available   \`$${balUsd}\`\n` +
      `🇪🇹  ETB Bal.   \`${balEtb} ETB\`\n` +
      `📦  Trades     \`${trades} completed\`\n` +
      `⭐  Rep.       \`${rep}%\`\n\n` +
      `📊 *Credit Score: ${score}/1000*  ${scoreLbl}\n` +
      `\`${scoreBar}\`\n` +
      `${DIVIDER}\n` +
      `_Tap a button below to trade, check your wallet, or earn badges._`;
  } else {
    text =
      `╔═══════════════════════╗\n` +
      `║  🇪🇹  *ETHIOSWAP P2P*  ║\n` +
      `╚═══════════════════════╝\n\n` +
      `*Ethiopia's most trusted P2P exchange.*\n\n` +
      `🔐 *Secure Escrow* — your money is safe until both parties confirm\n` +
      `📱 *Telebirr & CBE* — instant local payments supported\n` +
      `⚡ *Sub-15min trades* — fastest P2P in Ethiopia\n` +
      `🏅 *Verified traders only* — KYC-protected marketplace\n\n` +
      `${DIVIDER}\n` +
      `_Create a free account at ethioswap.qzz.io or tap Login below._`;
  }

  const initMsg = await bot.sendMessage(chatId, '⚡ _Loading EthioSwap…_', {
    parse_mode: 'Markdown',
    reply_markup: { remove_keyboard: true },
  });

  if (initMsg?.message_id) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: initMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: getAppInlineKeyboard(user, chatId),
    }).catch(async () => {
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: getAppInlineKeyboard(user, chatId) });
    });
  } else {
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: getAppInlineKeyboard(user, chatId) });
  }
});

// ========================================================
// LOGIN WORKFLOW
// ========================================================

bot.onText(/\/login|🔐 Log In to EthioSwap/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);

  if (user) {
    return bot.sendMessage(
      chatId,
      `✅ *Already Logged In*\n` +
      `${DIVIDER}\n` +
      `👤 Account: *@${user.username}*\n` +
      `💵 Balance: \`$${Number(user.balance_usd || 0).toFixed(2)} USD\`\n\n` +
      `_Type /logout to switch accounts._`,
      { parse_mode: 'Markdown', reply_markup: getAppInlineKeyboard(user, chatId) }
    );
  }

  authService.setStep(chatId, 'AWAITING_LOGIN_IDENTIFIER', {});
  await bot.sendMessage(
    chatId,
    `🔐 *Sign In to EthioSwap*\n` +
    `${DIVIDER}\n` +
    `Enter your *email address* or *username*:\n\n` +
    `_Don't have an account? Register free at ethioswap.qzz.io_`,
    { parse_mode: 'Markdown', ...getCancelKeyboard() }
  );
});

bot.onText(/\/logout/, async (msg) => {
  const chatId = msg.chat.id;
  await authService.logout(chatId);
  await bot.sendMessage(
    chatId,
    `👋 *Signed Out*\n` +
    `${DIVIDER}\n` +
    `You've been safely logged out from EthioSwap.\n\n` +
    `Tap /login to sign back in anytime.`,
    { parse_mode: 'Markdown', ...getMainMenuKeyboard(false) }
  );
});

// ========================================================
// P2P WALLET (Deposit & Withdraw)
// ========================================================

bot.onText(/\/wallet|💼 P2P Wallet/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);

  if (!user) {
    return bot.sendMessage(
      chatId,
      `🔒 *Login Required*\n\nPlease log in to access your P2P wallet.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔐 Log In Now', callback_data: 'action_login' }],
          ],
        },
      }
    );
  }

  try {
    const summary = await walletService.getWalletSummary(user.id);
    const totalUsd = summary.totalUsd;
    const portfolioBar = Math.min(10, Math.round(totalUsd / 50)); // 1 bar per $50
    const barStr = '█'.repeat(portfolioBar) + '░'.repeat(10 - portfolioBar);

    const message =
      `💼 *EthioSwap Wallet*\n` +
      `${DIVIDER}\n` +
      `👤 *@${user.username}*  ·  ID \`#${summary.numericId}\`\n\n` +
      `💵  *Available*    \`$${summary.usdAvailable.toFixed(2)} USD\`\n` +
      `🔒  *In Escrow*    \`$${summary.usdEscrow.toFixed(2)} USD\`\n` +
      `🇪🇹  *ETB Balance*  \`${summary.etbBalance.toLocaleString()} ETB\`\n` +
      `⛓   *On-Chain*    \`${summary.ethBalance.toFixed(4)} ETH\`\n\n` +
      `📊 *Portfolio: $${totalUsd.toFixed(2)}*\n` +
      `\`${barStr}\`\n` +
      `${DIVIDER}\n` +
      `🏦 *Deposit Address (TRC20/ERC20):*\n` +
      `\`${summary.depositAddress}\`\n\n` +
      `_On-chain deposits auto-credit. Withdrawals process instantly._`;

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📥 Deposit', callback_data: 'wallet_deposit' },
            { text: '📤 Withdraw', callback_data: 'wallet_withdraw' },
          ],
          [
            { text: '📜 Transactions', callback_data: 'wallet_history' },
            { text: '🔄 Refresh', callback_data: 'wallet_refresh' },
          ],
          [{ text: '⚡ Open App', web_app: { url: `${WEB_APP_URL}&chat_id=${chatId}` } }],
        ],
      },
    });
  } catch (err) {
    await bot.sendMessage(chatId, `⚠️ Wallet error: ${err.message}`);
  }
});

// ========================================================
// BUY $ (LISTINGS & PURCHASE)
// ========================================================

bot.onText(/\/buy|🛒 Buy \$ \(USD\/USDT\)/, async (msg) => {
  const chatId = msg.chat.id;
  await handleShowBuyListings(chatId);
});

async function handleShowBuyListings(chatId) {
  const user = await authService.getCurrentUser(chatId);
  const listings = await p2pService.getBuyListings(user?.id);

  if (!listings || listings.length === 0) {
    return bot.sendMessage(
      chatId,
      `🛒 *P2P Buy Orders*\n\n` +
      `No active sellers currently found in the orderbook.\n\n` +
      `💡 You can also create your own Buy order so sellers can trade with you!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Create Buy Order', callback_data: 'post_ad_buy' }],
            [{ text: '🔄 Refresh Listings', callback_data: 'refresh_buy_listings' }],
          ],
        },
      }
    );
  }

  let text =
    `🛒 *Buy USDT — P2P Orderbook*\n` +
    `${DIVIDER}\n` +
    `Pay with *Telebirr, CBE, Awash, Dashen.*\n` +
    `Min order *$${MIN_ORDER_USD}*  •  100% Escrow protected\n` +
    `${DIVIDER}\n\n`;

  const buttons = [];

  listings.slice(0, 6).forEach((item, index) => {
    const sellerName  = item.seller_name || item.sellerStats?.username || `Seller ${index + 1}`;
    const orders      = item.sellerStats?.trade_count || 0;
    const rep         = item.sellerStats?.reputation || 100;
    const rate        = item.rate || 190.0;
    const min         = item.minUsd || MIN_ORDER_USD;
    const max         = item.maxUsd || 500;
    const verified    = item.sellerStats?.is_verified_trader ? ' ✅' : '';
    const repBar      = '★'.repeat(Math.round(rep / 20)) + '☆'.repeat(5 - Math.round(rep / 20));
    const rankEmoji   = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'][index] || `${index+1}.`;

    text +=
      `${rankEmoji} *${sellerName}*${verified}  •  ${repBar}\n` +
      `   📦 ${orders} trades  ·  ⭐ ${rep}% rep\n` +
      `   💱 \`1 USD = ${rate} ETB\`\n` +
      `   📊 \`$${min} – $${max}\`\n` +
      `   💳 ${Array.isArray(item.payment_methods) ? item.payment_methods.slice(0,3).join(' · ') : 'Telebirr · CBE'}\n\n`;

    buttons.push([{ text: `🛒 Buy from ${sellerName} · ${rate} ETB`, callback_data: `buy_select_${item.id}` }]);
  });

  buttons.push(
    [{ text: '➕ Post a Buy Ad', callback_data: 'post_ad_buy' }, { text: '🔄 Refresh', callback_data: 'refresh_buy_listings' }],
    [{ text: '⚡ Open P2P App', web_app: { url: `${WEB_APP_URL}&chat_id=${chatId}` } }]
  );

  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
}

// ========================================================
// SELL $ (SELL TO BUYERS OR POST SELL AD)
// ========================================================

bot.onText(/\/sell|💵 Sell \$ \(USD\/USDT\)/, async (msg) => {
  const chatId = msg.chat.id;
  await handleShowSellListings(chatId);
});

async function handleShowSellListings(chatId) {
  const user = await authService.getCurrentUser(chatId);
  const listings = await p2pService.getSellListings(user?.id);

  let text =
    `💵 *Sell USDT — Get ETB Instantly*\n` +
    `${DIVIDER}\n` +
    `Sell your USDT to verified buyers below.\n` +
    `Min order *$${MIN_ORDER_USD}*  •  ETB paid direct to your account\n` +
    `${DIVIDER}\n\n`;

  const buttons = [];

  if (listings && listings.length > 0) {
    listings.slice(0, 6).forEach((item, index) => {
      const buyerName = item.seller_name || item.sellerStats?.username || `Buyer ${index + 1}`;
      const orders    = item.sellerStats?.trade_count || 0;
      const rep       = item.sellerStats?.reputation || 100;
      const rate      = item.rate || 186.0;
      const min       = item.minUsd || MIN_ORDER_USD;
      const max       = item.maxUsd || 500;
      const verified  = item.sellerStats?.is_verified_trader ? ' ✅' : '';
      const repBar    = '★'.repeat(Math.round(rep / 20)) + '☆'.repeat(5 - Math.round(rep / 20));
      const rankEmoji = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'][index] || `${index+1}.`;

      text +=
        `${rankEmoji} *${buyerName}*${verified}  •  ${repBar}\n` +
        `   📦 ${orders} trades  ·  ⭐ ${rep}% rep\n` +
        `   💱 \`1 USD = ${rate} ETB\`\n` +
        `   📊 \`$${min} – $${max}\`\n` +
        `   💳 ${Array.isArray(item.payment_methods) ? item.payment_methods.slice(0,3).join(' · ') : 'Telebirr · CBE'}\n\n`;

      buttons.push([{ text: `💵 Sell to ${buyerName} · ${rate} ETB`, callback_data: `sell_select_${item.id}` }]);
    });
  } else {
    text +=
      `📭 *No active buyers right now.*\n\n` +
      `Post your own Sell ad — buyers will come to you!\n\n`;
  }

  buttons.push(
    [{ text: '➕ Post Sell Ad', callback_data: 'post_ad_sell' }, { text: '🔄 Refresh', callback_data: 'refresh_sell_listings' }],
    [{ text: '⚡ Open P2P App', web_app: { url: `${WEB_APP_URL}&chat_id=${chatId}` } }]
  );

  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
}

// ========================================================
// MY ORDERS / TRADES
// ========================================================

bot.onText(/\/orders|📋 My Orders/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);

  if (!user) {
    return bot.sendMessage(chatId, `🔒 Please log in to see your trade orders.`, {
      reply_markup: {
        inline_keyboard: [[{ text: '🔐 Log In', callback_data: 'action_login' }]],
      },
    });
  }

  try {
    const trades = await p2pService.getUserTrades(user.id);

    if (!trades || trades.length === 0) {
      return bot.sendMessage(
        chatId,
        `📋 *My Orders*\n${DIVIDER}\n\n📭 No trade orders yet.\n\n_Browse the orderbook below to start your first trade!_`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Buy USDT', callback_data: 'menu_buy' }, { text: '💵 Sell USDT', callback_data: 'menu_sell' }],
              [{ text: '⚡ Open P2P App', web_app: { url: `${WEB_APP_URL}&chat_id=${chatId}` } }],
            ],
          },
        }
      );
    }

    let text = `📋 *My Trade Orders*\n${DIVIDER}\n\n`;
    const buttons = [];

    trades.slice(0, 8).forEach((t) => {
      const isBuyer    = t.buyer_id === user.id;
      const role       = isBuyer ? '🟢 BUY ' : '🔴 SELL';
      const sIcon      = statusEmoji(t.status);
      const amtUsd     = Number(t.amount_usd || 0).toFixed(2);
      const amtEtb     = Number(t.amount_etb || 0).toLocaleString();
      const dateStr    = new Date(t.created_at).toLocaleDateString('en-ET', { day:'2-digit', month:'short' });

      text +=
        `${role} *#${t.id.slice(0, 8)}*  ${sIcon} ${t.status.toUpperCase()}\n` +
        `   💵 \`$${amtUsd}\`  🇪🇹 \`${amtEtb} ETB\`\n` +
        `   📅 ${dateStr}  ·  ${t.payment_method || 'Telebirr/CBE'}\n\n`;

      buttons.push([{ text: `${sIcon} #${t.id.slice(0, 8)} · $${amtUsd} · ${t.status}`, callback_data: `trade_view_${t.id}` }]);
    });

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (err) {
    await bot.sendMessage(chatId, `⚠️ Error loading orders: ${err.message}`);
  }
});

// ========================================================
// POST AD / CREATE LISTING
// ========================================================

bot.onText(/➕ Post P2P Ad/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);

  if (!user) {
    return bot.sendMessage(chatId, `🔒 Please log in before creating a P2P listing.`, {
      reply_markup: {
        inline_keyboard: [[{ text: '🔐 Log In', callback_data: 'action_login' }]],
      },
    });
  }

  await bot.sendMessage(
    chatId,
    `➕ *Create a New P2P Listing*\n\n` +
    `What type of listing would you like to post?`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 I Want to Sell $ (Receive ETB)', callback_data: 'post_ad_sell' }],
          [{ text: '🛒 I Want to Buy $ (Pay ETB)', callback_data: 'post_ad_buy' }],
        ],
      },
    }
  );
});

// ========================================================
// ACCOUNT & PROFILE
// ========================================================

bot.onText(/👤 Account & Profile/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);

  if (!user) {
    return bot.sendMessage(chatId, `🔒 You are not logged in.`, {
      reply_markup: {
        inline_keyboard: [[{ text: '🔐 Log In', callback_data: 'action_login' }]],
      },
    });
  }

  const score    = user.credit_score || 500;
  const scoreBar = creditBar(score);
  const scoreLbl = creditLabel(score);
  const verified = user.is_verified_trader ? '✅ Verified Trader' : '⬜ Standard Trader';
  const kycStr   = user.kyc_status === 'approved' ? '✅ Approved' : `⏳ ${user.kyc_status || 'None'}`;
  const vol      = Number(user.total_volume || 0).toFixed(2);

  const text =
    `👤 *@${user.username}*  •  \`#${user.numeric_id || 'N/A'}\`\n` +
    `${DIVIDER}\n` +
    `🛡  ${verified}\n` +
    `🔐  KYC: ${kycStr}\n` +
    `📧  \`${user.email || 'N/A'}\`\n\n` +
    `📦  Trades     \`${user.trade_count || 0}\`\n` +
    `💰  Volume     \`$${vol}\`\n` +
    `⭐  Reputation  \`${user.reputation || 100}%\`\n` +
    `💵  USD Bal.   \`$${Number(user.balance_usd || 0).toFixed(2)}\`\n` +
    `🇪🇹  ETB Bal.   \`${Number(user.etb_balance || 0).toLocaleString()} ETB\`\n\n` +
    `📊 *Credit Score: ${score}/1000*  ${scoreLbl}\n` +
    `\`${scoreBar}\`\n` +
    `${DIVIDER}`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💼 Wallet', callback_data: 'menu_wallet' }, { text: '📋 Orders', callback_data: 'menu_orders' }],
        [{ text: '🏅 Badges', callback_data: 'show_badges' }, { text: '🎁 Referral', callback_data: 'show_referral' }],
        [{ text: '🚪 Log Out', callback_data: 'action_logout' }],
      ],
    },
  });
});

// ========================================================
// PLATFORM INFO & POLICY
// ========================================================

bot.onText(/ℹ️ Platform Info & Policy|ℹ️ Exchange Rates & Info|^\/info$/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
    `ℹ️ *EthioSwap — Platform Info*\n` +
    `${DIVIDER}\n` +
    `🛡  *Escrow*       100% Guaranteed\n` +
    `⚡  *Min Order*    \`$5.00 USD\`\n` +
    `🔗  *Networks*     TRC20 · ERC20 · BSC\n` +
    `⏱  *Trade Time*   < 15 minutes avg\n\n` +
    `🏦 *Payment Methods*\n` +
    `   📱 Telebirr — instant mobile\n` +
    `   🏛 CBE — Commercial Bank of Ethiopia\n` +
    `   🏦 Awash · Dashen · BOA\n` +
    `   ⛓ USDT On-chain (TRC20 / ERC20)\n\n` +
    `📜 *Policies*\n` +
    `   • All traders must complete KYC\n` +
    `   • Funds locked in escrow until both confirm\n` +
    `   • Disputes resolved by admin within 24h\n` +
    `${DIVIDER}\n` +
    `_🌐 ethioswap.qzz.io_`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 Buy USDT', callback_data: 'menu_buy' }, { text: '💵 Sell USDT', callback_data: 'menu_sell' }],
        [{ text: '⚡ Open App', web_app: { url: `${WEB_APP_URL}&chat_id=${msg.chat.id}` } }],
      ],
    },
  });
});

// ========================================================
// CALLBACK QUERY HANDLERS (Inline Buttons)
// ========================================================

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Answer callback immediately to dismiss loading spinner
  await bot.answerCallbackQuery(query.id).catch(() => {});

  // 1. Navigation shortcuts
  if (data === 'action_login') {
    authService.setStep(chatId, 'AWAITING_LOGIN_IDENTIFIER', {});
    return bot.sendMessage(
      chatId,
      `🔐 *Sign In to EthioSwap*\n${DIVIDER}\nEnter your *email* or *username*:`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  if (data === 'action_logout') {
    await authService.logout(chatId);
    return bot.sendMessage(chatId,
      `👋 *Signed Out*\n${DIVIDER}\nSee you next time! Tap /start to come back.`,
      { parse_mode: 'Markdown', ...getMainMenuKeyboard(false) }
    );
  }

  if (data === 'menu_buy' || data === 'refresh_buy_listings') {
    return handleShowBuyListings(chatId);
  }

  if (data === 'menu_sell' || data === 'refresh_sell_listings') {
    return handleShowSellListings(chatId);
  }

  if (data === 'menu_wallet' || data === 'wallet_refresh') {
    const user = await authService.getCurrentUser(chatId);
    if (!user) return bot.sendMessage(chatId, `🔒 *Login required.* Type /login.`, { parse_mode: 'Markdown' });
    await authService.refreshUserProfile(chatId);
    return bot.sendMessage(chatId,
      `🔄 *Balance refreshed!*\n${DIVIDER}\nType /wallet to view your updated balances.`,
      { parse_mode: 'Markdown' }
    );
  }

  if (data === 'menu_start') {
    const user = await authService.getCurrentUser(chatId);
    const balStr = user ? `\n💵 \`$${Number(user.balance_usd||0).toFixed(2)}\` · @${user.username}` : '';
    return bot.sendMessage(chatId,
      `🇪🇹 *EthioSwap P2P*${balStr}\n${DIVIDER}\n_Choose an action below:_`,
      { parse_mode: 'Markdown', reply_markup: getAppInlineKeyboard(user, chatId) }
    );
  }

  // New callback shortcuts for new commands
  if (data === 'show_badges') {
    return bot.sendMessage(chatId, `🏅 Type /badges to see your credit score and earned badges.`, { parse_mode: 'Markdown' });
  }
  if (data === 'show_referral') {
    return bot.sendMessage(chatId, `🎁 Type /referral to get your referral link and see your earnings.`, { parse_mode: 'Markdown' });
  }
  if (data === 'show_escrow_help') {
    return bot.sendMessage(chatId,
      `🔒 *Group Escrow*\n${DIVIDER}\nUse EthioSwap escrow in any Telegram group!\n\n*Usage:*\n\`/escrow 50 @counterpart Description\`\n\n_Works in groups — both parties need EthioSwap accounts._`,
      { parse_mode: 'Markdown' }
    );
  }

  if (data === 'menu_orders') {
    const user = await authService.getCurrentUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, `🔒 Please log in to view your orders.`, {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Log In', callback_data: 'action_login' }]],
        },
      });
    }

    const trades = await p2pService.getUserTrades(user.id);
    if (!trades || trades.length === 0) {
      return bot.sendMessage(
        chatId,
        `📋 *My Orders*\n\nYou have no active or past P2P orders yet.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Open P2P App', web_app: { url: `${WEB_APP_URL}&chat_id=${chatId}` } }],
              [{ text: '🛒 Browse Buy Orders', callback_data: 'menu_buy' }],
              [{ text: '💵 Browse Sell Orders', callback_data: 'menu_sell' }],
            ],
          },
        }
      );
    }

    let text = `📋 *Your P2P Orders*\n\n`;
    const buttons = [];
    trades.slice(0, 5).forEach((t) => {
      const isBuyer = t.buyer_id === user.id;
      const statusIcon = t.status === 'completed' ? '✅' : t.status === 'paid' ? '⏳' : t.status === 'cancelled' ? '❌' : '⏱';
      text += `${isBuyer ? '🟢 BUY' : '🔴 SELL'} *#${t.id.slice(0, 8)}* — $${Number(t.amount_usd).toFixed(2)} (${Number(t.amount_etb).toLocaleString()} ETB)\n` +
        `Status: ${statusIcon} *${t.status.toUpperCase()}* | ${new Date(t.created_at).toLocaleDateString()}\n\n`;

      buttons.push([
        { text: `🔍 View Order #${t.id.slice(0, 8)} (${t.status})`, callback_data: `trade_view_${t.id}` },
      ]);
    });

    buttons.push([
      { text: '🚀 Open Orders in P2P App', web_app: { url: `${WEB_APP_URL}&chat_id=${chatId}` } },
      { text: '◀️ Main Menu', callback_data: 'menu_start' },
    ]);

    return bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  }

  if (data === 'menu_history') {
    const user = await authService.getCurrentUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, `🔒 Please log in to view your history.`, {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Log In', callback_data: 'action_login' }]],
        },
      });
    }

    const txs = await walletService.getRecentTransactions(user.id);
    let histText = `📜 *Transaction History (Recent Activity)*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (!txs || txs.length === 0) {
      histText += `No transactions recorded yet.\n\n`;
    } else {
      txs.slice(0, 6).forEach((tx) => {
        const typeIcon = tx.type === 'deposit' ? '📥' : tx.type === 'withdraw' ? '📤' : '🔄';
        histText += `${typeIcon} *${(tx.type || 'TX').toUpperCase()}* — $${Number(tx.amount_usd || 0).toFixed(2)} USD\n` +
          `Status: \`${tx.status || 'completed'}\` | ${new Date(tx.created_at).toLocaleDateString()}\n\n`;
      });
    }

    return bot.sendMessage(chatId, histText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Open Full History in P2P App', web_app: { url: `${WEB_APP_URL}&chat_id=${chatId}` } }],
          [{ text: '◀️ Main Menu', callback_data: 'menu_start' }],
        ],
      },
    });
  }

  if (data === 'menu_profile') {
    const user = await authService.getCurrentUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, `🔒 Please log in first.`, {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Log In', callback_data: 'action_login' }]],
        },
      });
    }

    const profText =
      `👤 *EthioSwap Profile*\n━━━━━━━━━━━━━━━━━━━━\n` +
      `🏷 *Username:* @${user.username || 'Trader'}\n` +
      `📧 *Email:* \`${user.email || 'N/A'}\`\n` +
      `💵 *P2P Balance:* \`$${Number(user.balance_usd || 0).toFixed(2)} USD\`\n` +
      `⭐ *Reputation:* ${user.reputation || 100}% Positive\n` +
      `📍 *Deposit Address:*\n\`${user.eth_address || '0x8b321aF28741e9766dB5E9F90a0715D2c5D5eFE6'}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    return bot.sendMessage(chatId, profText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Open EthioSwap P2P App', web_app: { url: `${WEB_APP_URL}&chat_id=${chatId}` } }],
          [{ text: '💼 P2P Wallet', callback_data: 'menu_wallet' }, { text: '📋 My Orders', callback_data: 'menu_orders' }],
          [{ text: '🚪 Log Out', callback_data: 'action_logout' }, { text: '◀️ Main Menu', callback_data: 'menu_start' }],
        ],
      },
    });
  }

  // 2. Wallet Actions: Deposit
  if (data === 'wallet_deposit') {
    const user = await authService.getCurrentUser(chatId);
    if (!user) return bot.sendMessage(chatId, `🔒 Please log in first.`);

    const depositInfo = await walletService.getDepositInfo(user.id);

    const depText =
      `📥 *Automatic On-Chain Deposit*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Send funds to your personal deposit address below:\n\n` +
      `📍 *Your Deposit Address:*\n\`${depositInfo.depositAddress}\`\n\n` +
      `🌐 *Networks Supported:*\n` +
      depositInfo.supportedNetworks.map(n => `• ${n.name} (Min: ${n.minDeposit})`).join('\n') +
      `\n\n` +
      depositInfo.instructions.join('\n') +
      `\n━━━━━━━━━━━━━━━━━━━━`;

    return bot.sendMessage(chatId, depText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 I Sent Crypto — Submit Tx Hash', callback_data: 'wallet_submit_txhash' }],
          [{ text: '◀️ Back to Wallet', callback_data: 'wallet_refresh' }],
        ],
      },
    });
  }

  // Submit tx hash for deposit
  if (data === 'wallet_submit_txhash') {
    authService.setStep(chatId, 'AWAITING_DEPOSIT_HASH', {});
    return bot.sendMessage(
      chatId,
      `📥 *Submit Transaction Hash*\n\n` +
      `Please paste your blockchain transaction hash (TxID) to trigger automatic verification:`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // 3. Wallet Actions: Withdraw
  if (data === 'wallet_withdraw') {
    const user = await authService.getCurrentUser(chatId);
    if (!user) return bot.sendMessage(chatId, `🔒 Please log in first.`);

    authService.setStep(chatId, 'AWAITING_WITHDRAW_AMOUNT', {});
    return bot.sendMessage(
      chatId,
      `📤 *Withdraw Funds*\n\n` +
      `Available balance: *$${Number(user.balance_usd || 0).toFixed(2)} USD*\n` +
      `Minimum withdrawal: *$5.00 USD*\n\n` +
      `Please enter the amount in USD you want to withdraw:`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // 4. Wallet History
  if (data === 'wallet_history') {
    const user = await authService.getCurrentUser(chatId);
    if (!user) return bot.sendMessage(chatId, `🔒 Please log in.`);

    const txs = await walletService.getRecentTransactions(user.id);
    if (!txs || txs.length === 0) {
      return bot.sendMessage(chatId, `📜 No recent transaction history found.`);
    }

    let histText = `📜 *Recent Wallet Transactions:*\n\n`;
    txs.forEach((tx) => {
      const typeIcon = tx.type === 'deposit' ? '📥' : '📤';
      histText += `${typeIcon} *${tx.type.toUpperCase()}* — $${Number(tx.amount_usd || 0).toFixed(2)}\n` +
        `Status: \`${tx.status}\` | ${new Date(tx.created_at).toLocaleDateString()}\n` +
        `${tx.note ? `Note: _${tx.note}_\n` : ''}\n`;
    });

    return bot.sendMessage(chatId, histText, { parse_mode: 'Markdown' });
  }

  // 5. Selecting a Buy Listing
  if (data.startsWith('buy_select_')) {
    const listingId = data.replace('buy_select_', '');
    const user = await authService.getCurrentUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, `🔒 Please log in before placing an order.`, {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Log In', callback_data: 'action_login' }]],
        },
      });
    }

    const listing = await p2pService.getListingById(listingId);
    if (!listing) {
      return bot.sendMessage(chatId, `⚠️ This listing is no longer available.`);
    }

    authService.setStep(chatId, 'AWAITING_BUY_AMOUNT', { listingId, listing });

    return bot.sendMessage(
      chatId,
      `🛒 *Buy $ from @${listing.seller_name || 'Seller'}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Price:* 1 USD = *${listing.rate} ETB*\n` +
      `📊 *Order Limits:* $${listing.minUsd} - $${listing.maxUsd} USD\n` +
      `💳 *Accepted Payment:* ${Array.isArray(listing.payment_methods) ? listing.payment_methods.join(', ') : 'Telebirr / CBE'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👉 *How many dollars ($) do you want to buy?* (Min: $${MIN_ORDER_USD}):`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // 6. Selecting a Sell Listing
  if (data.startsWith('sell_select_')) {
    const listingId = data.replace('sell_select_', '');
    const user = await authService.getCurrentUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, `🔒 Please log in before selling.`, {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Log In', callback_data: 'action_login' }]],
        },
      });
    }

    const listing = await p2pService.getListingById(listingId);
    if (!listing) {
      return bot.sendMessage(chatId, `⚠️ This listing is no longer available.`);
    }

    authService.setStep(chatId, 'AWAITING_SELL_AMOUNT', { listingId, listing });

    return bot.sendMessage(
      chatId,
      `💵 *Sell $ to @${listing.seller_name || 'Buyer'}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Rate:* 1 USD = *${listing.rate} ETB*\n` +
      `📊 *Limits:* $${listing.minUsd} - $${listing.maxUsd} USD\n` +
      `💰 *Your Balance:* $${Number(user.balance_usd || 0).toFixed(2)} USD\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👉 *How many dollars ($) do you want to sell?* (Min: $${MIN_ORDER_USD}):`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // 7. Post Ad (Sell or Buy)
  if (data === 'post_ad_sell' || data === 'post_ad_buy') {
    const user = await authService.getCurrentUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, `🔒 Please log in to post a listing.`, {
        reply_markup: {
          inline_keyboard: [[{ text: '🔐 Log In', callback_data: 'action_login' }]],
        },
      });
    }

    const type = data === 'post_ad_sell' ? 'sell' : 'buy';
    authService.setStep(chatId, 'AWAITING_POST_AD_AMOUNT', { type });

    return bot.sendMessage(
      chatId,
      `➕ *Post ${type.toUpperCase()} Ad*\n\n` +
      `How many dollars ($) do you want to ${type}? (e.g. 50):`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // 8. View specific trade
  if (data.startsWith('trade_view_')) {
    const tradeId = data.replace('trade_view_', '');
    const user = await authService.getCurrentUser(chatId);
    if (!user) return;

    const trade = await p2pService.getTradeById(tradeId);
    if (!trade) return bot.sendMessage(chatId, `⚠️ Trade #${tradeId.slice(0, 8)} not found.`);

    const isBuyer = trade.buyer_id === user.id;
    const isSeller = trade.seller_id === user.id;

    let tradeMsg =
      `📋 *P2P Trade Order #${trade.id.slice(0, 8)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Amount:* \`$${Number(trade.amount_usd).toFixed(2)} USD\`\n` +
      `🇪🇹 *Total in Birr:* \`${Number(trade.amount_etb).toLocaleString()} ETB\`\n` +
      `📊 *Exchange Rate:* \`1 USD = ${trade.rate} ETB\`\n` +
      `📌 *Status:* *${trade.status.toUpperCase()}*\n` +
      `💳 *Payment Method:* ${trade.payment_method || 'Telebirr/CBE'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n`;

    const buttons = [];

    if (isBuyer) {
      tradeMsg += `👤 *Seller:* @${trade.seller?.username || 'Trader'}\n`;
      if (trade.status === 'payment_pending') {
        tradeMsg += `\n⚠️ *Action Required:* Please transfer *${Number(trade.amount_etb).toLocaleString()} ETB* to the seller, then tap "I Have Paid" below!`;
        buttons.push([{ text: '✅ I Have Paid', callback_data: `trade_mark_paid_${trade.id}` }]);
      } else if (trade.status === 'paid') {
        tradeMsg += `\n⏳ Payment marked as sent. Waiting for seller to release escrow.`;
      } else if (trade.status === 'completed') {
        tradeMsg += `\n🎉 Trade completed! $${trade.amount_usd} was added to your wallet.`;
      }
    } else if (isSeller) {
      tradeMsg += `👤 *Buyer:* @${trade.buyer?.username || 'Trader'}\n`;
      if (trade.status === 'paid') {
        tradeMsg += `\n⚠️ *Buyer reported payment sent!* Please check your Telebirr / CBE account and tap "Release Escrow" below:`;
        buttons.push([{ text: '🔓 Release Escrow to Buyer', callback_data: `trade_release_${trade.id}` }]);
      } else if (trade.status === 'completed') {
        tradeMsg += `\n🎉 Trade completed! Escrow released.`;
      }
    }

    buttons.push([{ text: '◀️ Back to Orders', callback_data: 'menu_orders' }]);

    return bot.sendMessage(chatId, tradeMsg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  }

  // 9. Trade Actions: Mark Paid
  if (data.startsWith('trade_mark_paid_')) {
    const tradeId = data.replace('trade_mark_paid_', '');
    const user = await authService.getCurrentUser(chatId);
    if (!user) return;

    const res = await p2pService.markPaid(tradeId, user.id);
    if (res.success) {
      await bot.sendMessage(
        chatId,
        `✅ *Payment Confirmed!*\n\nThe seller has been notified to verify your payment and release the $ into your wallet.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await bot.sendMessage(chatId, `⚠️ ${res.message}`);
    }
  }

  // 10. Trade Actions: Release Escrow
  if (data.startsWith('trade_release_')) {
    const tradeId = data.replace('trade_release_', '');
    const user = await authService.getCurrentUser(chatId);
    if (!user) return;

    const res = await p2pService.releaseEscrow(tradeId, user.id);
    if (res.success) {
      await bot.sendMessage(
        chatId,
        `🎉 *Escrow Released Successfully!*\n\nThe funds have been transferred to the buyer. Order completed!`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await bot.sendMessage(chatId, `⚠️ ${res.message}`);
    }
  }
});

// ========================================================
// TEXT MESSAGE ROUTER & CONVERSATION STATE MACHINE
// ========================================================

bot.on('message', async (msg) => {
  if (!msg.text) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // If user clicked cancel
  if (text === '❌ Cancel' || text === '/cancel') {
    authService.clearStep(chatId);
    const user = await authService.getCurrentUser(chatId);
    return bot.sendMessage(chatId, `Action cancelled.`, {
      ...getMainMenuKeyboard(Boolean(user)),
    });
  }

  // Skip command prefixes already handled by onText
  if (text.startsWith('/') ||
      text.includes('Buy $') ||
      text.includes('Sell $') ||
      text.includes('P2P Wallet') ||
      text.includes('My Orders') ||
      text.includes('Post P2P Ad') ||
      text.includes('Account & Profile') ||
      text.includes('Log In') ||
      text.includes('Exchange Rates')) {
    return;
  }

  const session = authService.getSession(chatId);
  const step = session?.step;
  const tempState = session?.tempState || {};

  // ── STEP: LOGIN (Email / Username) ──────────────────
  if (step === 'AWAITING_LOGIN_IDENTIFIER') {
    authService.setStep(chatId, 'AWAITING_LOGIN_PASSWORD', { identifier: text });
    return bot.sendMessage(
      chatId,
      `🔑 Got it. Now please enter your *Password*:\n\n_(Your password is sent securely directly to Supabase authentication)_`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // ── STEP: LOGIN (Password) ──────────────────────────
  if (step === 'AWAITING_LOGIN_PASSWORD') {
    const identifier = tempState.identifier;
    const password = text;

    await bot.sendMessage(chatId, `🔄 Verifying credentials with EthioSwap...`);

    const result = await authService.login(chatId, identifier, password);

    if (result.success) {
      const u = result.user;
      return bot.sendMessage(
        chatId,
        `🎉 *Welcome back, @${u.username}!* ✅\n\n` +
        `Your Telegram account is now linked with EthioSwap.\n` +
        `💵 Balance: *$${Number(u.balance_usd || 0).toFixed(2)} USD* (${Number(u.etb_balance || 0).toLocaleString()} ETB)\n` +
        `📦 Trades: *${u.trade_count || 0} completed*\n\n` +
        `You can now buy, sell, deposit, and withdraw!`,
        {
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard(true),
        }
      );
    } else {
      authService.clearStep(chatId);
      return bot.sendMessage(
        chatId,
        `❌ *Login Failed:*\n${result.message}\n\nTap /login to try again.`,
        {
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard(false),
        }
      );
    }
  }

  // ── STEP: BUY AMOUNT INPUT ──────────────────────────
  if (step === 'AWAITING_BUY_AMOUNT') {
    const amountUsd = parseFloat(text);
    if (isNaN(amountUsd) || amountUsd < MIN_ORDER_USD) {
      return bot.sendMessage(
        chatId,
        `⚠️ Invalid amount. Minimum purchase is *$${MIN_ORDER_USD} USD*. Please enter a valid number:`,
        { parse_mode: 'Markdown' }
      );
    }

    const { listing, listingId } = tempState;
    const rate = listing?.rate || 190.0;
    const totalEtb = (amountUsd * rate).toFixed(2);

    authService.setStep(chatId, 'CONFIRM_BUY_ORDER', {
      listingId,
      listing,
      amountUsd,
      totalEtb,
    });

    return bot.sendMessage(
      chatId,
      `📋 *Order Confirmation*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🛒 *Buying:* \`$${amountUsd.toFixed(2)} USD\`\n` +
      `👤 *Seller:* @${listing?.seller_name || 'Seller'}\n` +
      `💵 *Rate:* 1 USD = ${rate} ETB\n` +
      `💰 *You Will Pay:* \`${totalEtb} ETB\`\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Type *CONFIRM* or *YES* to place this trade and lock seller escrow:`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // ── STEP: CONFIRM BUY ORDER ─────────────────────────
  if (step === 'CONFIRM_BUY_ORDER') {
    if (text.toUpperCase() !== 'CONFIRM' && text.toUpperCase() !== 'YES') {
      authService.clearStep(chatId);
      return bot.sendMessage(chatId, `Order cancelled.`, {
        ...getMainMenuKeyboard(true),
      });
    }

    const user = await authService.getCurrentUser(chatId);
    const { listing, listingId, amountUsd } = tempState;

    await bot.sendMessage(chatId, `⏳ Placing trade order with escrow...`);

    const result = await p2pService.initiateTrade({
      buyerId: user.id,
      sellerId: listing.seller_id,
      listingId,
      amountUsd,
      paymentMethod: Array.isArray(listing.payment_methods) ? listing.payment_methods[0] : 'Telebirr',
    });

    authService.clearStep(chatId);

    if (result.success) {
      const trade = result.trade;
      const orderText =
        `🎉 *Trade Order Created Successfully!* (#${trade.id.slice(0, 8)})\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💵 *Amount to Receive:* \`$${amountUsd.toFixed(2)} USD\`\n` +
        `🇪🇹 *Amount to Pay:* \`${result.amountEtb} ETB\`\n` +
        `👤 *Seller:* @${listing.seller_name || 'Seller'}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📍 *Payment Instructions:*\n` +
        `1. Send *${result.amountEtb} ETB* via Telebirr or CBE to the seller.\n` +
        `2. Tap the button below as soon as you complete the transfer!`;

      return bot.sendMessage(chatId, orderText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ I Have Paid (Notify Seller)', callback_data: `trade_mark_paid_${trade.id}` }],
            [{ text: '🔍 View Order Details', callback_data: `trade_view_${trade.id}` }],
          ],
        },
      });
    } else {
      return bot.sendMessage(chatId, `❌ Could not place trade: ${result.message}`, {
        ...getMainMenuKeyboard(true),
      });
    }
  }

  // ── STEP: SELL AMOUNT INPUT ─────────────────────────
  if (step === 'AWAITING_SELL_AMOUNT') {
    const amountUsd = parseFloat(text);
    if (isNaN(amountUsd) || amountUsd < MIN_ORDER_USD) {
      return bot.sendMessage(
        chatId,
        `⚠️ Invalid amount. Minimum order is *$${MIN_ORDER_USD} USD*. Please enter a number:`,
        { parse_mode: 'Markdown' }
      );
    }

    const user = await authService.getCurrentUser(chatId);
    if (Number(user.balance_usd || 0) < amountUsd) {
      return bot.sendMessage(
        chatId,
        `⚠️ Insufficient balance. You have *$${Number(user.balance_usd || 0).toFixed(2)} USD* available in your P2P wallet.`,
        { parse_mode: 'Markdown' }
      );
    }

    const { listing, listingId } = tempState;
    authService.setStep(chatId, 'AWAITING_SELL_PAYMENT_DETAILS', {
      listing,
      listingId,
      amountUsd,
    });

    return bot.sendMessage(
      chatId,
      `💳 *Where should the buyer send your ETB?*\n\n` +
      `Please enter your *Telebirr Phone Number* or *CBE Account Number* (with your full name):`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // ── STEP: SELL RECEIVING DETAILS ───────────────────
  if (step === 'AWAITING_SELL_PAYMENT_DETAILS') {
    const paymentDetails = text;
    const { listing, listingId, amountUsd } = tempState;
    const rate = listing?.rate || 186.0;
    const totalEtb = (amountUsd * rate).toFixed(2);
    const user = await authService.getCurrentUser(chatId);

    await bot.sendMessage(chatId, `⏳ Creating trade order...`);

    const result = await p2pService.initiateTrade({
      buyerId: listing.seller_id,
      sellerId: user.id,
      listingId,
      amountUsd,
      paymentMethod: `Telebirr/CBE: ${paymentDetails}`,
    });

    authService.clearStep(chatId);

    if (result.success) {
      return bot.sendMessage(
        chatId,
        `🎉 *Sell Order Opened!* (#${result.trade.id.slice(0, 8)})\n\n` +
        `💵 *Amount Sold:* $${amountUsd.toFixed(2)} USD\n` +
        `🇪🇹 *You Will Receive:* ${totalEtb} ETB\n` +
        `👤 *Buyer:* @${listing.seller_name || 'Buyer'}\n\n` +
        `Buyer has been instructed to send ETB to your account. You will receive an alert when payment is made.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔍 View Order', callback_data: `trade_view_${result.trade.id}` }],
            ],
          },
        }
      );
    } else {
      return bot.sendMessage(chatId, `❌ Failed to open sell trade: ${result.message}`);
    }
  }

  // ── STEP: POST AD AMOUNT ────────────────────────────
  if (step === 'AWAITING_POST_AD_AMOUNT') {
    const amountUsd = parseFloat(text);
    if (isNaN(amountUsd) || amountUsd < MIN_ORDER_USD) {
      return bot.sendMessage(
        chatId,
        `⚠️ Minimum amount is $${MIN_ORDER_USD}. Please enter a valid amount:`,
        { parse_mode: 'Markdown' }
      );
    }

    const { type } = tempState;
    const defaultRate = type === 'sell' ? 190.0 : 186.0;

    authService.setStep(chatId, 'AWAITING_POST_AD_RATE', { type, amountUsd, defaultRate });

    return bot.sendMessage(
      chatId,
      `💵 *Exchange Rate (ETB per Dollar)*\n\n` +
      `Recommended rate is *${defaultRate} ETB*.\n` +
      `Please enter your custom rate in ETB (or type "default" to use ${defaultRate}):`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // ── STEP: POST AD RATE ──────────────────────────────
  if (step === 'AWAITING_POST_AD_RATE') {
    const { type, amountUsd, defaultRate } = tempState;
    let rate = defaultRate;
    if (text.toLowerCase() !== 'default') {
      const parsedRate = parseFloat(text);
      if (!isNaN(parsedRate) && parsedRate > 50 && parsedRate < 500) {
        rate = parsedRate;
      }
    }

    const user = await authService.getCurrentUser(chatId);

    await bot.sendMessage(chatId, `⏳ Publishing your listing...`);

    const result = await p2pService.createListing({
      userId: user.id,
      username: user.username,
      type,
      amountUsd,
      rateEtb: rate,
      minUsd: MIN_ORDER_USD,
      maxUsd: amountUsd,
      paymentMethods: ['Telebirr', 'CBE'],
    });

    authService.clearStep(chatId);

    if (result.success) {
      return bot.sendMessage(
        chatId,
        `✅ *Listing Created Successfully!*\n\n` +
        `Type: *${type.toUpperCase()} $*\n` +
        `Amount: *$${amountUsd} USD*\n` +
        `Rate: *1 USD = ${rate} ETB*\n` +
        `Limits: *$${MIN_ORDER_USD} - $${amountUsd} USD*\n\n` +
        `Other traders on the website and Telegram bot can now place orders from your listing!`,
        {
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard(true),
        }
      );
    } else {
      return bot.sendMessage(chatId, `❌ Failed to create listing: ${result.message}`, {
        ...getMainMenuKeyboard(true),
      });
    }
  }

  // ── STEP: DEPOSIT TX HASH ───────────────────────────
  if (step === 'AWAITING_DEPOSIT_HASH') {
    const txHash = text.trim();
    const user = await authService.getCurrentUser(chatId);

    await bot.sendMessage(chatId, `🔍 Registering on-chain transaction for verification...`);

    const result = await walletService.submitDepositHash(user.id, txHash);
    authService.clearStep(chatId);

    if (result.success) {
      return bot.sendMessage(
        chatId,
        `✅ *Deposit Registered!*\n\n` +
        `Tx Hash: \`${txHash}\`\n\n` +
        `The blockchain listener will automatically credit your P2P balance once confirmed.`,
        {
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard(true),
        }
      );
    } else {
      return bot.sendMessage(chatId, `⚠️ ${result.message}`, {
        ...getMainMenuKeyboard(true),
      });
    }
  }

  // ── STEP: WITHDRAW AMOUNT ───────────────────────────
  if (step === 'AWAITING_WITHDRAW_AMOUNT') {
    const amountUsd = parseFloat(text);
    if (isNaN(amountUsd) || amountUsd < 5) {
      return bot.sendMessage(chatId, `⚠️ Minimum withdrawal is $5.00 USD. Please enter a valid number:`);
    }

    authService.setStep(chatId, 'AWAITING_WITHDRAW_ADDRESS', { amountUsd });
    return bot.sendMessage(
      chatId,
      `📍 *Destination Address / Account*\n\n` +
      `Enter your *USDT wallet address* (TRC20 / ERC20) or your Telebirr / Bank account for cashout:`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  // ── STEP: WITHDRAW ADDRESS ──────────────────────────
  if (step === 'AWAITING_WITHDRAW_ADDRESS') {
    const destination = text.trim();
    const { amountUsd } = tempState;
    const user = await authService.getCurrentUser(chatId);

    await bot.sendMessage(chatId, `⏳ Processing withdrawal request...`);

    const result = await walletService.requestWithdrawal(user.id, amountUsd, destination);
    authService.clearStep(chatId);

    if (result.success) {
      return bot.sendMessage(
        chatId,
        `✅ *Withdrawal Request Submitted!*\n\n` +
        `Amount: *$${amountUsd.toFixed(2)} USD*\n` +
        `Destination: \`${destination}\`\n` +
        `Remaining Balance: *$${result.newBalance.toFixed(2)} USD*\n\n` +
        `Automated on-chain dispatch is now processing your transfer.`,
        {
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard(true),
        }
      );
    } else {
      return bot.sendMessage(chatId, `❌ ${result.message}`, {
        ...getMainMenuKeyboard(true),
      });
    }
  }
});

// ============================================================
// 🏅 BADGES & CREDIT SCORE COMMAND
// ============================================================

bot.onText(/\/badges/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);

  if (!user) {
    return bot.sendMessage(chatId,
      `🔒 *Login Required*\n\nPlease /login to see your badges and credit score.`,
      { parse_mode: 'Markdown' }
    );
  }

  try {
    const { supabase } = require('./config');

    // Fetch credit score and badges
    const [userRes, badgesRes] = await Promise.all([
      supabase.from('users').select('credit_score, trade_count, total_volume, reputation, kyc_status').eq('id', user.id).single(),
      supabase.from('trader_badges').select('*').eq('user_id', user.id).order('earned_at', { ascending: true }),
    ]);

    const u = userRes.data || {};
    const badges = badgesRes.data || [];
    const score = u.credit_score || 500;

    // Credit score bar
    const barFilled = Math.round(score / 100);
    const bar = '█'.repeat(barFilled) + '░'.repeat(10 - barFilled);

    let scoreLabel = '🔴 Low';
    if (score >= 800) scoreLabel = '🟢 Elite';
    else if (score >= 650) scoreLabel = '🟡 Good';
    else if (score >= 500) scoreLabel = '🟠 Fair';

    let text = `🏅 *Trader Profile: @${user.username}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📊 *Credit Score:* \`${score}/1000\` — ${scoreLabel}\n`;
    text += `\`[${bar}]\`\n\n`;
    text += `📈 *Trades Completed:* ${u.trade_count || 0}\n`;
    text += `💰 *Total Volume:* $${Number(u.total_volume || 0).toFixed(2)}\n`;
    text += `⭐ *Reputation:* ${u.reputation || 100}%\n`;
    text += `🔐 *KYC Status:* ${u.kyc_status === 'approved' ? '✅ Verified' : '⏳ ' + (u.kyc_status || 'None')}\n\n`;

    if (badges.length === 0) {
      text += `🏆 *Badges:* None yet — complete 5 trades to earn your first badge!\n`;
    } else {
      text += `🏆 *Earned Badges (${badges.length}):*\n`;
      badges.forEach(b => {
        text += `  ${b.badge_icon} *${b.badge_name}* — ${b.description}\n`;
      });
    }

    text += `\n_Score updates automatically after each trade._`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Refresh Score', callback_data: 'refresh_credit_score' },
          { text: '📜 My History', callback_data: 'menu_history' },
        ]],
      },
    });
  } catch (err) {
    await bot.sendMessage(chatId, `⚠️ Could not load badges: ${err.message}`);
  }
});

// ============================================================
// 🎁 REFERRAL COMMAND
// ============================================================

bot.onText(/\/referral/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);

  if (!user) {
    return bot.sendMessage(chatId,
      `🔒 *Login Required*\n\nPlease /login to access your referral program.`,
      { parse_mode: 'Markdown' }
    );
  }

  try {
    const { supabase, WEB_APP_URL } = require('./config');

    // Get referral code and stats
    const [userRes, referralsRes] = await Promise.all([
      supabase.from('users').select('referral_code, referral_earnings').eq('id', user.id).single(),
      supabase.from('referrals').select('status, commission_earned').eq('referrer_id', user.id),
    ]);

    const referralCode = userRes.data?.referral_code || 'N/A';
    const totalEarnings = Number(userRes.data?.referral_earnings || 0).toFixed(2);
    const refs = referralsRes.data || [];
    const qualifiedRefs = refs.filter(r => r.status === 'qualified' || r.status === 'paid').length;
    const pendingRefs = refs.filter(r => r.status === 'pending').length;

    const referralLink = `${WEB_APP_URL.replace('?mode=telegram', '')}?ref=${referralCode}`;

    const text =
      `🎁 *EthioSwap Referral Program*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Your referral code: \`${referralCode}\`\n\n` +
      `🔗 *Your Referral Link:*\n\`${referralLink}\`\n\n` +
      `📊 *Your Stats:*\n` +
      `  👥 Referred: ${refs.length} people\n` +
      `  ✅ Qualified: ${qualifiedRefs}\n` +
      `  ⏳ Pending: ${pendingRefs}\n` +
      `  💰 Total Earned: \`$${totalEarnings}\`\n\n` +
      `💡 *How it works:*\n` +
      `• Share your link with friends\n` +
      `• When they complete their first trade, you earn *0.2%* of their trade volume (up to $5)\n` +
      `• Earnings go directly to your EthioSwap wallet`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 Share Referral Link', url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🇪🇹 Trade USD for ETB safely with EthioSwap P2P! Use my referral link to get started:')}` }],
          [{ text: '💼 Check Wallet', callback_data: 'menu_wallet' }],
        ],
      },
    });
  } catch (err) {
    await bot.sendMessage(chatId, `⚠️ Could not load referral data: ${err.message}`);
  }
});

// ============================================================
// 🔒 ESCROW-AS-A-SERVICE (/escrow) — works in groups too!
// ============================================================

bot.onText(/\/escrow(?:\s+(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  const user = await authService.getCurrentUser(chatId);

  if (!user) {
    return bot.sendMessage(chatId,
      `🔒 *Login Required*\n\nYou need an EthioSwap account to create an escrow.\nUse /login in a private chat with this bot first.`,
      { parse_mode: 'Markdown' }
    );
  }

  const args = match?.[1]?.trim().split(/\s+/) || [];

  // Usage: /escrow <amount> <@counterpart> <description>
  if (args.length < 2 || isNaN(parseFloat(args[0]))) {
    return bot.sendMessage(chatId,
      `🔒 *EthioSwap Group Escrow*\n\n` +
      `Use me to safely escrow trades directly in Telegram groups!\n\n` +
      `*Usage:*\n` +
      `\`/escrow <amount_usd> @counterpart description\`\n\n` +
      `*Example:*\n` +
      `\`/escrow 50 @alice_trades Selling 50 USDT for ETB\`\n\n` +
      `Both parties must have EthioSwap accounts. The initiator's funds are locked until the trade is confirmed by both sides.`,
      { parse_mode: 'Markdown' }
    );
  }

  const amountUsd = parseFloat(args[0]);
  const counterpartHandle = args[1]?.replace('@', '');
  const description = args.slice(2).join(' ') || `Escrow trade for $${amountUsd}`;

  if (amountUsd < 5) {
    return bot.sendMessage(chatId, `❌ Minimum escrow amount is $5.00 USD.`);
  }

  if (amountUsd > user.balance_usd) {
    return bot.sendMessage(chatId,
      `❌ *Insufficient Balance*\n\nYour balance: \`$${Number(user.balance_usd).toFixed(2)}\`\nRequired: \`$${amountUsd.toFixed(2)}\`\n\nDeposit funds first with /wallet.`,
      { parse_mode: 'Markdown' }
    );
  }

  try {
    const { supabase } = require('./config');

    // Create the escrow session in DB
    const { data: session, error } = await supabase
      .from('group_escrow_sessions')
      .insert({
        telegram_group_id: String(chatId),
        telegram_group_name: msg.chat.title || 'Private Chat',
        initiator_user_id: user.id,
        initiator_telegram_id: String(msg.from.id),
        amount_usd: amountUsd,
        description,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    const escrowId = session.id.substring(0, 8).toUpperCase();

    await bot.sendMessage(chatId,
      `🔒 *Escrow Session Created!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📋 *Escrow ID:* \`${escrowId}\`\n` +
      `💰 *Amount:* \`$${amountUsd.toFixed(2)} USD\`\n` +
      `📝 *Trade:* ${description}\n` +
      `👤 *Initiator:* @${user.username}\n` +
      `⏳ *Waiting for:* @${counterpartHandle} to accept\n\n` +
      `@${counterpartHandle} — tap *Accept* to lock in this escrow trade. Once accepted, funds are held safely until both parties confirm release.\n\n` +
      `⚠️ Session expires in 24 hours.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Accept Escrow', callback_data: `escrow_accept_${session.id}` },
              { text: '❌ Decline', callback_data: `escrow_decline_${session.id}` },
            ],
            [{ text: '🔓 Release Funds (After Trade)', callback_data: `escrow_release_${session.id}` }],
            [{ text: '⚖️ Open Dispute', callback_data: `escrow_dispute_${session.id}` }],
          ],
        },
      }
    );
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Failed to create escrow: ${err.message}`);
  }
});

// Handle escrow callbacks
bot.on('callback_query', async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const fromId = query.from.id;

  if (!data.startsWith('escrow_')) return;

  const [, action, sessionId] = data.split('_').reduce((acc, part, i) => {
    if (i === 0) return [part, '', ''];
    if (i === 1) return [acc[0], part, ''];
    return [acc[0], acc[1], acc[2] + (acc[2] ? '_' : '') + part];
  }, []);

  try {
    const { supabase } = require('./config');
    const { data: session } = await supabase
      .from('group_escrow_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return bot.answerCallbackQuery(query.id, { text: '❌ Escrow session not found.' });
    }

    const actionKey = query.data.replace(`escrow_`, '').replace(`_${sessionId}`, '');

    if (actionKey === 'accept') {
      if (String(fromId) === session.initiator_telegram_id) {
        return bot.answerCallbackQuery(query.id, { text: '⚠️ You cannot accept your own escrow.' });
      }
      await supabase.from('group_escrow_sessions').update({ status: 'accepted', counterpart_telegram_id: String(fromId) }).eq('id', sessionId);
      await bot.editMessageText(
        query.message.text + '\n\n✅ *Accepted!* Both parties agreed. Funds are now locked in escrow.',
        { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: {
          inline_keyboard: [[{ text: '🔓 Release Funds', callback_data: `escrow_release_${sessionId}` }, { text: '⚖️ Dispute', callback_data: `escrow_dispute_${sessionId}` }]],
        }}
      ).catch(() => {});
      return bot.answerCallbackQuery(query.id, { text: '✅ Escrow accepted!' });
    }

    if (actionKey === 'release') {
      if (String(fromId) !== session.initiator_telegram_id) {
        return bot.answerCallbackQuery(query.id, { text: '⚠️ Only the fund initiator can release.' });
      }
      await supabase.from('group_escrow_sessions').update({ status: 'released' }).eq('id', sessionId);
      await bot.sendMessage(chatId, `✅ *Escrow #${sessionId.substring(0,8).toUpperCase()} Released!*\n\nFunds have been released to the counterpart. Trade complete!`, { parse_mode: 'Markdown' });
      return bot.answerCallbackQuery(query.id, { text: '✅ Funds released!' });
    }

    if (actionKey === 'dispute') {
      await supabase.from('group_escrow_sessions').update({ status: 'disputed' }).eq('id', sessionId);
      await bot.sendMessage(chatId, `⚖️ *Dispute Opened — Escrow #${sessionId.substring(0,8).toUpperCase()}*\n\nAn EthioSwap admin has been notified and will review within 24 hours. Both parties please prepare evidence.`, { parse_mode: 'Markdown' });
      return bot.answerCallbackQuery(query.id, { text: '⚠️ Dispute filed.' });
    }

    if (actionKey === 'decline') {
      await supabase.from('group_escrow_sessions').update({ status: 'cancelled' }).eq('id', sessionId);
      await bot.sendMessage(chatId, `❌ Escrow session #${sessionId.substring(0,8).toUpperCase()} was declined.`);
      return bot.answerCallbackQuery(query.id, { text: 'Escrow cancelled.' });
    }

    // Credit score refresh callback
    if (data === 'refresh_credit_score') {
      const user = await authService.getCurrentUser(chatId);
      if (!user) return bot.answerCallbackQuery(query.id, { text: 'Not logged in.' });
      const { supabase } = require('./config');
      const { data: scoreData } = await supabase.rpc('refresh_user_credit_score', { p_user_id: user.id });
      return bot.answerCallbackQuery(query.id, { text: `✅ Credit score updated: ${scoreData}/1000`, show_alert: true });
    }
  } catch (err) {
    bot.answerCallbackQuery(query.id, { text: `Error: ${err.message}` }).catch(() => {});
  }
});

// ============================================================
// 🔄 DCA / RECURRING AUTO-BUY (/dca)
// ============================================================

bot.onText(/\/dca/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);

  if (!user) {
    return bot.sendMessage(chatId,
      `🔒 *Login Required*\n\nPlease /login to set up recurring orders.`,
      { parse_mode: 'Markdown' }
    );
  }

  try {
    const { supabase } = require('./config');
    const { data: orders } = await supabase
      .from('recurring_orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    let text = `🔄 *Dollar-Cost Averaging (DCA) for Ethiopia*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Automate your USDT purchases on a schedule. Your balance is used automatically.\n\n`;

    if (orders && orders.length > 0) {
      text += `📋 *Your Active DCA Orders:*\n`;
      orders.forEach((o, i) => {
        const nextRun = new Date(o.next_run_at).toLocaleDateString('en-ET', { weekday: 'short', month: 'short', day: 'numeric' });
        text += `${i + 1}. ${o.order_type === 'buy' ? '🛒' : '💵'} *$${o.amount_usd}* ${o.frequency} via ${o.payment_method}\n`;
        text += `   Next run: ${nextRun} | Runs: ${o.run_count}${o.max_runs ? '/' + o.max_runs : ''}\n\n`;
      });
    } else {
      text += `📭 *No active DCA orders yet.*\n\n`;
    }

    text += `\n👇 *Create a new recurring order:*`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🛒 Weekly Auto-Buy $20', callback_data: 'dca_create_buy_20_weekly' },
            { text: '🛒 Monthly Auto-Buy $50', callback_data: 'dca_create_buy_50_monthly' },
          ],
          [
            { text: '🛒 Daily Auto-Buy $5', callback_data: 'dca_create_buy_5_daily' },
            { text: '⚙️ Custom Amount', callback_data: 'dca_create_custom' },
          ],
          [{ text: '⏸ Pause All Orders', callback_data: 'dca_pause_all' }],
        ],
      },
    });
  } catch (err) {
    await bot.sendMessage(chatId, `⚠️ Error loading DCA orders: ${err.message}`);
  }
});

// DCA creation callbacks
bot.on('callback_query', async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;

  if (!data.startsWith('dca_')) return;

  if (data.startsWith('dca_create_buy_')) {
    const parts = data.split('_'); // ['dca', 'create', 'buy', amount, frequency]
    const amount = parseFloat(parts[3]);
    const frequency = parts[4];
    const user = await authService.getCurrentUser(chatId);

    if (!user) return bot.answerCallbackQuery(query.id, { text: 'Please /login first.' });

    const { supabase } = require('./config');
    const nextRun = new Date();
    if (frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1);
    else if (frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
    else if (frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);

    const { error } = await supabase.from('recurring_orders').insert({
      user_id: user.id,
      order_type: 'buy',
      amount_usd: amount,
      frequency,
      payment_method: 'wallet_balance',
      next_run_at: nextRun.toISOString(),
      status: 'active',
    });

    if (error) return bot.answerCallbackQuery(query.id, { text: `Error: ${error.message}`, show_alert: true });

    await bot.sendMessage(chatId,
      `✅ *DCA Order Created!*\n\n🛒 Auto-buy *$${amount}* USDT every *${frequency}*\n💳 Paid from your wallet balance\n📅 First run: ${nextRun.toLocaleDateString()}\n\nYou can pause or cancel anytime with /dca.`,
      { parse_mode: 'Markdown' }
    );
    return bot.answerCallbackQuery(query.id, { text: '✅ DCA order created!' });
  }

  if (data === 'dca_create_custom') {
    authService.setStep(chatId, 'AWAITING_DCA_AMOUNT', {});
    await bot.sendMessage(chatId,
      `⚙️ *Custom DCA Order*\n\nEnter the amount in USD you want to auto-buy (minimum $5):`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
    return bot.answerCallbackQuery(query.id);
  }
});

// ============================================================
// 🚨 GUARDIAN EMERGENCY LOCKDOWN & EVACUATION (/lock, /panic, /evacuate)
// ============================================================

bot.onText(/\/lock|\/panic/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);
  if (!user) return bot.sendMessage(chatId, `🔒 *Login Required*\n\nPlease log in first via /login to manage your security vault.`, { parse_mode: 'Markdown' });

  try {
    const { supabase } = require('./config');
    await supabase.rpc('trigger_emergency_account_lock', {
      p_user_id: user.id,
      p_reason: 'telegram_panic_command',
      p_auto_evacuate: false,
    });

    return bot.sendMessage(chatId,
      `🚨 *GUARDIAN EMERGENCY LOCKDOWN ENGAGED*\n\n` +
      `Your EthioSwap account (*@${user.username}*) has been immediately *FROZEN*.\n\n` +
      `🛡️ *Protective Measures Active:*\n` +
      `• All outgoing balance withdrawals are strictly blocked\n` +
      `• P2P releases and transfers are halted\n` +
      `• Attackers cannot drain or transfer your funds\n\n` +
      `⚡ *Emergency Fund Evacuation:*\n` +
      `To immediately sweep your balance to your Bybit address, type /evacuate.\n\n` +
      `To safely release this lockdown, sign in to your Guardian Vault at https://ethioswap.qzz.io`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    return bot.sendMessage(chatId, `⚠️ Lock failed: ${err.message}`);
  }
});

bot.onText(/\/evacuate/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);
  if (!user) return bot.sendMessage(chatId, `🔒 *Login Required*\n\nPlease log in first via /login.`, { parse_mode: 'Markdown' });

  if (!user.emergency_evac_address) {
    return bot.sendMessage(chatId,
      `⚠️ *No Emergency Bybit Address Configured*\n\n` +
      `Please configure your Bybit address in your Guardian Vault on EthioSwap Web before emergency evacuation can be executed. Your account has been locked for safety.`,
      { parse_mode: 'Markdown' }
    );
  }

  try {
    const { supabase } = require('./config');
    await supabase.rpc('trigger_emergency_account_lock', {
      p_user_id: user.id,
      p_reason: 'telegram_evacuate_command',
      p_auto_evacuate: true,
    });

    return bot.sendMessage(chatId,
      `🚨 *EMERGENCY FUND EVACUATION EXECUTED*\n\n` +
      `⚡ *Remaining funds are being swept to your emergency address:*\n` +
      `\`${user.emergency_evac_address}\` (${user.emergency_evac_network || 'TRC20'})\n\n` +
      `🔒 Account *@${user.username}* is locked down. Any unauthorized intruder is blocked from accessing your balance.`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    return bot.sendMessage(chatId, `⚠️ Evacuation failed: ${err.message}`);
  }
});

// Graceful process shutdown
process.on('SIGINT', () => {
  console.log('Shutting down Telegram bot...');
  bot.stopPolling().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Terminating Telegram bot...');
  bot.stopPolling().then(() => process.exit(0));
});

