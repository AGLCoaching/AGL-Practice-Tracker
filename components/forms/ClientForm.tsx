'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TIMEZONES } from '@/lib/utils'

interface ClientFormProps {
  initialData?: {
    id: string
    first_name: string
    last_name: string
    company_name: string | null
    title: string | null
    email: string
    phone: string | null
    timezone: string
    preferred_contact: 'sms' | 'email'
    notes: string | null
    is_active: boolean
  }
}

export default function ClientForm({ initialData }: ClientFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!initialData

  const [form, setForm] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    company_name: initialData?.company_name || '',
    title: initialData?.title || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    timezone: initialData?.timezone || 'America/New_York',
    preferred_contact: initialData?.preferred_contact || 'email',
    notes: initialData?.notes || '',
    is_active: initialData?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in.'); setSaving(false); return }

    const payload = {
      ...form,
      company_name: form.company_name || null,
      title: form.title || null,
      phone: form.phone || null,
      notes: form.notes || null,
      coach_id: user.id,
    }

    if (isEdit) {
      const { error: err } = await supabase.from('clients').update(payload).eq('id', initialData!.id)
      if (err) { setError(err.message); setSaving(false); return }
      router.push(`/clients/${initialData!.id}`)
    } else {
      const { data, error: err } = await supabase.from('clients').insert(payload).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      router.push(`/clients/${data.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--border)' }}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required>
          <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} required className={inputCls} />
        </Field>
        <Field label="Last Name" required>
          <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} required className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Company Name" hint="Optional">
          <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Title" hint="Optional">
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Email Address" required>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className={inputCls} />
      </Field>
      <Field label="Cell Phone" hint="Required for SMS reminders">
        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+1 555 000 0000" />
      </Field>
      <Field label="Time Zone" required>
        <select value={form.timezone} onChange={e => set('timezone', e.target.value)} required className={inputCls}>
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Preferred Contact Method">
        <div className="flex gap-4 mt-1">
          {(['email', 'sms'] as const).map(method => (
            <label key={method} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="preferred_contact"
                value={method}
                checked={form.preferred_contact === method}
                onChange={() => set('preferred_contact', method)}
              />
              {method === 'email' ? '📧 Email' : '📱 SMS'}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Notes" hint="Private — not visible to client">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls} rows={3} />
      </Field>
      {isEdit && (
        <Field label="Status">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4"
            />
            Active (uncheck to deactivate)
          </label>
        </Field>
      )}

      {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--blue)' }}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Client'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 rounded-lg text-sm font-medium border"
          style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"

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
