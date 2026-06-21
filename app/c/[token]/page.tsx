import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientDashboardContent from '@/components/ClientDashboardContent'

export default async function ClientDashboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*, coach:coach_id(first_name, last_name, company_name, logo_url)')
    .eq('dashboard_token', token)
    .single()

  if (!client) notFound()

  const { data: metrics } = await supabase
    .from('practice_metrics')
    .select('*, logs:practice_logs(*)')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .order('created_at')

  const coach = client.coach as {
    first_name: string
    last_name: string
    company_name: string | null
    logo_url: string | null
  }

  return (
    <ClientDashboardContent
      client={{ first_name: client.first_name }}
      coach={coach}
      metrics={metrics || []}
    />
  )
}
