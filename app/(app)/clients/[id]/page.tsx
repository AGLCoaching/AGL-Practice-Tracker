import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ToggleClientStatus from '@/components/ToggleClientStatus'
import MetricCard from '@/components/MetricCard'
import EncouragementBox from '@/components/EncouragementBox'

function formatTimezone(tz: string): string {
  if (!tz) return '—'
  try {
    const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz
    const now = new Date()
    const abbr = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(now).find(p => p.type === 'timeZoneName')?.value || ''
    const offsetStr = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(now).find(p => p.type === 'timeZoneName')?.value || ''
    const utc = offsetStr.replace('GMT', 'UTC').replace(':00', '')
    return `${city} (${utc}) ${abbr}`
  } catch {
    return tz
  }
}

function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  // US/Canada: +1 (832) 270-2630
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  // International: keep + prefix if present, otherwise return cleaned
  if (phone.startsWith('+')) return phone
  return phone
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: metrics } = await supabase
    .from('practice_metrics')
    .select('*, logs:practice_logs(*)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const activeMetrics = metrics?.filter(m => m.is_active) || []
  const archivedMetrics = metrics?.filter(m => !m.is_active) || []

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/c/${client.dashboard_token}`

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/clients" className="text-sm mb-2 inline-block" style={{ color: 'var(--muted)' }}>
            ← All Clients
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>
            {client.first_name} {client.last_name}
          </h1>
          {client.company_name && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              {client.title ? `${client.title}, ` : ''}{client.company_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ToggleClientStatus clientId={client.id} isActive={client.is_active} clientFirstName={client.first_name} />
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-white rounded-xl border p-5 mb-6 flex items-start gap-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 grid grid-cols-4 gap-4">
          <InfoItem label="Email" value={client.email} />
          <InfoItem label="Phone" value={formatPhone(client.phone)} />
          <InfoItem label="Time Zone" value={formatTimezone(client.timezone)} />
          <InfoItem label="Contact Method" value={client.preferred_contact === 'sms' ? 'SMS' : 'Email'} />
        </div>
        <Link
          href={`/clients/${id}/edit`}
          className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium border"
          style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
        >
          Edit
        </Link>
      </div>

      {/* Active practices */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold" style={{ color: 'var(--navy)' }}>Practice</h2>
        <Link
          href={`/metrics/new?clientId=${id}`}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: 'var(--blue)' }}
        >
          + Add Practice
        </Link>
      </div>

      {activeMetrics.length > 0 ? (
        <div className="space-y-6 mb-6">
          {activeMetrics.map((metric) => (
            <div key={metric.id}>
              <MetricCard metric={metric} clientId={id} dashboardUrl={dashboardUrl} />
              <EncouragementBox metricId={metric.id} clientId={id} clientFirstName={client.first_name} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-8 text-center mb-6" style={{ borderColor: 'var(--border)' }}>
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No active practices. Add one to get started.</p>
        </div>
      )}

      {/* Archived */}
      {archivedMetrics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--muted)' }}>ARCHIVED PRACTICES</h3>
          <div className="space-y-2">
            {archivedMetrics.map((metric) => (
              <div key={metric.id} className="bg-white rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: 'var(--border)', opacity: 0.7 }}>
                <span className="text-sm" style={{ color: 'var(--text)' }}>{metric.name}</span>
                <Link href={`/metrics/${metric.id}`} className="text-xs" style={{ color: 'var(--blue)' }}>View</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-sm" style={{ color: 'var(--text)' }}>{value}</div>
    </div>
  )
}
