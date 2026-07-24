import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as net from 'net'
import * as tls from 'tls'

// Runs every hour via Vercel Cron + cron-job.org
// Checks for practice_metrics due this hour and sends SMS or email

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── SMS ─────────────────────────────────────────────────────────────────────

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

// ── Email (built-in SMTP over STARTTLS — no npm packages) ───────────────────

/** Read one complete SMTP response (handles multi-line 250- continuations). Returns the 3-digit code. */
function readSmtp(sock: net.Socket | tls.TLSSocket): Promise<number> {
  return new Promise((resolve, reject) => {
    let buf = ''
    const timer = setTimeout(() => {
      sock.removeListener('data', handler)
      reject(new Error('SMTP read timeout'))
    }, 10000)
    const handler = (chunk: Buffer) => {
      buf += chunk.toString()
      // Final line of an SMTP response has a space after the 3-digit code, not a dash
      const m = buf.match(/^(\d{3}) /m)
      if (m) {
        clearTimeout(timer)
        sock.removeListener('data', handler)
        resolve(parseInt(m[1]))
      }
    }
    sock.on('data', handler)
  })
}

function smtpWrite(sock: net.Socket | tls.TLSSocket, line: string): void {
  sock.write(line + '\r\n')
}

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.EMAIL_HOST || 'smtp.office365.com'
  const port = parseInt(process.env.EMAIL_PORT || '587')
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS
  const fromName = process.env.EMAIL_FROM_NAME || 'AGL Habit Builder'

  if (!user || !pass) return { ok: false, error: 'EMAIL_USER or EMAIL_PASS not configured' }

  return new Promise((resolve) => {
    let settled = false
    const done = (result: { ok: boolean; error?: string }) => {
      if (!settled) { settled = true; resolve(result) }
    }

    const socket = net.createConnection(port, host)
    socket.setTimeout(20000)
    socket.on('timeout', () => done({ ok: false, error: 'SMTP connection timeout' }))
    socket.on('error', (e) => done({ ok: false, error: `Socket error: ${e.message}` }))

    ;(async () => {
      try {
        await readSmtp(socket)                                                    // 220 greeting
        smtpWrite(socket, 'EHLO agl-practice-tracker.vercel.app')
        await readSmtp(socket)                                                    // 250

        smtpWrite(socket, 'STARTTLS')
        await readSmtp(socket)                                                    // 220 go ahead

        // Upgrade to TLS
        const secure = tls.connect({ socket, servername: host })
        await new Promise<void>((res, rej) => {
          secure.once('secureConnect', res)
          secure.once('error', rej)
        })

        smtpWrite(secure, 'EHLO agl-practice-tracker.vercel.app')
        await readSmtp(secure)                                                    // 250

        smtpWrite(secure, 'AUTH LOGIN')
        await readSmtp(secure)                                                    // 334 username?
        smtpWrite(secure, Buffer.from(user).toString('base64'))
        await readSmtp(secure)                                                    // 334 password?
        smtpWrite(secure, Buffer.from(pass).toString('base64'))
        const authCode = await readSmtp(secure)                                  // 235
        if (authCode !== 235) throw new Error(`AUTH failed (code ${authCode})`)

        smtpWrite(secure, `MAIL FROM:<${user}>`)
        await readSmtp(secure)                                                    // 250
        smtpWrite(secure, `RCPT TO:<${to}>`)
        await readSmtp(secure)                                                    // 250

        smtpWrite(secure, 'DATA')
        await readSmtp(secure)                                                    // 354

        const boundary = `----AGL${Date.now()}`
        const message = [
          `From: "${fromName}" <${user}>`,
          `To: ${to}`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset=UTF-8',
          '',
          text,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=UTF-8',
          '',
          html,
          '',
          `--${boundary}--`,
          '.',
        ].join('\r\n')

        secure.write(message + '\r\n')
        await readSmtp(secure)                                                    // 250 sent

        smtpWrite(secure, 'QUIT')
        secure.destroy()
        socket.destroy()
        done({ ok: true })
      } catch (e) {
        socket.destroy()
        done({ ok: false, error: e instanceof Error ? e.message : String(e) })
      }
    })()
  })
}

