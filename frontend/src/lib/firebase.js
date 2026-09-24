// Firebase configuration for EthioSwap
// Used for: Live chat / support messages (Realtime Database)
// Supabase is still used for: auth, users, trades, wallet, funded accounts

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, off, query, orderByChild, limitToLast, serverTimestamp } from 'firebase/database';

// ─── Firebase Project Config ───────────────────────────────────────────────
// TODO: Replace these with your actual Firebase project credentials
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or use an existing one)
// 3. Add a Web app and copy the config below
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyExample-ReplaceWithYourKey",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ethioswap-chat.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://ethioswap-chat-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ethioswap-chat",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ethioswap-chat.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
};

let app = null;
let database = null;

// Initialize Firebase lazily to avoid crashes if config is missing
export const getFirebaseApp = () => {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
    } catch (err) {
      console.warn('Firebase init error:', err);
    }
  }
  return { app, database };
};

export const getFirebaseDb = () => {
  if (!database) getFirebaseApp();
  return database;
};

// ─── Chat Helpers ─────────────────────────────────────────────────────────────

/**
 * Get the chat room reference for a given chat ID.
 * Chat IDs are structured as:
 *   - Support chats: `support/{userId}`
 *   - Trade chats: `trades/{tradeId}`
 *   - Broker deposits: `broker_deposits/{depositId}`
 */
export const getChatRef = (chatId) => {
  const db = getFirebaseDb();
  if (!db) return null;
  return ref(db, `chats/${chatId}/messages`);
};

/**
 * Send a message to a chat room.
 * @param {string} chatId - The chat room ID
 * @param {object} message - { senderId, senderName, senderAvatar, text, type }
 */
export const sendChatMessage = async (chatId, message) => {
  try {
    const chatRef = getChatRef(chatId);
    if (!chatRef) throw new Error('Firebase not initialized');
    const payload = {
      ...message,
      timestamp: serverTimestamp(),
      createdAt: Date.now(),
    };
    await push(chatRef, payload);
    return { success: true };
  } catch (err) {
    console.error('Firebase sendChatMessage error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Subscribe to messages in a chat room (real-time).
 * @param {string} chatId - The chat room ID
 * @param {function} onMessages - Callback with array of messages
 * @param {number} limit - Max messages to fetch
 * @returns {function} Unsubscribe function
 */
export const subscribeToChatMessages = (chatId, onMessages, limit = 100) => {
  try {
    const chatRef = getChatRef(chatId);
    if (!chatRef) {
      onMessages([]);
      return () => {};
    }
    const messagesQuery = query(chatRef, orderByChild('createdAt'), limitToLast(limit));
    const handler = (snapshot) => {
      if (!snapshot.exists()) {
        onMessages([]);
        return;
      }
      const msgs = [];
      snapshot.forEach((child) => {
        msgs.push({ id: child.key, ...child.val() });
      });
      onMessages(msgs);
    };
    onValue(messagesQuery, handler);
    return () => off(messagesQuery, 'value', handler);
  } catch (err) {
    console.error('Firebase subscribeToChatMessages error:', err);
    onMessages([]);
    return () => {};
  }
};

/**
 * Send a support message from a user to admin.
 * Creates or continues a support chat thread.
 */
export const sendSupportMessage = async (userId, username, text) => {
  return sendChatMessage(`support/${userId}`, {
    senderId: userId,
    senderName: username || 'User',
    text,
    type: 'user',
  });
};

/**
 * Send a reply from admin in a support chat.
 */
export const sendAdminSupportReply = async (userId, text, adminName = 'EthioSwap Support') => {
  return sendChatMessage(`support/${userId}`, {
    senderId: 'admin',
    senderName: adminName,
    text,
    type: 'admin',
  });
};

export { ref, push, onValue, off, serverTimestamp };
