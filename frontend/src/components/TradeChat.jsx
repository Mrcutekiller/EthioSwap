import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Send, Image as ImageIcon, Check, CheckCheck, AlertCircle } from 'lucide-react';

const TradeChat = ({ tradeId, sellerId, buyerId }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const setupChat = async () => {
      // 1. Get or create chat for this trade
      let { data: chat, error } = await supabase
        .from('trade_chats')
        .select('id')
        .eq('trade_id', tradeId)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newChat, error: createError } = await supabase
          .from('trade_chats')
          .insert([{ trade_id: tradeId }])
          .select()
          .single();
        if (createError) console.error(createError);
        else chat = newChat;
      }

      if (chat) {
        setChatId(chat.id);
        fetchMessages(chat.id);
        subscribeToMessages(chat.id);
      }
    };

    setupChat();
  }, [tradeId]);

  const fetchMessages = async (id) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, sender:users(username, selected_avatar)')
      .eq('chat_id', id)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const subscribeToMessages = (id) => {
    const sub = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages', 
        filter: `chat_id=eq.${id}` 
      }, (payload) => {
        // Fetch sender info for the new message
        fetchSenderAndAppend(payload.new);
      })
      .subscribe();

    return () => sub.unsubscribe();
  };

  const fetchSenderAndAppend = async (msg) => {
    const { data: sender } = await supabase
      .from('users')
      .select('username, selected_avatar')
      .eq('id', msg.sender_id)
      .single();
    
    setMessages(prev => [...prev, { ...msg, sender }]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;

    const msgText = newMessage;
    setNewMessage('');

    const { error } = await supabase
      .from('chat_messages')
      .insert([{
        chat_id: chatId,
        sender_id: user.id,
        message_text: msgText,
        message_type: 'text'
      }]);
    
    if (error) console.error(error);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat-images/${chatId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      await supabase
        .from('chat_messages')
        .insert([{
          chat_id: chatId,
          sender_id: user.id,
          image_url: publicUrl,
          message_type: 'image'
        }]);

    } catch (error) {
      alert('Error uploading image!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user.id;
          const isSystem = msg.message_type === 'system';

          if (isSystem) {
            return (
              <div key={i} style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <AlertCircle size={12} /> {t(msg.message_text)}
              </div>
            );
          }

          return (
            <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
              {!isMe && (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <img src={msg.sender?.selected_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender?.username}`} style={{ width: '100%', height: '100%' }} />
                </div>
              )}
              <div style={{ maxWidth: '80%' }}>
                <div style={{ 
                  padding: '10px 14px', 
                  borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: isMe ? '#4f46e5' : 'var(--bg-elevated)',
                  color: '#fff',
                  fontSize: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {msg.message_type === 'image' ? (
                    <img src={msg.image_url} style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer' }} onClick={() => window.open(msg.image_url)} />
                  ) : (
                    msg.message_text
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && (msg.is_read ? <CheckCheck size={12} color="#00d4a0" /> : <Check size={12} color="var(--text-3)" />)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', color: 'var(--text-3)' }}>
            <ImageIcon size={20} />
            <input type="file" hidden accept="image/*" onChange={handleImageUpload} disabled={uploading} />
          </label>
          <input 
            type="text" 
            placeholder="Type a message..." 
            className="input" 
            style={{ flex: 1, marginBottom: 0 }} 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)}
          />
          <button type="submit" className="btn btn-indigo" style={{ padding: '8px 16px', borderRadius: '12px' }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default TradeChat;
