import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, email, name } = await req.json();

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'userId and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

    // Use service role client to bypass RLS for OTP insert
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate a secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Invalidate any previous unused OTPs for this user
    await supabase
      .from('login_otps')
      .update({ used: true })
      .eq('user_id', userId)
      .eq('used', false);

    // Insert new OTP
    const { error: insertError } = await supabase
      .from('login_otps')
      .insert({
        user_id: userId,
        email,
        otp_code: otpCode,
        expires_at: expiresAt,
        used: false,
        attempts: 0,
      });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create OTP' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const displayName = name || email.split('@')[0];

    // Build styled OTP email HTML
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your EthioSwap Login Code</title>
</head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:20px;overflow:hidden;border:1px solid #1E2640;max-width:520px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#F5A623 0%,#FFE082 100%);padding:28px;text-align:center;">
              <div style="font-size:32px;font-weight:900;color:#0A0C12;letter-spacing:-1px;">EthioSwap</div>
              <div style="font-size:13px;color:rgba(0,0,0,0.55);font-weight:600;margin-top:4px;">Security Verification</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 36px;">
              <div style="text-align:center;margin-bottom:28px;">
                <div style="width:64px;height:64px;background:rgba(245,166,35,0.1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;border:1px solid rgba(245,166,35,0.2);">
                  <span style="font-size:32px;">🔐</span>
                </div>
                <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFFFFF;">Login Verification Code</h2>
                <p style="margin:0;font-size:14px;color:#8B8FA3;line-height:1.6;">
                  Hi <strong style="color:#fff;">${displayName}</strong>, someone (hopefully you!) is signing into your EthioSwap account.
                </p>
              </div>

              <!-- OTP Box -->
              <div style="background:linear-gradient(135deg,rgba(245,166,35,0.08) 0%,rgba(245,166,35,0.03) 100%);border:1.5px solid rgba(245,166,35,0.25);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <div style="font-size:11px;font-weight:700;color:#8B8FA3;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Your one-time code</div>
                <div style="font-size:48px;font-weight:900;color:#F5A623;letter-spacing:12px;font-family:'Courier New',monospace;">${otpCode}</div>
                <div style="font-size:12px;color:#8B8FA3;margin-top:12px;">⏱ Expires in <strong style="color:#fff;">5 minutes</strong></div>
              </div>

              <!-- Warning -->
              <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#FC8181;line-height:1.6;">
                  ⚠️ <strong>Never share this code.</strong> EthioSwap will never ask for your OTP via phone, chat or email. If you didn't request this, please change your password immediately.
                </p>
              </div>

              <p style="margin:0;font-size:13px;color:#5A6275;text-align:center;line-height:1.7;">
                This code will automatically expire. If you did not attempt to sign in, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1E2640;text-align:center;">
              <p style="margin:0;font-size:12px;color:#3A4255;">© 2025 EthioSwap · Secure P2P Crypto Exchange</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EthioSwap Security <noreply@ethioswap.qzz.io>',
        to: [email],
        subject: `${otpCode} is your EthioSwap login code`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error('Resend error:', resendError);
      return new Response(JSON.stringify({ error: 'Failed to send OTP email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Login OTP sent to: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('send-login-otp error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
