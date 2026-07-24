import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import MetricWizard from '@/components/forms/MetricWizard'

export default async function EditMetricPage({ params }: { params: Promise<{ id: string }> }) {
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
    .select('*, client:client_id(id, first_name, last_name, preferred_contact, timezone)')
    .eq('id', id)
    .single()

  if (!metric) notFound()

  const client = metric.client as {
    id: string
    first_name: string
    last_name: string
    preferred_contact: string
    timezone: string
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href={`/clients/${client.id}`} className="text-sm mb-2 inline-block" style={{ color: 'var(--muted)' }}>
          ← Back to {client.first_name} {client.last_name}
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Edit Practice</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          {metric.name} · {client.first_name} {client.last_name}
        </p>
      </div>
      <MetricWizard
        clientId={client.id}
        clientPreferredContact={client.preferred_contact}
        clientTimezone={client.timezone}
        metricId={id}
        initialData={{
          name: metric.name,
          prompt_text: metric.prompt_text,
          unit_label: metric.unit_label,
          response_type: metric.response_type,
          start_date: metric.start_date,
          end_date: metric.end_date,
          recurrence_value: metric.recurrence_value ?? 1,
          recurrence_unit: metric.recurrence_unit ?? 'days',
          send_days: metric.send_days,
          has_goal: metric.has_goal ?? false,
          goal_start: metric.goal_start,
          goal_end: metric.goal_end,
          goal_direction: metric.goal_direction,
          send_time: metric.send_time ?? '08:00',
          delivery_method: metric.delivery_method ?? 'sms',
          graph_min: metric.graph_min,
          graph_max: metric.graph_max,
        }}
      />
    </div>
  )
}
