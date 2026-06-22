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

  // Send Supabase auth invite — creates auth.users entry and sends invite email
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
  })

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 400 })
  }

  // Insert public.users profile with the auth user's ID
  const { error: insertErr } = await admin.from('users').insert({
    id: invited.user.id,
    email,
    first_name,
    last_name,
    company_name: company_name || null,
    phone: phone || null,
    timezone: timezone || 'America/Chicago',
    role: 'coach',
    is_active: true,
    invited_at: new Date().toISOString(),
  })

  if (insertErr) {
    // Auth user was created but profile insert failed — surface the error
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: invited.user.id })
}
