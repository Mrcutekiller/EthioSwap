
// Using service role key for server-side operations is recommended, 
// but in a client-side Vite app we use the configured supabase client.
// For true security, this logic should be in an Edge Function.

export async function notify({
  userId,
  userEmail,
  userName,
  type,
  title,
  body,
  amountUsd,
  amountEtb,
  counterpartyUsername,
  transactionId,
  emailData = {}
}) {
  try {
    // 1. Insert notification row (triggers Realtime)
    const { error: dbError } = // await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        body,
        amount_usd: amountUsd,
        amount_etb: amountEtb,
        counterparty_username: counterpartyUsername,
        transaction_id: transactionId,
        is_read: false
      }])

    if (dbError) console.error('Notification DB error:', dbError.message)

    // 2. Invoke Edge Function to send email
    const { error: emailError } = // await // supabase.functions.invoke('send-notification-email', {
      body: {
        to_email: userEmail,
        to_name: userName,
        type,
        data: {
          title,
          body,
          amount_usd: amountUsd,
          amount_etb: amountEtb,
          counterparty: counterpartyUsername,
          tx_id: transactionId,
          ...emailData
        }
      }
    })

    if (emailError) console.error('Email send error:', emailError.message)
  } catch (err) {
    console.error('Notify helper error:', err.message)
  }
}
