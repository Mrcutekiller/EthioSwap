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

// ========================================================
// KEYBOARDS & MENUS
// ========================================================

function getMainMenuKeyboard(isLoggedIn = false) {
  return {
    reply_markup: {
      keyboard: [
        [
          { text: '🚀 Launch P2P Web App', web_app: { url: WEB_APP_URL } },
        ],
        [
          { text: '🛒 Buy $ (USD/USDT)' },
          { text: '💵 Sell $ (USD/USDT)' },
        ],
        [
          { text: '💼 P2P Wallet' },
          { text: '📋 My Orders' },
        ],
        [
          { text: isLoggedIn ? '👤 Account & Profile' : '🔐 Log In to EthioSwap' },
          { text: '➕ Post P2P Ad' },
        ],
        [
          { text: 'ℹ️ Exchange Rates & Info' },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
}

function getCancelKeyboard() {
  return {
    reply_markup: {
      keyboard: [[{ text: '❌ Cancel' }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
}

// ========================================================
// START COMMAND & WELCOME
// ========================================================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await authService.getCurrentUser(chatId);

  authService.clearStep(chatId);

  let text = `🇪🇹 *Welcome to EthioSwap P2P Bot!*\n\n` +
    `The premier Peer-to-Peer crypto & currency exchange for Ethiopia.\n` +
    `Fast, secure escrow with Telebirr, CBE, and on-chain deposits.\n\n`;

  if (user) {
    const balUsd = Number(user.balance_usd || 0).toFixed(2);
    text += `👤 *Logged in as:* @${user.username || 'Trader'}\n` +
      `💰 *P2P Balance:* $${balUsd} USD\n` +
      `⭐ *Reputation:* ${user.reputation || 100}%\n\n` +
      `Choose an option below to start trading:`;
  } else {
    text += `🔒 *You are currently not logged in.*\n` +
      `Link your existing EthioSwap website account to deposit, withdraw, buy, and sell dollars directly from Telegram!\n\n` +
      `👉 Tap *🔐 Log In to EthioSwap* below or type /login to get started.`;
  }

  // Configure persistent Telegram Menu Button to open Mini App
  try {
    await bot.setChatMenuButton({
      chat_id: chatId,
      menu_button: {
        type: 'web_app',
        text: 'P2P App',
        web_app: { url: WEB_APP_URL },
      },
    });
  } catch (_) {}

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🚀 Launch P2P Mini App (Web)', web_app: { url: WEB_APP_URL } },
        ],
        [
          { text: '🛒 Buy $', callback_data: 'menu_buy' },
          { text: '💵 Sell $', callback_data: 'menu_sell' },
        ],
        [
          { text: '💼 P2P Wallet', callback_data: 'menu_wallet' },
          { text: '📋 My Orders', callback_data: 'menu_orders' },
        ],
      ],
    },
  });

  // Also send bottom keyboard
  await bot.sendMessage(chatId, '👇 Tap below to launch the Mini App or trade:', {
    ...getMainMenuKeyboard(Boolean(user)),
  });
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
      `✅ You are already logged in as *@${user.username}*!\n\n` +
      `Balance: *$${Number(user.balance_usd || 0).toFixed(2)} USD*\n\n` +
      `If you want to switch accounts, type /logout first.`,
      {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard(true),
      }
    );
  }

  authService.setStep(chatId, 'AWAITING_LOGIN_IDENTIFIER', {});
  await bot.sendMessage(
    chatId,
    `🔐 *Log In to your EthioSwap Account*\n\n` +
    `Please enter your *Email address* or *Username* that you use on the website:`,
    {
      parse_mode: 'Markdown',
      ...getCancelKeyboard(),
    }
  );
});

