import { createClient } from '@supabase/supabase-js'

// Twilio posts here when a client replies to an SMS reminder
// Configure this URL in the Twilio console under your phone number's messaging webhook

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function twiml(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return digits
}

export async function POST(req: Request) {
  const body = await req.text()
  const params = new URLSearchParams(body)

  const from = params.get('From') || ''       // e.g. "+18322702630"
  const messageBody = params.get('Body')?.trim() || ''

  if (!from || !messageBody) {
    return twiml('Could not process your message. Please contact your coach.')
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find client by phone — normalize both to 10-digit comparison
  const fromDigits = normalizePhone(from)

  const { data: allClients } = await admin
    .from('clients')
    .select('id, first_name, phone, dashboard_token')
    .not('phone', 'is', null)

  const client = (allClients || []).find(c => {
    const stored = normalizePhone(c.phone || '')
    return stored === fromDigits
  }) as { id: string; first_name: string; phone: string; dashboard_token: string } | undefined

  if (!client) {
    return twiml('We could not find your account. Please contact your coach.')
  }

  // Extract a number from the reply
  const match = messageBody.match(/[-\d.]+/)
  if (!match) {
    return twiml(
      `Hi ${client.first_name}, please reply with just a number (for example, "7" or "8.5").`
    )
  }
  const value = parseFloat(match[0])
  if (isNaN(value)) {
    return twiml(`Hi ${client.first_name}, couldn't read that as a number. Please try again.`)
  }

  // Find the most recent unanswered reminder for this client's metrics
  const { data: clientMetrics } = await admin
    .from('practice_metrics')
    .select('id')
    .eq('client_id', client.id)
    .eq('is_active', true)

  if (!clientMetrics || clientMetrics.length === 0) {
    return twiml(`Thanks ${client.first_name}! Your response was received.`)
  }

  const metricIds = clientMetrics.map(m => m.id)

  const { data: recentJob } = await admin
    .from('reminder_jobs')
    .select('id, metric_id')
    .in('metric_id', metricIds)
    .eq('status', 'sent')
    .eq('response_received', false)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!recentJob) {
    // No open reminder — log against their first active metric as a manual entry
    const fallbackMetricId = metricIds[0]
    await admin.from('practice_logs').insert({
      metric_id: fallbackMetricId,
      client_id: client.id,
      logged_value: value,
      logged_at: new Date().toISOString(),
      source: 'sms',
      raw_response: messageBody,
    })
    return twiml(`Got it, ${client.first_name}! Logged ${value}. Keep going!`)
  }

  // Log the practice entry
  await admin.from('practice_logs').insert({
    metric_id: recentJob.metric_id,
    client_id: client.id,
    logged_value: value,
    logged_at: new Date().toISOString(),
    source: 'sms',
    raw_response: messageBody,
  })

  // Mark the reminder as responded
  await admin
    .from('reminder_jobs')
    .update({ response_received: true })
    .eq('id', recentJob.id)

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/c/${client.dashboard_token}`
  return twiml(`Got it, ${client.first_name}! Logged ${value}. Keep it up!\n\nView your progress: ${dashboardUrl}`)
}
