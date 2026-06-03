
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
    // Mocked for Convex migration
    console.log('Notification sent:', { title, body, userId });
  } catch (err) {
    console.error('Notify helper error:', err.message)
  }
}
