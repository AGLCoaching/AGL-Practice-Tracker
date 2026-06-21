import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('*').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/clients')

  const { data: coaches } = await supabase
    .from('users')
    .select('*, clients:clients(id, is_active)')
    .eq('role', 'coach')
    .order('last_name')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Manage Coaches</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{coaches?.length || 0} coach{coaches?.length !== 1 ? 'es' : ''}</p>
        </div>
        <Link href="/admin/invite" className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: 'var(--blue)' }}>
          + Invite Coach
        </Link>
      </div>

      {coaches && coaches.length > 0 ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: '#F9FAFB' }}>
                <th className="px-5 py-3 text-left">Coach</th>
                <th className="px-5 py-3 text-left">Company</th>
                <th className="px-5 py-3 text-left">Total Clients</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((coach) => {
                const clients = coach.clients as { id: string; is_active: boolean }[] || []
                const activeClients = clients.filter(c => c.is_active).length
                return (
                  <tr key={coach.id} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-sm" style={{ color: 'var(--navy)' }}>{coach.first_name} {coach.last_name}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{coach.email}</div>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text)' }}>{coach.company_name || '—'}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text)' }}>{activeClients} active / {clients.length} total</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${coach.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {coach.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/coaches/${coach.id}`} className="text-sm font-medium" style={{ color: 'var(--blue)' }}>View →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <div className="text-4xl mb-3">🧑‍💼</div>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--navy)' }}>No coaches yet</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Invite a coach to give them access.</p>
          <Link href="/admin/invite" className="inline-block px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: 'var(--blue)' }}>
            + Invite Coach
          </Link>
        </div>
      )}
    </div>
  )
}
