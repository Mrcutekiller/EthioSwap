# 🇪🇹 EthioSwap P2P Telegram Bot

Official Telegram Bot for **EthioSwap** — Ethiopia's premier Peer-to-Peer crypto & currency trading platform.

---

## 🚀 Features

- 🔐 **Website Account Sync**: Log in directly using your EthioSwap website credentials (Email or Username + Password).
- 💼 **P2P Wallet**:
  - Live USD ($), ETB (Birr), and Crypto (ETH) balance.
  - On-chain crypto deposit with personal deposit address & tx hash verification.
  - On-chain & fiat withdrawal requests starting from $5.00.
  - Transaction history.
- 🛒 **P2P Buy $ (USD/USDT)**:
  - Browse verified sellers.
  - View seller name, completed order count, reputation rating, exchange rates (ETB/$), and min-max limits (starting from $5).
  - Place buy orders with automated escrow protection.
  - Mark payment as sent with interactive button.
- 💵 **P2P Sell $ (USD/USDT)**:
  - Sell to waiting buyers or post your own custom Sell ad.
  - Enter receiving details (Telebirr / CBE account).
  - Instant notifications and escrow release controls.
- 📋 **My Orders**: Real-time trade tracking with status badges (`PENDING`, `PAID`, `COMPLETED`).
- 🛡 **Escrow Protection**: Zero-risk trading backed by EthioSwap's smart escrow engine.

---

## 📦 Setup & Running

### 1. Requirements
- Node.js 18+

### 2. Environment Variables (`.env`)
The `.env` file is pre-configured with your Bot Token and Supabase credentials:
```env
BOT_TOKEN=8920615384:AAHoJ5OCIzwehDYQ-xDe6Zr-aaGEO3L2h5c
SUPABASE_URL=https://gsiyofpzydlkgwpuxmbh.supabase.co
SUPABASE_ANON_KEY=...
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the Bot
```bash
# Start bot
npm start

# Or with auto-reload (development)
npm run dev
```

---

## 🤖 Bot Commands & Buttons

| Command | Action |
|---|---|
| `/start` | Open main menu & welcome dashboard |
| `/login` | Log in with EthioSwap email/username and password |
| `/wallet` | View balance, deposit crypto, or withdraw funds |
| `/buy` | Browse sellers and buy $ with Telebirr/CBE (starting from $5) |
| `/sell` | Sell $ or create a new sell ad |
| `/orders` | View active and completed trades |
| `/logout` | Disconnect your EthioSwap account from Telegram |

---

## 🔒 Security
- Passwords are authenticated directly via Supabase Auth.
- Sessions are tied to Telegram Chat IDs with instant logout support.
