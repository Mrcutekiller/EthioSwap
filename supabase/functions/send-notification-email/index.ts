import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'EthioSwap <notifications@ethioswap.qzz.io>'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { to_email, to_name, type, data } = await req.json()
    const { subject, html } = buildEmail(type, to_name, data)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to_email],
        subject,
        html
      })
    })

    const result = await res.json()
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})

function buildEmail(type: string, name: string, data: any): { subject: string, html: string } {
  const getTitle = (type: string) => {
    switch (type) {
      case 'deposit_confirmed': return 'Deposit Confirmed'
      case 'p2p_trade_opened': return 'New Trade Request'
      case 'p2p_completed': return 'Trade Completed'
      case 'send_received': return 'Funds Received'
      case 'kyc_approved': return 'Identity Verified'
      default: return 'New Notification'
    }
  }

  const title = getTitle(type)
  const subject = `EthioSwap — ${title}`

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0A0C12; color: #F0F4FF; padding: 40px; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #D4AF37; margin: 0;">EthioSwap</h1>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 16px;">Hello ${name},</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #8899AA; margin-bottom: 24px;">
        ${data.body || 'You have a new update on your EthioSwap account.'}
      </p>
      ${data.amount_usd ? `
        <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.2); padding: 20px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 12px; color: #8899AA; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Amount</div>
          <div style="font-size: 24px; font-weight: 800; color: #D4AF37;">$${data.amount_usd} USD</div>
          ${data.amount_etb ? `<div style="font-size: 14px; color: #00d4a0; margin-top: 4px;">≈ ${data.amount_etb} ETB</div>` : ''}
        </div>
      ` : ''}
      <a href="https://ethioswap.qzz.io" style="display: block; width: 100%; padding: 16px; background: #D4AF37; color: #0A0C12; text-decoration: none; text-align: center; border-radius: 12px; font-weight: 700; font-size: 16px;">Open Dashboard</a>
      <div style="margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; font-size: 12px; color: #8899AA; text-align: center;">
        &copy; 2026 EthioSwap. Secured P2P Escrow.
      </div>
    </div>
  `

  return { subject, html }
}
