import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get support conversation for a user
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  const tickets = db.getCollection('supportTickets') || [];
  let ticket = tickets.find(t => t.userId === userId && t.status === 'open');
  
  if (!ticket) {
    const user = db.findById('users', userId);
    ticket = {
      id: `tkt_${Date.now()}`,
      userId,
      username: user ? user.username : 'user',
      messages: [],
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  res.json(ticket);
});

// User sends a support message
router.post('/user/:userId/message', (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }

  const tickets = db.getCollection('supportTickets') || [];
  let ticketIndex = tickets.findIndex(t => t.userId === userId && t.status === 'open');
  let ticket;

  if (ticketIndex === -1) {
    const user = db.findById('users', userId);
    ticket = {
      id: `tkt_${Date.now()}`,
      userId,
      username: user ? user.username : 'Unknown User',
      messages: [],
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tickets.push(ticket);
    ticketIndex = tickets.length - 1;
  } else {
    ticket = tickets[ticketIndex];
  }

  ticket.messages.push({
    senderId: userId,
    senderName: ticket.username,
    message: message.trim(),
    timestamp: new Date().toISOString()
  });
  ticket.updatedAt = new Date().toISOString();
  tickets[ticketIndex] = ticket;
  db.saveCollection('supportTickets', tickets);

  // Notify admin
  db.addNotification('usr_admin', 'support', `New support message from @${ticket.username}: "${message.substring(0, 30)}..."`);

  res.json(ticket);
});

// Admin gets all tickets
router.get('/admin/tickets', (req, res) => {
  const tickets = db.getCollection('supportTickets') || [];
  // Sort by updatedAt descending
  const sorted = [...tickets].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(sorted);
});

// Admin replies to a ticket
router.post('/admin/reply', (req, res) => {
  const { ticketId, reply } = req.body;

  if (!ticketId || !reply || !reply.trim()) {
    return res.status(400).json({ error: "Missing ticketId or reply text." });
  }

  const tickets = db.getCollection('supportTickets') || [];
  const ticketIndex = tickets.findIndex(t => t.id === ticketId);

  if (ticketIndex === -1) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const ticket = tickets[ticketIndex];
  ticket.messages.push({
    senderId: 'usr_admin',
    senderName: 'Admin Support',
    message: reply.trim(),
    timestamp: new Date().toISOString()
  });
  ticket.updatedAt = new Date().toISOString();
  tickets[ticketIndex] = ticket;
  db.saveCollection('supportTickets', tickets);

  // Notify the user
  db.addNotification(ticket.userId, 'support_reply', `Support response: "${reply.substring(0, 30)}..."`);

  res.json(ticket);
});

// Resolve a ticket
router.post('/admin/resolve', (req, res) => {
  const { ticketId } = req.body;
  const tickets = db.getCollection('supportTickets') || [];
  const ticketIndex = tickets.findIndex(t => t.id === ticketId);

  if (ticketIndex === -1) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  tickets[ticketIndex].status = 'resolved';
  tickets[ticketIndex].updatedAt = new Date().toISOString();
  db.saveCollection('supportTickets', tickets);

  res.json({ message: "Ticket marked as resolved." });
});

export default router;
