import InviteCoachForm from '@/components/forms/InviteCoachForm'
import Link from 'next/link'

export default function InviteCoachPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin" className="text-sm mb-2 inline-block" style={{ color: 'var(--muted)' }}>← Manage Coaches</Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Invite a Coach</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>They&apos;ll receive an email to set their password and access their dashboard.</p>
      </div>
      <InviteCoachForm />
    </div>
  )
}
