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
      setConfirming(false)
      alert('Could not delete. Please try again.')
    }
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 rounded-lg text-sm font-medium border"
        style={{ color: '#DC2626', borderColor: '#FECACA' }}
      >
        Delete This Practice
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !deleting && setConfirming(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--navy)' }}>
              Delete This Practice?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              All log history will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
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
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
                style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
