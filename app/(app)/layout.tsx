import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import type { AppUser } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service role to bypass RLS for profile lookup
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/setup-error')

  return (
    <div className="flex min-h-screen">
      <Sidebar user={profile as AppUser} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
