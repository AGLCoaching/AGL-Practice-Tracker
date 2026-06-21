'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ToggleClientStatus({ clientId, isActive }: { clientId: string; isActive: boolean }) {
  const [active, setActive] = useState(isActive)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    const newVal = !active
    await supabase.from('clients').update({ is_active: newVal }).eq('id', clientId)
    setActive(newVal)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
        active
          ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
          : 'border-gray-300 text-gray-500 bg-gray-50 hover:bg-gray-100'
      }`}
    >
      {loading ? '...' : active ? '● Active' : '○ Inactive'}
    </button>
  )
}
