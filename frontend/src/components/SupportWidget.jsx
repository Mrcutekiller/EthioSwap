import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { subscribeToChatMessages, sendSupportMessage } from '../lib/firebase.js';

const getBotResponse = (text) => {
  const t = text.toLowerCase().trim();
  
  if (t.includes('how it work') || t.includes('how to use') || t.includes('what is this') || t.includes('how does it work') || t.includes('how it works')) {
    return "🛡️ **How EthioSwap Works:**\n\n1. **Listings**: Choose a CBE/Telebirr trade listing or create your own.\n2. **Secure Escrow**: The seller's USD is safely locked by our system escrow.\n3. **Payment**: The buyer sends money directly to the seller via their bank/wallet.\n4. **Release**: Once paid, the seller confirms and releases the USD directly to the buyer's wallet.\n\nEthioSwap is trusted and secured, making P2P trading smooth and fast!";
  }
  
  if (t.includes('who developed') || t.includes('who made') || t.includes('who built') || t.includes('developer') || t.includes('creator') || t.includes('developed by')) {
    return "💻 **EthioSwap Developers:**\n\nEthioSwap was developed by a professional group of traders who wanted to build a secure, fast, and transparent peer-to-peer (P2P) escrow platform for local exchanges.";
  }
  
  if (t.includes('fee') || t.includes('commission') || t.includes('cost') || t.includes('price') || t.includes('charge')) {
    return "💰 **EthioSwap Fees:**\n\n• P2P trades: very low commission\n• Deposits: small platform fee\n• Withdrawals: transparent fee shown before confirming\n• Funded accounts: we charge a service fee on top of prop firm prices\n\nAll fees are shown clearly before you confirm any transaction!";
  }
  
  if (t.includes('deposit') || t.includes('add money') || t.includes('fund') || t.includes('top up')) {
    return "💳 **How to Deposit:**\n\n1. Go to your **Wallet** tab\n2. Click **Deposit**\n3. Send the exact amount in ETH/USDT to the shown address\n4. Our team will credit your account within 30 minutes\n\nFor amounts over $100, please reach out to support after sending!";
  }
  
  if (t.includes('withdraw') || t.includes('cash out') || t.includes('send money')) {
    return "💸 **How to Withdraw:**\n\n1. Go to your **Wallet** tab\n2. Click **Withdraw**\n3. Enter your ETH/USDT wallet address and amount\n4. Confirm — funds arrive within 1-2 hours\n\nMinimum withdrawal is $10. Maximum $1,000/day for security.";
  }
  
  if (t.includes('funded') || t.includes('prop') || t.includes('ftmo') || t.includes('challenge') || t.includes('trader')) {
    return "📈 **Funded Accounts:**\n\nEthioSwap helps Ethiopian traders access top prop firms like **FTMO, The5ers, Funding Pips, Funded Next** and more!\n\nGo to the **Funded** tab to:\n✅ Browse all firms and plans\n✅ Filter by account size and type\n✅ Purchase challenges — we buy on your behalf\n✅ Track your order status";
  }
  
  if (t.includes('real person') || t.includes('support') || t.includes('issue') || t.includes('error') || t.includes('problem') || t.includes('bug') || t.includes('failed') || t.includes('not working') || t.includes('help') || t.includes('dispute') || t.includes('admin')) {
    return "📞 **Live Support:**\n\nYou're now connected to our **live support chat** powered by Firebase! 🔴\n\nType your detailed issue below and a real support agent will reply shortly. Average response time: **under 30 minutes**.";
  }
  
  return "🤖 **EthioSwap Assistant:**\n\nI can help you with quick info! Ask me:\n- \"How does it work?\"\n- \"How to deposit or withdraw?\"\n- \"What are the fees?\"\n- \"Tell me about funded accounts\"\n- Or type **\"support\"** to connect with a live agent.";
};

const SupportWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('menu'); // 'menu' | 'bot' | 'live'
  const [messages, setMessages] = useState([]);
  const [liveMessages, setLiveMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) scrollToBottom();
  }, [messages, liveMessages, isTyping]);

  // Subscribe to Firebase live chat messages
  useEffect(() => {
    if (!user || mode !== 'live') return;
    
    const unsubscribe = subscribeToChatMessages(
      `support/${user.id}`,
      (msgs) => {
        setLiveMessages(msgs);
        if (!isOpen) setUnread(prev => prev + 1);
        scrollToBottom();
      },
      50
    );
    return unsubscribe;
  }, [user, mode]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const addBotMessage = useCallback((text, isBot = true) => {
    setMessages(prev => [...prev, { id: Date.now(), text, isBot, timestamp: new Date() }]);
  }, []);

  const handleBotSend = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userText = input.trim();
    setInput('');
    addBotMessage(userText, false);
    setIsTyping(true);
    
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
    setIsTyping(false);
    
    const response = getBotResponse(userText);
    addBotMessage(response, true);
    
    // If user seems to need real support, suggest live chat
    const lowerText = userText.toLowerCase();
    if (lowerText.includes('support') || lowerText.includes('issue') || lowerText.includes('problem') || lowerText.includes('help')) {
      setTimeout(() => {
        addBotMessage("💬 **Want to talk to a real person?** Click the **Live Support** button in the menu to chat with our team.", true);
      }, 1200);
    }
  }, [input, addBotMessage]);

  const handleLiveSend = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    const userText = input.trim();
    setInput('');
    setLoading(true);
    
    try {
      const result = await sendSupportMessage(user.id, user.username || user.full_name, userText);
      if (!result.success) {
        // Fallback: save to Supabase support_tickets
        await supabase.from('support_tickets').insert({
          user_id: user.id,
          username: user.username,
          subject: 'Live Chat Message',
          status: 'open',
          messages: [{ sender_id: user.id, sender_name: user.username, message: userText, timestamp: new Date().toISOString() }],
        });
        // Also notify admin via Supabase
        const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
        if (admins) {
          for (const a of admins) {
            await supabase.from('notifications').insert({
              user_id: a.id, type: 'support_new', title: '🆘 New Live Support Message',
              message: `@${user.username || 'User'}: ${userText.slice(0, 80)}`, is_read: false
            });
          }
        }
      } else {
        // Notify admin via Supabase as well for Firebase messages
        const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
        if (admins) {
          for (const a of admins) {
            await supabase.from('notifications').insert({
              user_id: a.id, type: 'support_new', title: '💬 Live Chat Message',
              message: `@${user.username || 'User'}: ${userText.slice(0, 80)}`, is_read: false
            }).then(() => {}).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('Support message error:', err);
    } finally {
      setLoading(false);
    }
  }, [input, user]);

  if (!user || user.role === 'admin') return null;

  const formatTime = (ts) => {
    const d = ts instanceof Date ? ts : new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const renderBotText = (text) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <div key={i} style={{ marginBottom: line === '' ? '8px' : '2px' }}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
        </div>
      );
    });
  };

  return (
    <>
      <style>{`
        @keyframes swBounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes swPing { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(1.6);opacity:0} }
        @keyframes swSlide { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes swTyping { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        .sw-btn:hover { filter: brightness(1.15); transform: scale(1.05) !important; }
        .sw-msg-input:focus { outline: none; border-color: #F5A623 !important; box-shadow: 0 0 0 3px rgba(245,166,35,0.15); }
        .sw-send-btn:hover { background: linear-gradient(135deg, #FFB740, #F5A623) !important; }
        .sw-mode-btn:hover { background: rgba(245,166,35,0.12) !important; border-color: rgba(245,166,35,0.4) !important; }
      `}</style>

      {/* ── Floating Button ── */}
      <button
        className="sw-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: '80px', right: '20px', zIndex: 9000,
          width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #F5A623, #D88E10)',
          boxShadow: '0 4px 20px rgba(245,166,35,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', transition: 'all 0.25s ease',
          animation: !isOpen ? 'swBounce 3s infinite' : 'none',
        }}
        title="EthioSwap Support"
      >
        {isOpen ? <i className="ti ti-x" style={{ fontSize: '20px', color: '#fff' }} /> : <i className="ti ti-message-circle" style={{ fontSize: '22px', color: '#fff' }} />}
        {unread > 0 && !isOpen && (
          <div style={{
            position: 'absolute', top: '-2px', right: '-2px', width: '18px', height: '18px',
            background: '#EF4444', borderRadius: '50%', border: '2px solid #0B0E1A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 800, color: '#fff',
          }}>{unread}</div>
        )}
      </button>

      {/* ── Widget Panel ── */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '148px', right: '20px', zIndex: 8999,
          width: '360px', maxHeight: '550px',
          background: '#0D1117', borderRadius: '20px',
          border: '1px solid rgba(245,166,35,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'swSlide 0.3s ease',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1A1F35, #141827)',
            borderBottom: '1px solid rgba(245,166,35,0.1)',
            padding: '16px 20px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #F5A623, #D88E10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0,
              }}>
                <i className="ti ti-headset" style={{ color: '#fff', fontSize: '18px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>EthioSwap Support</div>
                <div style={{ fontSize: '11px', color: '#00C896', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00C896', display: 'inline-block', animation: 'swPing 2s infinite' }} />
                  Online · Avg response &lt; 30 min
                </div>
              </div>
              {(mode === 'bot' || mode === 'live') && (
                <button onClick={() => { setMode('menu'); setMessages([]); setLiveMessages([]); }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: '#8A9BB8', padding: '6px 10px', cursor: 'pointer', fontSize: '11px' }}>
                  ← Menu
                </button>
              )}
            </div>
          </div>

          {/* ── Menu Mode ── */}
          {mode === 'menu' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: '#8A9BB8', margin: 0, lineHeight: 1.5 }}>
                Hello, <strong style={{ color: '#fff' }}>{user.username || user.full_name}</strong>! 👋<br />
                How can we help you today?
              </p>
              <button className="sw-mode-btn" onClick={() => { setMode('bot'); addBotMessage("👋 Hi! I'm EthioSwap's AI assistant. Ask me anything or type **\"support\"** to chat with a real person.", true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245,166,35,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🤖</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>AI Assistant</div>
                  <div style={{ fontSize: '11px', color: '#8A9BB8' }}>Instant answers to common questions</div>
                </div>
                <i className="ti ti-arrow-right" style={{ marginLeft: 'auto', color: '#F5A623', fontSize: '16px' }} />
              </button>
              <button className="sw-mode-btn" onClick={() => setMode('live')}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>💬</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Live Support <span style={{ background: '#00C896', color: '#000', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>LIVE</span></div>
                  <div style={{ fontSize: '11px', color: '#8A9BB8' }}>Chat with a real support agent</div>
                </div>
                <i className="ti ti-arrow-right" style={{ marginLeft: 'auto', color: '#00C896', fontSize: '16px' }} />
              </button>
              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '11px', color: '#5A6275', textAlign: 'center' }}>
                🔒 Powered by Firebase · End-to-end encrypted
              </div>
            </div>
          )}

          {/* ── Bot Chat Mode ── */}
          {mode === 'bot' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: msg.isBot ? 'row' : 'row-reverse', gap: '8px', alignItems: 'flex-end' }}>
                    {msg.isBot && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #D88E10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>🤖</div>
                    )}
                    <div style={{
                      maxWidth: '80%', padding: '10px 14px', borderRadius: msg.isBot ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                      background: msg.isBot ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #F5A623, #D88E10)',
                      color: msg.isBot ? '#E5E7EB' : '#0A0C12',
                      fontSize: '12.5px', lineHeight: 1.55,
                    }}>
                      {renderBotText(msg.text)}
                      <div style={{ fontSize: '10px', color: msg.isBot ? '#5A6275' : 'rgba(10,12,18,0.5)', marginTop: '4px', textAlign: 'right' }}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #D88E10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
                    <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F5A623', animation: `swTyping 1.2s ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleBotSend} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                <input ref={inputRef} className="sw-msg-input" value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '13px', transition: 'all 0.2s' }} />
                <button type="submit" className="sw-send-btn" disabled={!input.trim()}
                  style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #F5A623, #D88E10)', border: 'none', borderRadius: '12px', color: '#0A0C12', cursor: input.trim() ? 'pointer' : 'not-allowed', opacity: input.trim() ? 1 : 0.5, transition: 'all 0.2s' }}>
                  <i className="ti ti-send" style={{ fontSize: '16px' }} />
                </button>
              </form>
            </>
          )}

          {/* ── Live Support Mode (Firebase) ── */}
          {mode === 'live' && (
            <>
              <div style={{ padding: '10px 16px', background: 'rgba(0,200,150,0.06)', borderBottom: '1px solid rgba(0,200,150,0.1)', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: '#00C896', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00C896', display: 'inline-block' }} />
                  Live chat powered by Firebase · Messages are end-to-end secure
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {liveMessages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#5A6275', fontSize: '12px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                    <div style={{ fontWeight: 600, color: '#8A9BB8', marginBottom: '4px' }}>Start a conversation</div>
                    <div>Type your question or issue below. Our team typically responds in under 30 minutes.</div>
                  </div>
                )}
                {liveMessages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: isMe ? 'linear-gradient(135deg, #F5A623, #D88E10)' : 'linear-gradient(135deg, #00C896, #00A87A)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 800, color: '#fff',
                      }}>{isMe ? (user.username?.[0] || 'U').toUpperCase() : '🛡'}</div>
                      <div style={{ maxWidth: '75%' }}>
                        <div style={{ fontSize: '10px', color: '#5A6275', marginBottom: '4px', textAlign: isMe ? 'right' : 'left' }}>
                          {isMe ? 'You' : msg.senderName || 'Support Agent'}
                        </div>
                        <div style={{
                          padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isMe ? 'linear-gradient(135deg, #F5A623, #D88E10)' : 'rgba(0,200,150,0.1)',
                          color: isMe ? '#0A0C12' : '#E5E7EB',
                          fontSize: '12.5px', lineHeight: 1.55,
                          border: isMe ? 'none' : '1px solid rgba(0,200,150,0.2)',
                        }}>
                          {msg.text}
                          <div style={{ fontSize: '10px', color: isMe ? 'rgba(10,12,18,0.5)' : '#5A6275', marginTop: '4px', textAlign: 'right' }}>
                            {formatTime(new Date(msg.createdAt))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleLiveSend} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                <input ref={inputRef} className="sw-msg-input" value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Type your message..."
                  style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '13px', transition: 'all 0.2s' }} />
                <button type="submit" className="sw-send-btn" disabled={!input.trim() || loading}
                  style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #00C896, #00A87A)', border: 'none', borderRadius: '12px', color: '#fff', cursor: (input.trim() && !loading) ? 'pointer' : 'not-allowed', opacity: (input.trim() && !loading) ? 1 : 0.5, transition: 'all 0.2s' }}>
                  {loading ? <i className="ti ti-loader-2" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }} /> : <i className="ti ti-send" style={{ fontSize: '16px' }} />}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default SupportWidget;