function buildEmailHtml(
  firstName: string,
  promptText: string,
  metricName: string,
  dashboardUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #404040;">
  <img src="${process.env.NEXT_PUBLIC_SITE_URL}/agl-logo.png" alt="AGL Coaching" style="width: 120px; margin-bottom: 24px;" />
  <h2 style="color: #1F3864; margin-bottom: 8px;">Hi ${firstName},</h2>
  <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${promptText}</p>
  <a href="${dashboardUrl}"
     style="display: inline-block; background: #2E75B6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
    Log My Progress
  </a>
  <p style="margin-top: 24px; font-size: 13px; color: #6B7280;">
    You can also view your full progress history at:<br/>
    <a href="${dashboardUrl}" style="color: #2E75B6;">${dashboardUrl}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9CA3AF;">
    This reminder is from your AGL coach for the practice: <strong>${metricName}</strong>
  </p>
</body>
</html>`
}

// ── Main cron handler ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Verify secret — accepts Authorization header (Vercel cron) or ?secret= param (external cron)
  const authHeader = req.headers.get('authorization')
  const urlSecret = new URL(req.url).searchParams.get('secret')
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isExternalCron = urlSecret === process.env.CRON_SECRET
  if (!isVercelCron && !isExternalCron) {
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

  // Fetch ALL active metrics (SMS and email) with their client
  const { data: metrics, error: metricsError } = await admin
    .from('practice_metrics')
    .select(`
      id, name, prompt_text, send_time, send_days, delivery_method, client_id,
      client:clients!inner(id, first_name, email, phone, timezone, dashboard_token)
    `)
    .eq('is_active', true)
    .in('delivery_method', ['sms', 'email'])

  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 })
  }

  for (const metric of metrics || []) {
    const client = metric.client as {
      id: string
      first_name: string
      email: string
      phone: string | null
      timezone: string
      dashboard_token: string
    }

    // Get current time in client's timezone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: client.timezone || 'America/New_York',
      hour: 'numeric',
      weekday: 'long',
      hour12: false,
    }).formatToParts(now)

    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0') % 24
    // MetricWizard stores days as 3-letter abbreviations: 'Mon', 'Tue', etc.
    const currentDay = parts.find(p => p.type === 'weekday')?.value?.slice(0, 3) || ''

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

    // Check if already sent today
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

    // All checks passed — send via the appropriate channel
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/c/${client.dashboard_token}`
    let result: { ok: boolean; error?: string }

    if (metric.delivery_method === 'sms') {
      if (!client.phone) {
        skipped.push(`${metric.id} — no phone for SMS`)
        continue
      }
      const smsBody = `${metric.prompt_text} Reply with a number.\n\nView your progress: ${dashboardUrl}`
      result = await sendSms(normalizePhone(client.phone), smsBody)
    } else {
      // email
      const subject = `Practice reminder: ${metric.name}`
      const text = `Hi ${client.first_name},\n\n${metric.prompt_text}\n\nLog your progress here: ${dashboardUrl}`
      const html = buildEmailHtml(client.first_name, metric.prompt_text, metric.name, dashboardUrl)
      result = await sendEmail(client.email, subject, text, html)
    }

    if (result.ok) {
      await admin.from('reminder_jobs').insert({
        metric_id: metric.id,
        scheduled_for: now.toISOString(),
        sent_at: now.toISOString(),
        status: 'sent',
        response_received: false,
      })
      sent.push(`${metric.id} → ${metric.delivery_method} → ${metric.delivery_method === 'sms' ? client.phone : client.email}`)
    } else {
      await admin.from('reminder_jobs').insert({
        metric_id: metric.id,
        scheduled_for: now.toISOString(),
        status: 'failed',
        response_received: false,
      })
      errors.push(`${metric.id} — ${result.error}`)
    }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    sent,
    skipped,
    errors,
  })
}
