'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  clientId: string
  isActive: boolean
  clientFirstName: string
}

export default function ToggleClientStatus({ clientId, isActive, clientFirstName }: Props) {
  const [active, setActive] = useState(isActive)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function doToggle(newVal: boolean) {
    setLoading(true)
    await supabase.from('clients').update({ is_active: newVal }).eq('id', clientId)
    setActive(newVal)
    setLoading(false)
    setConfirming(false)
    router.refresh()
  }

  function handleClick() {
    if (active) {
      // Deactivating — show confirmation first
      setConfirming(true)
    } else {
      // Reactivating — no confirmation needed
      doToggle(true)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
          active
            ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
            : 'border-gray-300 text-gray-500 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        {loading ? '...' : active ? '● Active' : '○ Inactive'}
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setConfirming(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--navy)' }}>
              Make {clientFirstName} Inactive?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              You can reactivate later if you change your mind.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => doToggle(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: '#DC2626' }}
              >
                Yes, Deactivate
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
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
