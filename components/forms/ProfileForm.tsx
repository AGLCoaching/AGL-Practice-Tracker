'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { AppUser } from '@/lib/types'

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export default function ProfileForm({ profile }: { profile: AppUser }) {
  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastName, setLastName] = useState(profile.last_name)
  const [phone, setPhone] = useState(profile.phone || '')
  const [timezone, setTimezone] = useState(profile.timezone || 'America/Chicago')
  const [bio, setBio] = useState(profile.bio || '')
  const [photoUrl, setPhotoUrl] = useState(profile.photo_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5 MB.')
      return
    }
    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('coach-photos')
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('coach-photos')
      .getPublicUrl(path)

    // Bust cache with timestamp
    const bustedUrl = `${publicUrl}?t=${Date.now()}`
    setPhotoUrl(bustedUrl)

    await supabase
      .from('users')
      .update({ photo_url: bustedUrl })
      .eq('id', profile.id)

    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')

    const { error: err } = await supabase
      .from('users')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        timezone,
        bio: bio.trim() || null,
      })
      .eq('id', profile.id)

    setSaving(false)
    if (err) {
      setError('Could not save. Please try again.')
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Photo */}
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--muted)' }}>
          Profile Photo
        </h2>
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 shrink-0"
            style={{ borderColor: 'var(--border)', background: '#F3F4F6' }}
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt="Profile photo"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-2xl">👤</span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-60"
              style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }}
            >
              {uploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
            </button>
            <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
              JPG or PNG · Square crop · Under 5 MB
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Basic Information
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Email <span className="font-normal" style={{ color: 'var(--muted)' }}>(managed by Supabase Auth)</span>
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full border rounded-lg px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', background: '#F9FAFB', color: 'var(--muted)' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Time Zone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)' }}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>
          Bio
        </h2>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
          Used in client-facing materials and coach directory. Keep it concise.
        </p>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={4}
          placeholder="A brief professional bio — credentials, focus areas, coaching philosophy..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
          style={{ borderColor: 'var(--border)' }}
        />
        <p className="text-xs mt-1 text-right" style={{ color: 'var(--muted)' }}>
          {bio.length} / 500 characters
        </p>
      </div>

      {/* Actions */}
      {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--blue)' }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        {saved && (
          <span className="text-sm" style={{ color: 'green' }}>Saved.</span>
        )}
      </div>
    </form>
  )
}
