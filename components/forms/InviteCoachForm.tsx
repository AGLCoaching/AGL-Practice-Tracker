'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TIMEZONES } from '@/lib/utils'

export default function InviteCoachForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    company_name: '', phone: '', timezone: 'America/Chicago',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/invite-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.')
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
        <div className="text-4xl mb-3">✅</div>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--navy)' }}>Invite sent</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          {form.first_name} {form.last_name} will receive an email to set their password and access their dashboard.
        </p>
        <button
          onClick={() => router.push('/admin')}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: 'var(--blue)' }}
        >
          Back to Coaches
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--border)' }}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required>
          <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} required className={inp} />
        </Field>
        <Field label="Last Name" required>
          <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} required className={inp} />
        </Field>
      </div>
      <Field label="Email Address" required>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className={inp} placeholder="coach@theircompany.com" />
      </Field>
      <Field label="Company / Firm Name" hint="Optional">
        <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)} className={inp} />
      </Field>
      <Field label="Phone" hint="Optional">
        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inp} placeholder="+1 (555) 000-0000" />
      </Field>
      <Field label="Time Zone" required>
        <select value={form.timezone} onChange={e => set('timezone', e.target.value)} required className={inp}>
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      </Field>
      {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--blue)' }}
        >
          {saving ? 'Sending invite...' : 'Send Invite'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 rounded-lg text-sm border"
          style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"

function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1 font-normal text-xs" style={{ color: 'var(--muted)' }}>({hint})</span>}
      </label>
      {children}
    </div>
  )
}
