import express from 'express';
import { db } from '../db.js';
import { ethers } from 'ethers';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup multer for KYC document uploads
const kycStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/kyc');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${file.fieldname}${ext}`);
  }
});
const kycUpload = multer({ storage: kycStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Register a new user
router.post('/register', (req, res) => {
  const { username, password, phone } = req.body;
  if (!username || !password || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const users = db.getCollection('users');
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const wallet = ethers.Wallet.createRandom();
  const newUser = {
    id: `usr_${Date.now()}`,
    username,
    passwordHash: password,
    role: 'user',
    kycStatus: 'none',
    kycStep: 'none', // none, id_uploaded, face_captured, pending, approved, rejected
    kycIdFront: null,
    kycIdBack: null,
    kycSelfie: null,
    kycDocument: null,
    ethAddress: wallet.address,
    ethPrivateKey: wallet.privateKey,
    ethBalance: 0.0,
    ethLocked: 0.0,
    etbBalance: 0.0,
    phone,
    displayName: username,
    bio: '',
    reputation: 100,
    totalTrades: 0,
    joinedAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };
  users.push(newUser);
  db.saveCollection('users', users);
  db.addNotification(newUser.id, 'welcome', 'Welcome to EthioSwap! Complete your KYC verification to start trading.');
  const { ethPrivateKey, passwordHash, ...userResponse } = newUser;
  res.status(201).json(userResponse);
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = db.getCollection('users');
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  user.lastActive = new Date().toISOString();
  db.updateById('users', user.id, { lastActive: user.lastActive });
  const { ethPrivateKey, passwordHash, ...userResponse } = user;
  res.json(userResponse);
});

// Upload KYC ID info form
router.post('/kyc-info', (req, res) => {
  const { userId, fullName, phone, age, idType, address } = req.body;
  if (!userId || !fullName || !phone || !age || !idType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const user = db.findById('users', userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updated = db.updateById('users', userId, {
    kycFullName: fullName,
    kycPhone: phone,
    kycAge: age,
    kycIdType: idType,
    kycAddress: address || '',
    kycStep: 'info_filled',
    kycStatus: 'none'
  });

  const { ethPrivateKey, passwordHash, ...userResponse } = updated;
  res.json({ message: 'KYC information saved successfully.', user: userResponse });
});

// Upload KYC ID documents (front + back)
router.post('/kyc-id-upload', kycUpload.fields([{ name: 'idFront', maxCount: 1 }, { name: 'idBack', maxCount: 1 }]), (req, res) => {
  const { userId } = req.body;
  const user = db.findById('users', userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const idFront = req.files?.idFront?.[0] ? `/uploads/kyc/${req.files.idFront[0].filename}` : user.kycIdFront;
  const idBack = req.files?.idBack?.[0] ? `/uploads/kyc/${req.files.idBack[0].filename}` : user.kycIdBack;

  const updated = db.updateById('users', userId, {
    kycIdFront: idFront,
    kycIdBack: idBack,
    kycStep: 'id_uploaded',
    kycStatus: 'none' // Still need face capture
  });

  const { ethPrivateKey, passwordHash, ...userResponse } = updated;
  res.json({ message: 'ID documents uploaded successfully.', user: userResponse });
});

// Upload KYC face selfie capture
router.post('/kyc-face-upload', kycUpload.single('selfie'), (req, res) => {
  const { userId } = req.body;
  const user = db.findById('users', userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const selfieUrl = req.file ? `/uploads/kyc/${req.file.filename}` : null;

  const updated = db.updateById('users', userId, {
    kycSelfie: selfieUrl,
    kycStep: 'pending',
    kycStatus: 'pending'
  });

  // Notify admin
  db.addNotification('usr_admin', 'kyc_submission', `New KYC submission from @${user.username}. Review ID and selfie in admin panel.`);
  db.addNotification(userId, 'kyc_submitted', 'Your KYC documents are under admin review. We will notify you within 24 hours.');

  const { ethPrivateKey, passwordHash, ...userResponse } = updated;
  res.json({ message: 'Face selfie uploaded. KYC is now pending admin review.', user: userResponse });
});

// Legacy KYC submit (kept for compatibility)
router.post('/kyc-submit', (req, res) => {
  const { userId } = req.body;
  const user = db.findById('users', userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const updated = db.updateById('users', userId, { kycStatus: 'pending', kycStep: 'pending' });
  const { ethPrivateKey, passwordHash, ...userResponse } = updated;
  res.json(userResponse);
});

export default router;
