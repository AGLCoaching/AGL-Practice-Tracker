import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Client } from '@/lib/types'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filter = params.filter || 'active'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user!.id).single()

  const isAdmin = profile?.role === 'admin'

  type ClientRow = Client & {
    metrics?: { id: string; is_active: boolean }[]
    coach?: { first_name: string; last_name: string } | null
  }

  let clients: ClientRow[] = []

  if (isAdmin) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    let query = admin
      .from('clients')
      .select('*, metrics:practice_metrics(id, is_active), coach:coach_id(first_name, last_name)')
      .order('last_name')
    if (filter === 'active') query = query.eq('is_active', true)
    if (filter === 'inactive') query = query.eq('is_active', false)
    const { data } = await query
    clients = (data || []) as ClientRow[]
  } else {
    let query = supabase
      .from('clients')
      .select('*, metrics:practice_metrics(id, is_active)')
      .eq('coach_id', user!.id)
      .order('last_name')
    if (filter === 'active') query = query.eq('is_active', true)
    if (filter === 'inactive') query = query.eq('is_active', false)
    const { data } = await query
    clients = (data || []) as ClientRow[]
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>
            {isAdmin ? 'All Clients' : 'My Clients'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {clients.length} {filter} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: 'var(--blue)' }}
        >
          + Add Client
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
        {['active', 'inactive', 'all'].map(f => (
          <Link
            key={f}
            href={`/clients?filter=${f}`}
            className="px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors"
            style={filter === f ? { borderColor: 'var(--blue)', color: 'var(--blue)' } : { borderColor: 'transparent', color: 'var(--muted)' }}
          >
            {f}
          </Link>
        ))}
      </div>

      {/* Client table */}
      {clients.length > 0 ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: '#F9FAFB' }}>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Company</th>
                {isAdmin && <th className="px-5 py-3 text-left">Coach</th>}
                <th className="px-5 py-3 text-left">Contact</th>
                <th className="px-5 py-3 text-left">Active Practices</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const activeMetrics = client.metrics?.filter(m => m.is_active).length || 0
                return (
                  <tr key={client.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-5 py-4">
                      <Link
                        href={`/clients/${client.id}`}
                        className="block font-medium text-sm hover:underline"
                        style={{ color: 'var(--blue)' }}
                      >
                        {client.first_name} {client.last_name}
                      </Link>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{client.email}</div>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text)' }}>
                      {client.company_name || <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--text)' }}>
                        {client.coach
                          ? `${client.coach.first_name} ${client.coach.last_name}`
                          : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                    )}
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text)' }}>
                      {client.preferred_contact === 'sms' ? '📱 SMS' : '📧 Email'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        activeMetrics > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {activeMetrics} active
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        client.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-sm font-medium"
                        style={{ color: 'var(--blue)' }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <div className="text-4xl mb-3">👥</div>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--navy)' }}>No clients yet</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Add your first client to get started.</p>
          <Link
            href="/clients/new"
            className="inline-block px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: 'var(--blue)' }}
          >
            + Add Client
          </Link>
        </div>
      )}
    </div>
  )
}
