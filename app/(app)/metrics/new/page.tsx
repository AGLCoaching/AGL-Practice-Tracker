import { createClient } from '@/lib/supabase/server'
import MetricWizard from '@/components/forms/MetricWizard'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function NewMetricPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { clientId } = await searchParams
  if (!clientId) notFound()

  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single()
  if (!client) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href={`/clients/${clientId}`} className="text-sm mb-2 inline-block" style={{ color: 'var(--muted)' }}>
          ← Back to {client.first_name} {client.last_name}
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Add Practice Metric</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>For {client.first_name} {client.last_name}</p>
      </div>
      <MetricWizard clientId={clientId} clientPreferredContact={client.preferred_contact} clientTimezone={client.timezone} />
    </div>
  )
}
