import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Send, Image as ImageIcon, Check, CheckCheck, AlertCircle, X, ZoomIn, Clock, Shield, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation } from "convex/react";
import { api } from "convex-api";

const ImageZoomModal = ({ src, onClose }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
    <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <X size={20} />
    </button>
    <img src={src} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
  </div>
);

const TradeChat = ({ tradeId, sellerId, buyerId, tradeStatus }) => {
  const { user, markTradeAsPaid, releaseEscrow, openDispute, setError, setSuccess } = useAuth();
  const { t } = useTranslation();
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const otherUserId = user.id === sellerId ? buyerId : sellerId;
  const isBuyer = user.id === buyerId;
  const isActive = ['payment_pending', 'paid'].includes(tradeStatus);

  const messagesFromQuery = useQuery(api.messages.listForTrade, { tradeId }) || [];
  const sendMessageMutation = useMutation(api.messages.send);

  const messages = messagesFromQuery.map(m => ({
    id: m._id,
    sender_id: m.senderId,
    message_text: m.messageText,
    message_type: m.messageType,
    created_at: m.createdAt,
    sender: { username: m.senderUsername || 'User', selected_avatar: null }
  }));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleTyping = useCallback(() => {
    // Typing state is currently silent in Convex
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage;
    setNewMessage('');

    await sendMessageMutation({
      tradeId,
      senderId: user.id,
      senderUsername: user.username,
      messageText: msgText,
      messageType: 'text',
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // For simplicity in the P2P chat, we mock the image upload but insert the message to backend
      await sendMessageMutation({
        tradeId,
        senderId: user.id,
        senderUsername: user.username,
        messageText: 'Sent an image: ' + file.name,
        messageType: 'text',
      });
    } catch (error) {
      setError('Error uploading image!');
    } finally {
      setUploading(false);
    }
  };

  const sendSystemMessage = async (text) => {
    await sendMessageMutation({
      tradeId,
      senderId: 'system',
      senderUsername: 'System',
      messageText: text,
      messageType: 'system',
    });
  };

  const handleMarkPaid = async () => {
    if (!window.confirm("Confirm that you have sent the payment?")) return;
    await markTradeAsPaid(tradeId);
    await sendSystemMessage('Payment marked as sent');
  };

  const handleConfirmReceived = async () => {
    if (!window.confirm("Confirm that you have received the payment? This will release the USDT to the buyer.")) return;
    await releaseEscrow(tradeId);
    await sendSystemMessage('Trade completed');
  };

  const handleOpenDispute = async () => {
    const reason = prompt("Why are you opening a dispute?");
    if (reason) {
      await openDispute(tradeId, reason);
      await sendSystemMessage('Dispute opened: ' + reason);
    }
  };

  const getUnreadCount = () => 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
      {zoomImage && <ImageZoomModal src={zoomImage} onClose={() => setZoomImage(null)} />}

      {/* Trade Controls Bar */}
      {isActive && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isBuyer && tradeStatus === 'payment_pending' && (
            <button onClick={handleMarkPaid} style={{ flex: 1, minWidth: '120px', padding: '10px 12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Shield size={14} /> {t('Mark Payment Sent')}
            </button>
          )}
          {!isBuyer && tradeStatus === 'paid' && (
            <button onClick={handleConfirmReceived} style={{ flex: 1, minWidth: '120px', padding: '10px 12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Shield size={14} /> {t('Confirm Payment Received')}
            </button>
          )}
          {tradeStatus !== 'completed' && tradeStatus !== 'cancelled' && (
            <button onClick={handleOpenDispute} style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <AlertTriangle size={14} /> {t('Open Dispute')}
            </button>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user.id;
          const isSystem = msg.message_type === 'system';
          const showAvatar = !isMe && !isSystem && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);

          if (isSystem) {
            return (
              <div key={msg.id || i} style={{ textAlign: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <AlertCircle size={12} /> {t(msg.message_text)}
              </div>
            );
          }

          return (
            <div key={msg.id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
              {!isMe && (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0, visibility: showAvatar ? 'visible' : 'hidden' }}>
                  <img src={msg.sender?.selected_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender?.username}`} style={{ width: '100%', height: '100%' }} alt="" />
                </div>
              )}
              <div style={{ maxWidth: '75%' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: isMe ? '#4f46e5' : 'var(--bg-elevated)',
                  color: '#fff',
                  fontSize: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  position: 'relative'
                }}>
                  {msg.message_type === 'image' ? (
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setZoomImage(msg.image_url)}>
                      <img src={msg.image_url} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} alt="" />
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', padding: '4px' }}>
                        <ZoomIn size={14} color="white" />
                      </div>
                    </div>
                  ) : (
                    msg.message_text
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '4px', marginTop: '4px', paddingLeft: isMe ? 0 : '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && (
                    msg.is_read
                      ? <CheckCheck size={12} color="#00d4a0" />
                      : <Check size={12} color="var(--text-3)" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {otherUserTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-3)', animation: 'typing 1.4s infinite' }} />
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-3)', animation: 'typing 1.4s 0.2s infinite' }} />
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-3)', animation: 'typing 1.4s 0.4s infinite' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {isActive && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0 }}>
              <ImageIcon size={20} />
              <input type="file" hidden accept="image/jpeg,image/png,application/pdf" onChange={handleImageUpload} disabled={uploading} />
            </label>
            <input
              type="text"
              placeholder={t("Type a message...")}
              className="input"
              style={{ flex: 1, marginBottom: 0 }}
              value={newMessage}
              onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
            />
            <button type="submit" disabled={!newMessage.trim()} style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: newMessage.trim() ? '#4f46e5' : 'var(--bg-elevated)', color: newMessage.trim() ? 'white' : 'var(--text-3)', cursor: newMessage.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <Send size={18} />
            </button>
          </form>
          {uploading && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '6px', textAlign: 'center' }}>Uploading image...</div>}
        </div>
      )}

      {!isActive && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', borderTop: '1px solid var(--border)' }}>
          This trade is no longer active
        </div>
      )}

      <style>{`
        @keyframes typing {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

export default TradeChat;
