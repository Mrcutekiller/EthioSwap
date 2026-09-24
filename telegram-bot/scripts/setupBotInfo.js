const fetch = globalThis.fetch;

async function setupBot() {
  const token = '8920615384:AAHoJ5OCIzwehDYQ-xDe6Zr-aaGEO3L2h5c';

  // 1. Set bot commands
  const commands = [
    { command: 'start', description: '🚀 Open EthioSwap P2P & Mini App' },
    { command: 'buy', description: '🛒 Buy $ (USD/USDT) with Telebirr/CBE' },
    { command: 'sell', description: '💵 Sell $ (USD/USDT) for ETB' },
    { command: 'wallet', description: '💼 P2P Wallet & Balances' },
    { command: 'orders', description: '📋 My Active Orders' },
    { command: 'history', description: '📜 Transaction History' },
    { command: 'login', description: '🔐 Log In / Connect Web Account' },
    { command: 'logout', description: '🚪 Log Out' }
  ];

  const cmdRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands }),
  }).then((r) => r.json());
  console.log('setMyCommands:', cmdRes);

  // 2. Set bot description (shown before /start)
  const descRes = await fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description:
        '🇪🇹 Welcome to EthioSwap P2P!\n\nThe premier peer-to-peer dollar & crypto exchange for Ethiopia.\n\n🛡️ 100% Escrow Protection\n💳 Instant Telebirr & CBE Payouts\n🚀 Interactive Web Mini App',
    }),
  }).then((r) => r.json());
  console.log('setMyDescription:', descRes);

  // 3. Set short description (shown in bot info card)
  const shortDescRes = await fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      short_description: '🇪🇹 Fast & secure P2P USD/USDT exchange with Telebirr & CBE escrow.',
    }),
  }).then((r) => r.json());
  console.log('setMyShortDescription:', shortDescRes);
}

setupBot().catch(console.error);