bot.onText(/\/logout/, async (msg) => {
  const chatId = msg.chat.id;
  await authService.logout(chatId);
  await bot.sendMessage(
    chatId,
    `👋 You have been logged out from EthioSwap.\n\nTap /login whenever you want to reconnect.`,
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard(false),
    }
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

    const message =
      `💼 *EthioSwap P2P Wallet*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Account:* @${user.username} (ID: #${summary.numericId})\n\n` +
      `💵 *Available USD:* \`$${summary.usdAvailable.toFixed(2)}\`\n` +
      `🔒 *Escrow Locked:* \`$${summary.usdEscrow.toFixed(2)}\`\n` +
      `💰 *Total Balance:* \`$${summary.totalUsd.toFixed(2)} USD\`\n` +
      `🇪🇹 *ETB Balance:* \`${summary.etbBalance.toLocaleString()} ETB\`\n` +
      `⛓ *ETH Balance:* \`${summary.ethBalance.toFixed(4)} ETH\`\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 *Your On-Chain Address:*\n\`${summary.depositAddress}\`\n\n` +
      `_Automatic on-chain deposits & instant P2P withdrawals enabled._`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '📥 Deposit (On-Chain / USD)', callback_data: 'wallet_deposit' },
          { text: '📤 Withdraw Funds', callback_data: 'wallet_withdraw' },
        ],
        [
          { text: '📜 Recent Transactions', callback_data: 'wallet_history' },
          { text: '🔄 Refresh Balance', callback_data: 'wallet_refresh' },
        ],
      ],
    };

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard,
    });
  } catch (err) {
    await bot.sendMessage(chatId, `⚠️ Could not fetch wallet details: ${err.message}`);
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

  let text = `🛒 *Active Sellers — Buy $ (USD / USDT)*\n` +
    `Choose a verified seller below. Minimum order starts from *$${MIN_ORDER_USD}*.\n\n`;

  const buttons = [];

  listings.slice(0, 6).forEach((item, index) => {
    const sellerName = item.seller_name || item.sellerStats?.username || `Seller #${index + 1}`;
    const orders = item.sellerStats?.trade_count || 0;
    const rep = item.sellerStats?.reputation || 100;
    const rate = item.rate || 190.0;
    const min = item.minUsd || MIN_ORDER_USD;
    const max = item.maxUsd || 500;

    text += `*${index + 1}. 👤 ${sellerName}* ${item.sellerStats?.is_verified ? '✅' : ''}\n` +
      `   📦 *Orders:* ${orders} orders | ⭐ ${rep}%\n` +
      `   💵 *Rate:* 1 USD = *${rate} ETB*\n` +
      `   📊 *Limits:* $${min} - $${max} USD\n` +
      `   💳 *Methods:* ${Array.isArray(item.payment_methods) ? item.payment_methods.join(', ') : 'Telebirr, CBE'}\n\n`;

    buttons.push([
      {
        text: `🛒 Buy from ${sellerName} (${rate} ETB)`,
        callback_data: `buy_select_${item.id}`,
      },
    ]);
  });

  buttons.push([
    { text: '➕ Post My Own Buy Ad', callback_data: 'post_ad_buy' },
    { text: '🔄 Refresh', callback_data: 'refresh_buy_listings' },
  ]);

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons },
  });
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

  let text = `💵 *P2P Sell $ — Instant ETB Cashout*\n\n` +
    `You can sell your USD/USDT directly to verified buyers below, or create your own Sell ad.\n` +
    `Minimum order starts from *$${MIN_ORDER_USD}*.\n\n`;

  const buttons = [];

  if (listings && listings.length > 0) {
    text += `*Available Buyers:*\n\n`;
    listings.slice(0, 6).forEach((item, index) => {
      const buyerName = item.seller_name || item.sellerStats?.username || `Buyer #${index + 1}`;
      const orders = item.sellerStats?.trade_count || 0;
      const rep = item.sellerStats?.reputation || 100;
      const rate = item.rate || 186.0;
      const min = item.minUsd || MIN_ORDER_USD;
      const max = item.maxUsd || 500;

      text += `*${index + 1}. 👤 ${buyerName}* ${item.sellerStats?.is_verified ? '✅' : ''}\n` +
        `   📦 *Orders:* ${orders} orders | ⭐ ${rep}%\n` +
        `   💵 *Rate:* 1 USD = *${rate} ETB*\n` +
        `   📊 *Limits:* $${min} - $${max} USD\n` +
        `   💳 *Pays via:* ${Array.isArray(item.payment_methods) ? item.payment_methods.join(', ') : 'Telebirr, CBE'}\n\n`;

      buttons.push([
        {
          text: `💵 Sell to ${buyerName} (${rate} ETB)`,
          callback_data: `sell_select_${item.id}`,
        },
      ]);
    });
  } else {
    text += `_No active buyers waiting in queue right now._\n\n` +
      `💡 Create your own Sell ad and buyers will order from you instantly!\n\n`;
  }

  buttons.push([
    { text: '➕ Create My Sell Ad (Post Listing)', callback_data: 'post_ad_sell' },
    { text: '🔄 Refresh', callback_data: 'refresh_sell_listings' },
  ]);

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons },
  });
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
        `📋 *My Orders*\n\nYou don't have any active or past P2P trade orders yet.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Browse Buy Orders', callback_data: 'menu_buy' }],
              [{ text: '💵 Browse Sell Orders', callback_data: 'menu_sell' }],
            ],
          },
        }
      );
    }

    let text = `📋 *Your P2P Orders*\n\n`;
    const buttons = [];

    trades.slice(0, 8).forEach((t) => {
      const isBuyer = t.buyer_id === user.id;
      const roleText = isBuyer ? '🟢 BUY' : '🔴 SELL';
      const statusIcon = t.status === 'completed' ? '✅' : t.status === 'paid' ? '⏳' : t.status === 'cancelled' ? '❌' : '⏱';

      text += `${roleText} *#${t.id.slice(0, 8)}* — $${Number(t.amount_usd).toFixed(2)} (${Number(t.amount_etb).toLocaleString()} ETB)\n` +
        `Status: ${statusIcon} *${t.status.toUpperCase()}* | Method: ${t.payment_method || 'Telebirr/CBE'}\n` +
        `Date: ${new Date(t.created_at).toLocaleDateString()}\n\n`;

      buttons.push([
        {
          text: `🔍 View Order #${t.id.slice(0, 8)} (${t.status})`,
          callback_data: `trade_view_${t.id}`,
        },
      ]);
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

  const text =
    `👤 *Trader Profile: @${user.username}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📧 *Email:* \`${user.email || 'N/A'}\`\n` +
    `🆔 *Trader ID:* \`#${user.numeric_id || 'N/A'}\`\n` +
    `⭐ *Reputation:* \`${user.reputation || 100}%\`\n` +
    `📦 *Total Trades:* \`${user.total_trades || user.trade_count || 0}\`\n` +
    `🛡 *Verification:* \`${user.is_verified_trader ? 'Verified Trader ✅' : 'Standard Trader'}\`\n` +
    `💰 *USD Balance:* \`$${Number(user.balance_usd || 0).toFixed(2)}\`\n` +
    `🇪🇹 *ETB Balance:* \`${Number(user.etb_balance || 0).toLocaleString()} ETB\`\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💼 My Wallet', callback_data: 'menu_wallet' },
          { text: '📋 My Orders', callback_data: 'menu_orders' },
        ],
        [
          { text: '🚪 Log Out', callback_data: 'action_logout' },
        ],
      ],
    },
  });
});

// ========================================================
// EXCHANGE RATES & INFO
// ========================================================

bot.onText(/ℹ️ Exchange Rates & Info/, async (msg) => {
  const chatId = msg.chat.id;
  const text =
    `ℹ️ *EthioSwap Market Rates & Platform Policy*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🟢 *Buy USD Rate:* ~190.00 ETB / $\n` +
    `🔴 *Sell USD Rate:* ~186.00 ETB / $\n\n` +
    `🛡 *Escrow Protection:* 100% Guaranteed\n` +
    `⚡️ *Min P2P Order:* $5.00 USD\n` +
    `⚡️ *Deposit Processing:* Automatic on-chain\n` +
    `🏦 *Supported Payment Methods:*\n` +
    `• Telebirr (Instant mobile transfer)\n` +
    `• Commercial Bank of Ethiopia (CBE)\n` +
    `• Awash Bank / BOA / Dashen\n` +
    `• USDT On-chain (ERC20 / TRC20 / BSC)\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🛒 Buy $ Now', callback_data: 'menu_buy' },
          { text: '💵 Sell $ Now', callback_data: 'menu_sell' },
        ],
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
      `🔐 *Log In to EthioSwap*\n\nPlease enter your *Email* or *Username*:`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  }

  if (data === 'action_logout') {
    await authService.logout(chatId);
    return bot.sendMessage(chatId, `👋 You have logged out successfully.`, {
      ...getMainMenuKeyboard(false),
    });
  }

  if (data === 'menu_buy' || data === 'refresh_buy_listings') {
    return handleShowBuyListings(chatId);
  }

  if (data === 'menu_sell' || data === 'refresh_sell_listings') {
    return handleShowSellListings(chatId);
  }

  if (data === 'menu_wallet' || data === 'wallet_refresh') {
    const user = await authService.getCurrentUser(chatId);
    if (!user) return bot.sendMessage(chatId, `🔒 Please log in.`);
    await authService.refreshUserProfile(chatId);
    return bot.sendMessage(chatId, `🔄 Wallet balance refreshed! Type /wallet to view.`);
  }

  if (data === 'menu_orders') {
    return bot.sendMessage(chatId, `Type /orders or tap 📋 My Orders from the keyboard.`);
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

// Graceful process shutdown
process.on('SIGINT', () => {
  console.log('Shutting down Telegram bot...');
  bot.stopPolling().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Terminating Telegram bot...');
  bot.stopPolling().then(() => process.exit(0));
});
