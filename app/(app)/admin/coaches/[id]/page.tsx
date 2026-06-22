import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ToggleCoachStatus from '@/components/admin/ToggleCoachStatus'

function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  if (phone.startsWith('+')) return phone
  return phone
}

export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/clients')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: coach } = await admin
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!coach || coach.role !== 'coach') notFound()

  const { data: clients } = await admin
    .from('clients')
    .select('*, metrics:practice_metrics(id, is_active)')
    .eq('coach_id', id)
    .order('last_name')

  const clientList = clients || []
  const activeClients = clientList.filter(c => c.is_active)
  const inactiveClients = clientList.filter(c => !c.is_active)

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin" className="text-sm mb-2 inline-block" style={{ color: 'var(--muted)' }}>
          ← Manage Coaches
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: '#EFF6FF' }}>
              {coach.photo_url ? (
                <Image src={coach.photo_url} alt={coach.first_name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
              ) : (
                <span className="text-lg font-semibold" style={{ color: 'var(--blue)' }}>
                  {coach.first_name[0]}{coach.last_name[0]}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>
                {coach.first_name} {coach.last_name}
              </h1>
              {coach.company_name && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{coach.company_name}</p>
              )}
            </div>
          </div>
          <ToggleCoachStatus coachId={coach.id} isActive={coach.is_active} coachFirstName={coach.first_name} />
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border p-5 mb-6 grid grid-cols-3 gap-4" style={{ borderColor: 'var(--border)' }}>
        <InfoItem label="Email" value={coach.email} />
        <InfoItem label="Phone" value={formatPhone(coach.phone)} />
        <InfoItem label="Time Zone" value={coach.timezone?.replace(/_/g, ' ') || '—'} />
      </div>

      {/* Client list */}
      <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--navy)' }}>
        Clients ({activeClients.length} active{inactiveClients.length > 0 ? ` · ${inactiveClients.length} inactive` : ''})
      </h2>

      {clientList.length > 0 ? (
        <div className="bg-white rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: '#F9FAFB' }}>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Company</th>
                <th className="px-5 py-3 text-left">Active Practices</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clientList.map((client) => {
                const activePractices = (client.metrics as { id: string; is_active: boolean }[] || []).filter(m => m.is_active).length
                return (
                  <tr key={client.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-5 py-4">
                      <Link href={`/clients/${client.id}`} className="block font-medium text-sm hover:underline" style={{ color: 'var(--blue)' }}>
                        {client.first_name} {client.last_name}
                      </Link>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{client.email}</div>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text)' }}>
                      {client.company_name || <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${activePractices > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {activePractices} active
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${client.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/clients/${client.id}`} className="text-sm font-medium" style={{ color: 'var(--blue)' }}>
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
        <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No clients yet for this coach.</p>
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
