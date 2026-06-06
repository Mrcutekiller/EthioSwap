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
    <img src={src} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} alt="Zoomed view" />
  </div>
);

const TradeChat = ({ tradeId, sellerId, buyerId, tradeStatus }) => {
  const { user, markTradeAsPaid, releaseEscrow, openDispute, setError, setSuccess } = useAuth();
  const { t } = useTranslation();
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const messagesEndRef = useRef(null);
  const isBuyer = user?.id === buyerId;
  const isActive = ['payment_pending', 'paid', 'disputed'].includes(tradeStatus);
  const isFinished = ['completed', 'cancelled'].includes(tradeStatus);

  const messagesFromQuery = useQuery(api.messages.listForTrade, user ? { tradeId, userId: user._id || user.id } : "skip") || [];
  const sendMessageMutation = useMutation(api.messages.send);
  const markAsReadMutation = useMutation(api.messages.markAsRead);

  const messages = messagesFromQuery.map(m => ({
    id: m._id,
    sender_id: m.senderId,
    message_text: m.messageText,
    message_type: m.messageType,
    created_at: m.createdAt,
    is_read: m.isRead,
    sender: { username: m.senderUsername || 'User', selected_avatar: null }
  }));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark messages as read when loaded and unread messages from counterparty exist
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      const hasUnread = messages.some(m => m.sender_id !== user.id && !m.is_read);
      if (hasUnread) {
        markAsReadMutation({ tradeId, userId: user.id || user._id }).catch(console.error);
      }
    }
  }, [messages, tradeId, user?.id, markAsReadMutation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const msgText = newMessage;
    setNewMessage('');

    try {
      await sendMessageMutation({
        tradeId,
        senderId: user.id,
        senderUsername: user.username,
        messageText: msgText,
        messageType: 'text',
        userId: user.id || user._id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending message');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        await sendMessageMutation({
          tradeId,
          senderId: user.id,
          senderUsername: user.username,
          messageText: base64Data,
          messageType: 'image',
          userId: user.id || user._id,
        });
      };
      reader.onerror = () => {
        setError('Error reading file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setError('Error uploading image!');
    } finally {
      setUploading(false);
    }
  };

  const sendSystemMessage = async (text) => {
    if (!user) return;
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
    try {
      await markTradeAsPaid(tradeId);
      await sendSystemMessage('Payment marked as sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleConfirmReceived = async () => {
    if (!window.confirm("Confirm that you have received the payment? This will release the USDT to the buyer.")) return;
    try {
      await releaseEscrow(tradeId);
      await sendSystemMessage('Trade completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleOpenDispute = async () => {
    const reason = prompt("Why are you opening a dispute?");
    if (reason) {
      try {
        await openDispute(tradeId, reason);
        await sendSystemMessage('Dispute opened: ' + reason);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error opening dispute');
      }
    }
  };

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
        {isFinished ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: '8px', padding: '20px', textAlign: 'center' }}>
            <Shield size={32} style={{ color: '#ef4444', opacity: 0.8 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{t('Chat Locked for Privacy')}</div>
            <div style={{ fontSize: '12px', maxWidth: '300px' }}>{t('Conversations are permanently locked and hidden once a trade has been completed or cancelled.')}</div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: '4px' }}>
            <Clock size={24} style={{ opacity: 0.5 }} />
            <div style={{ fontSize: '13px' }}>{t('No messages yet. Start the conversation!')}</div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id;
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
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender?.username}`} style={{ width: '100%', height: '100%' }} alt="" />
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
                      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setZoomImage(msg.message_text)}>
                        <img src={msg.message_text} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block', objectFit: 'cover' }} alt="Sent proof" />
                        <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '6px' }}>
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
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {isActive && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0 }}>
              <ImageIcon size={20} />
              <input type="file" hidden accept="image/jpeg,image/png" onChange={handleImageUpload} disabled={uploading} />
            </label>
            <input
              type="text"
              placeholder={t("Type a message...")}
              className="input"
              style={{ flex: 1, marginBottom: 0 }}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
            />
            <button type="submit" disabled={!newMessage.trim()} style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: newMessage.trim() ? '#4f46e5' : 'var(--bg-elevated)', color: newMessage.trim() ? 'white' : 'var(--text-3)', cursor: newMessage.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <Send size={18} />
            </button>
          </form>
          {uploading && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '6px', textAlign: 'center' }}>Uploading image...</div>}
        </div>
      )}

      {!isActive && !isFinished && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', borderTop: '1px solid var(--border)' }}>
          {t("This trade is no longer active")}
        </div>
      )}
    </div>
  );
};

export default TradeChat;
