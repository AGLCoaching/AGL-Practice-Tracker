'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      window.location.href = '/clients'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border p-8" style={{ borderColor: 'var(--border)' }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--navy)' }}>AGL Practice Tracker</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sign in to your account</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--blue)' } as React.CSSProperties}
              placeholder="you@aglcoaching.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)' } as React.CSSProperties}
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: 'var(--blue)' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
