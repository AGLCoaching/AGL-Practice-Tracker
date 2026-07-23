import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Verify caller is admin
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await serverClient.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, first_name, last_name, company_name, phone, timezone } = body

  if (!email || !first_name || !last_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Send Supabase auth invite — resends if user is unconfirmed
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
  })

  let userId: string

  if (inviteErr) {
    // User may already be confirmed — look them up by email
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )
    if (!existingUser) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 })
    }
    userId = existingUser.id
  } else {
    userId = invited.user.id
  }

  // Upsert public.users profile — handles both new invites and re-invites
  const { error: upsertErr } = await admin.from('users').upsert({
    id: userId,
    email,
    first_name,
    last_name,
    company_name: company_name || null,
    phone: phone || null,
    timezone: timezone || 'America/Chicago',
    role: 'coach',
    is_active: true,
    invited_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId })
}
