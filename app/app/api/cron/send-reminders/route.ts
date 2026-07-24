import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Runs every hour via Vercel Cron (see vercel.json)
// Checks for practice_metrics due this hour and sends SMS via Twilio

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const from = process.env.TWILIO_PHONE_NUMBER!

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    }
  )

  if (res.ok) return { ok: true }
  const text = await res.text()
  return { ok: false, error: text }
}

export async function GET(req: Request) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const sent: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  // Fetch all active SMS metrics with their client
  const { data: metrics, error: metricsError } = await admin
    .from('practice_metrics')
    .select(`
      id, name, prompt_text, send_time, send_days, client_id,
      client:clients!inner(id, first_name, phone, timezone)
    `)
    .eq('is_active', true)
    .eq('delivery_method', 'sms')

  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 })
  }

  for (const metric of metrics || []) {
    const client = metric.client as {
      id: string
      first_name: string
      phone: string | null
      timezone: string
    }

    if (!client?.phone) {
      skipped.push(`${metric.id} — no phone`)
      continue
    }

    // Get current time in client's timezone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: client.timezone || 'America/New_York',
      hour: 'numeric',
      weekday: 'long',
      hour12: false,
    }).formatToParts(now)

    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const currentDay = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() || ''

    // Parse send_time (stored as "HH:MM" or "HH:MM:SS")
    const sendHour = parseInt((metric.send_time || '08:00').split(':')[0])

    if (currentHour !== sendHour) {
      skipped.push(`${metric.id} — wrong hour (${currentHour} vs ${sendHour})`)
      continue
    }

    // Check send_days (null = every day)
    if (metric.send_days && metric.send_days.length > 0) {
      if (!metric.send_days.includes(currentDay)) {
        skipped.push(`${metric.id} — not scheduled today (${currentDay})`)
        continue
      }
    }

    // Check if already sent today for this metric (in client's timezone)
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: client.timezone || 'America/New_York',
    }).format(now) // YYYY-MM-DD

    const { data: existingJob } = await admin
      .from('reminder_jobs')
      .select('id')
      .eq('metric_id', metric.id)
      .gte('scheduled_for', todayStr)
      .in('status', ['sent', 'pending'])
      .maybeSingle()

    if (existingJob) {
      skipped.push(`${metric.id} — already sent today`)
      continue
    }

    // All checks passed — send it
    const message = `${metric.prompt_text} Reply with a number.`
    const toPhone = normalizePhone(client.phone)

    const { ok, error: smsError } = await sendSms(toPhone, message)

    if (ok) {
      await admin.from('reminder_jobs').insert({
        metric_id: metric.id,
        scheduled_for: now.toISOString(),
        sent_at: now.toISOString(),
        status: 'sent',
        response_received: false,
      })
      sent.push(`${metric.id} → ${toPhone}`)
    } else {
      await admin.from('reminder_jobs').insert({
        metric_id: metric.id,
        scheduled_for: now.toISOString(),
        status: 'failed',
        response_received: false,
      })
      errors.push(`${metric.id} — ${smsError}`)
    }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    sent,
    skipped,
    errors,
  })
}
