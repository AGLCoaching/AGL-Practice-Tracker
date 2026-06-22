import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/forms/ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/setup-error')

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>My Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          How you appear to clients and in AGL records.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  )
}
