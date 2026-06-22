'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteMetricButton({ metricId, clientId }: { metricId: string; clientId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/metrics/${metricId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push(`/clients/${clientId}`)
    } else {
      setDeleting(false)
      alert('Could not delete. Please try again.')
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 rounded-lg text-sm font-medium border"
        style={{ color: '#DC2626', borderColor: '#FECACA' }}
      >
        Delete This Practice
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm" style={{ color: 'var(--text)' }}>Are you sure? This cannot be undone.</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
        style={{ background: '#DC2626' }}
      >
        {deleting ? 'Deleting...' : 'Yes, Delete'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-4 py-2 rounded-lg text-sm font-medium border"
        style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
      >
        Cancel
      </button>
    </div>
  )
}
