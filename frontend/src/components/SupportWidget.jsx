import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const getBotResponse = (text) => {
  const t = text.toLowerCase().trim();
  
  if (t.includes('how it work') || t.includes('how to use') || t.includes('what is this') || t.includes('how does it work') || t.includes('how it works')) {
    return "🛡️ **How EthioSwap Works:**\n\n1. **Listings**: Choose a CBE/Telebirr trade listing or create your own.\n2. **Secure Escrow**: The seller's USD is safely locked by our system escrow.\n3. **Payment**: The buyer sends money directly to the seller via their bank/wallet.\n4. **Release**: Once paid, the seller confirms and releases the USD directly to the buyer's wallet.\n\nEthioSwap is trusted and secured, making P2P trading smooth and fast!";
  }
  
  if (t.includes('who developed') || t.includes('who made') || t.includes('who built') || t.includes('developer') || t.includes('creator') || t.includes('developed by')) {
    return "💻 **EthioSwap Developers:**\n\nEthioSwap was developed by a professional group of traders who wanted to build a secure, fast, and transparent peer-to-peer (P2P) escrow platform for local exchanges.";
  }
  
  if (t.includes('real person') || t.includes('support') || t.includes('issue') || t.includes('error') || t.includes('problem') || t.includes('bug') || t.includes('failed') || t.includes('not working') || t.includes('help') || t.includes('dispute')) {
    return "📞 **Support Team Alert:**\n\nPlease write your detailed issue or problem report right here! The support team will review your report and get back to you within **30 minutes to 1 hour** (maximum 2 hours) to help resolve it.";
  }
  
  return "🤖 **EthioSwap Helper:**\n\nI can help you with quick info! Ask me:\n- \"How does it work?\"\n- \"Who developed this?\"\n- Or type \"support\" / \"issue\" to get in touch with a real support agent.";
};

const SupportWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('menu');
  const [botReply, setBotReply] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  if (!user || user.role === 'admin') return null;

  useEffect(() => {
    if (isOpen && user) fetchTicket();
  }, [isOpen, user]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages, botReply, isTyping]);

  const fetchTicket = async () => {
    // Mocked for Convex migration
    const data = null;
    if (data) setTicket(data);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    const userText = messageText.trim();
    setLoading(true);
    try {
      // Mocked for Convex migration
      const newMessage = { senderId: user.id, senderName: user.username, message: userText, timestamp: new Date().toISOString() };
      const updatedMessages = [...(ticket?.messages || []), newMessage];
      setTicket({ ...(ticket || { id: 'mock-ticket', status: 'open' }), messages: updatedMessages });
      setMessageText('');

      // Trigger chatbot auto-reply after a short delay
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const botReplyText = getBotResponse(userText);
        if (botReplyText) {
          const botMessage = {
            senderId: 'bot',
            senderName: 'EthioSwap Helper',
            message: botReplyText,
            timestamp: new Date().toISOString()
          };
          setTicket(prev => ({
            ...(prev || { id: 'mock-ticket', status: 'open' }),
            messages: [...(prev?.messages || []), botMessage]
          }));
        }
      }, 1200);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleBotAction = (type) => {
    setMode('bot_reply');
    if (type === 'escrow') {
      setBotReply("🛡️ **How Escrow Works:**\nWhen you click 'Buy USD ($)' or a seller opens a listing, the system automatically transfers the seller's USD to a secured escrow locker.\n\nOnly pay the seller using their specified payment details (CBE, Telebirr, etc.). Once you transfer, click 'I Have Paid'. The seller will confirm and release the USD to your wallet. If any issue arises, click 'Dispute' to summon an admin auditor.");
    } else if (type === 'deposit') {
      setBotReply("💰 **Depositing & Withdrawing:**\n- **Deposit:** Go to the Wallet tab, copy your unique wallet address, and send USD to it.\n\n- **Withdraw:** Go to the Wallet tab, enter the destination wallet address and the amount in USD, then press 'Withdraw'.");
    }
  };

  const startHumanChat = async () => {
    setMode('chat');
    if (!ticket || ticket.status === 'closed') {
      setLoading(true);
      try {
        // Mocked for Convex migration
        setTicket({ id: 'mock-ticket', status: 'open', messages: [] });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 1000, fontFamily: 'var(--font)' }}>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', border: 'none', color: '#0A0C12', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(212,175,55,0.3)' }} title="Help & Support">
          ···
        </button>
      )}
      {isOpen && (
        <div style={{ width: '330px', height: '420px', background: 'var(--bg-surface)', border: '1px solid var(--border-active)', borderRadius: '20px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #181D28, #0D111A)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-1)' }}>EthioSwap Helper</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>Active Support Bot</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', fontSize: '16px', cursor: 'pointer', padding: '4px' }}>✕</button>
          </div>
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>🤖</div>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 2px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.4' }}>
                Welcome to EthioSwap! How can we assist you with trading USD safely?
              </div>
            </div>
            {mode === 'menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                <button onClick={() => handleBotAction('escrow')} style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-1)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>🛡️ How does escrow work?</button>
                <button onClick={() => handleBotAction('deposit')} style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-1)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>💰 Deposit or Withdraw USD</button>
                <button onClick={startHumanChat} style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'var(--gold-bg)', border: '1px solid var(--border-active)', borderRadius: '8px', color: 'var(--gold-light)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>💬 Chat with Human Support</button>
                <a href="https://t.me/EthioSwapDev" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: '#0088cc', border: 'none', borderRadius: '8px', color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>✈️ Contact Developer (Telegram)</button>
                </a>
              </div>
            )}
            {mode === 'bot_reply' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', fontSize: '11px', color: 'var(--text-2)', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{botReply}</div>
                <button onClick={() => setMode('menu')} style={{ alignSelf: 'flex-start', padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-3)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>← Back to Menu</button>
              </div>
            )}
            {mode === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--gold-light)', fontWeight: 700 }}>Human Support Chat</span>
                  <button onClick={() => setMode('menu')} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>← Back</button>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', height: '170px', overflowY: 'auto', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(!ticket || !ticket.messages || ticket.messages.length === 0) ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-3)', fontSize: '11px', padding: '10px' }}>Start a chat with our admin team. Send your message below.</div>
                  ) : (
                    ticket.messages.map((m, idx) => {
                      const isMe = m.senderId === user.id;
                      return (
                        <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                          <div style={{ padding: '8px 10px', borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px', background: isMe ? 'var(--gold-bg)' : 'var(--bg-elevated)', border: `1px solid ${isMe ? 'var(--border-active)' : 'var(--border)'}`, color: isMe ? 'var(--gold-light)' : 'var(--text-1)', fontSize: '11px', wordBreak: 'break-word' }}>{m.message}</div>
                          <div style={{ fontSize: '8px', color: 'var(--text-3)', marginTop: '2px', textAlign: isMe ? 'right' : 'left' }}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      );
                    })
                  )}
                  {isTyping && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '10px 10px 10px 2px', color: 'var(--text-3)', fontSize: '10px' }}>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block', animation: 'dotDelay 1.4s infinite' }} />
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block', animation: 'dotDelay 1.4s 0.2s infinite' }} />
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block', animation: 'dotDelay 1.4s 0.4s infinite' }} />
                      <span style={{ marginLeft: '4px' }}>bot is typing...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
            )}
          </div>
          {mode === 'chat' && (
            <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '10px', borderTop: '1px solid var(--border)', gap: '6px', background: 'var(--bg-surface)' }}>
              <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Describe your issue..." style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '12px', fontFamily: 'var(--font)' }} disabled={loading} />
              <button type="submit" disabled={loading || !messageText.trim()} className="btn btn-gold" style={{ padding: '8px 12px', fontSize: '11px' }}>Send</button>
            </form>
          )}
          <style>{`
            @keyframes dotDelay {
              0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
              30% { transform: translateY(-3px); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default SupportWidget;
