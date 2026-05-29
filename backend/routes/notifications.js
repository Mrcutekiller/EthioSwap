import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get notifications for a user
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const data = db.read();
  const notifications = (data.notifications || []).filter(n => n.userId === userId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
  res.json(notifications);
});

// Mark notification(s) as read
router.post('/:userId/read', (req, res) => {
  const { userId } = req.params;
  const { notifId } = req.body; // optional: if omitted, mark all as read
  const data = db.read();
  if (!data.notifications) data.notifications = [];
  data.notifications = data.notifications.map(n => {
    if (n.userId === userId && (!notifId || n.id === notifId)) {
      return { ...n, isRead: true };
    }
    return n;
  });
  db.write(data);
  res.json({ message: 'Marked as read' });
});

export default router;
