import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

// Initialize database with default data if it doesn't exist
function initDb() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData = {
      users: [],
      listings: [],
      trades: [],
      notifications: [],
      transactions: [],
      systemSettings: {
        etbRatePerDollar: 190.0,
        dailyTradeLimit: 5000.0,
        flatFeePercent: 0.5,
        maxFeeUSD: 0.50,
        collectedFeesETH: 0.0,
        masterWalletBalanceETH: 10.0,
        masterWalletAddress: "0x71C259654103112E118830F25f82bb54aA20336d",
        commissionType: "percentage",
        commissionValue: 0.5
      },
      supportTickets: []
    };

    // Seed some test users
    // Admin only
    const adminWallet = ethers.Wallet.createRandom();
    defaultData.users.push({
      id: "usr_admin",
      username: "admin@ethioswap.com",
      passwordHash: "admin123", // email and password for admin
      role: "admin",
      kycStatus: "approved",
      kycDocument: null,
      ethAddress: adminWallet.address,
      ethPrivateKey: adminWallet.privateKey,
      ethBalance: 0.0,
      ethLocked: 0.0,
      etbBalance: 0.0,
      phone: "+251911000000",
      reputation: 100,
      lastActive: new Date().toISOString()
    });

    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

initDb();

export const db = {
  read: () => {
    initDb();
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  },

  write: (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  },

  // Helper collections
  getCollection: (name) => {
    return db.read()[name] || [];
  },

  saveCollection: (name, items) => {
    const data = db.read();
    data[name] = items;
    db.write(data);
  },

  // Helper finders
  findById: (collectionName, id) => {
    const items = db.getCollection(collectionName);
    return items.find(item => item.id === id);
  },

  updateById: (collectionName, id, updates) => {
    const items = db.getCollection(collectionName);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      db.saveCollection(collectionName, items);
      return items[index];
    }
    return null;
  },

  addNotification: (userId, type, message) => {
    const data = db.read();
    const notif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      userId,
      type,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    if (!data.notifications) data.notifications = [];
    data.notifications.push(notif);
    db.write(data);
    return notif;
  },

  addTransaction: (userId, type, amountETH, amountUSD, note) => {
    const data = db.read();
    const tx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      userId,
      type, // 'deposit', 'withdrawal', 'trade_buy', 'trade_sell', 'fee'
      amountETH,
      amountUSD,
      note,
      createdAt: new Date().toISOString()
    };
    if (!data.transactions) data.transactions = [];
    data.transactions.push(tx);
    db.write(data);
    return tx;
  }
};
