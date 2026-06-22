import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import DeleteMetricButton from '@/components/DeleteMetricButton'

export default async function MetricDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: metric } = await admin
    .from('practice_metrics')
    .select('*, client:client_id(id, first_name, last_name)')
    .eq('id', id)
    .single()

  if (!metric) notFound()

  const { data: logs } = await admin
    .from('practice_logs')
    .select('*')
    .eq('metric_id', id)
    .order('logged_at', { ascending: false })

  const client = metric.client as { id: string; first_name: string; last_name: string }

  const daysMap: Record<string, string> = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
    Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href={`/clients/${client.id}`} className="text-sm mb-2 inline-block" style={{ color: 'var(--muted)' }}>
          ← Back to {client.first_name} {client.last_name}
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>{metric.name}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          {metric.unit_label} · {format(parseISO(metric.start_date), 'MMM d')} – {format(parseISO(metric.end_date), 'MMM d, yyyy')}
        </p>
      </div>

      {/* Settings summary */}
      <div className="bg-white rounded-xl border p-6 mb-6 space-y-3" style={{ borderColor: 'var(--border)' }}>
        <SectionTitle>Practice Settings</SectionTitle>
        <Row label="Prompt" value={metric.prompt_text || '—'} />
        <Row label="Response Type" value={metric.response_type === 'yesno' ? 'Yes / No' : 'Number'} />
        <Row label="Schedule" value={
          metric.frequency_type === 'daily'
            ? 'Every day'
            : (metric.frequency_days || []).map((d: string) => daysMap[d] || d).join(', ')
        } />
        <Row label="Send Time" value={metric.send_time || '—'} />
        <Row label="Delivery" value={metric.delivery_method === 'sms' ? 'SMS' : 'Email'} />
        {metric.has_goal && (
          <Row label="Goal" value={`${metric.goal_start} → ${metric.goal_end}`} />
        )}
        <Row label="Status" value={metric.is_active ? 'Active' : 'Archived'} />
      </div>

      {/* Log history */}
      <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: 'var(--border)' }}>
        <SectionTitle>Log History ({logs?.length || 0} entries)</SectionTitle>
        {logs && logs.length > 0 ? (
          <div className="mt-3 space-y-2">
            {logs.map((log: { id: string; logged_value: number; logged_at: string; source: string }) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  {format(parseISO(log.logged_at), 'MMM d, yyyy h:mm a')}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: 'var(--muted)' }}>
                    {log.source || 'manual'}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                    {metric.response_type === 'yesno' ? (log.logged_value ? 'Yes' : 'No') : log.logged_value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm mt-3" style={{ color: 'var(--muted)' }}>No entries yet.</p>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#FECACA' }}>
        <SectionTitle>Danger Zone</SectionTitle>
        <p className="text-sm mt-2 mb-4" style={{ color: 'var(--muted)' }}>
          Deleting this practice removes all log history permanently. This cannot be undone.
        </p>
        <DeleteMetricButton metricId={id} clientId={client.id} />
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{children}</h2>
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-sm w-32 shrink-0" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}
