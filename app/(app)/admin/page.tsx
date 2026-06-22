import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CoachesTable from '@/components/admin/CoachesTable'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/clients')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all coaches with their clients (including company names for search)
  const { data: coaches } = await admin
    .from('users')
    .select(`
      id, first_name, last_name, email, company_name, phone, photo_url,
      is_active, invited_at,
      clients:clients(id, first_name, last_name, company_name, is_active)
    `)
    .eq('role', 'coach')
    .order('last_name')

  const coachList = coaches || []
  const totalActive = coachList.filter(c => c.is_active).length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Manage Coaches</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {totalActive} active · {coachList.length} total
          </p>
        </div>
        <Link
          href="/admin/invite"
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: 'var(--blue)' }}
        >
          + Invite Coach
        </Link>
      </div>

      {coachList.length > 0 ? (
        <CoachesTable coaches={coachList as Parameters<typeof CoachesTable>[0]['coaches']} />
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
