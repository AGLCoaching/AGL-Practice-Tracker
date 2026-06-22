'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface Message {
  id: string
  message: string
  sent_at: string
  delivery_method: string
}

interface Props {
  metricId: string
  clientId: string
  clientFirstName: string
}

export default function EncouragementBox({ metricId, clientId, clientFirstName }: Props) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadMessages()
  }, [metricId])

  async function loadMessages() {
    const { data } = await supabase
      .from('encouragement_messages')
      .select('*')
      .eq('metric_id', metricId)
      .order('sent_at', { ascending: false })
      .limit(5)
    if (data) setMessages(data)
  }

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setError('')

    const { error: err } = await supabase.from('encouragement_messages').insert({
      metric_id: metricId,
      client_id: clientId,
      message: message.trim(),
      sent_at: new Date().toISOString(),
      status: 'pending',
    })

    setSending(false)
    if (err) {
      setError('Could not send. Please try again.')
    } else {
      setMessage('')
      loadMessages()
    }
  }

  return (
    <div className="bg-white rounded-b-xl border border-t-0 px-5 pb-5 pt-4" style={{ borderColor: 'var(--border)' }}>
      <p className="text-sm font-medium mb-2" style={{ color: 'var(--navy)' }}>
        Send {clientFirstName} an encouraging message
      </p>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={2}
        placeholder="Write something encouraging..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none mb-2"
        style={{ borderColor: 'var(--border)' }}
      />
      {error && <p className="text-xs mb-2" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button
        onClick={handleSend}
        disabled={sending || !message.trim()}
        className="px-4 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
        style={{ background: 'var(--blue)' }}
      >
        {sending ? 'Sending...' : 'Send'}
      </button>

      {messages.length > 0 && (
        <div className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Sent Messages</p>
          {messages.map(m => (
            <div key={m.id} className="text-sm rounded-lg px-3 py-2" style={{ background: '#F9FAFB' }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {format(new Date(m.sent_at), 'MMM d, yyyy h:mm a')}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF', color: 'var(--blue)' }}>
                  {m.delivery_method === 'sms' ? 'SMS' : 'Email'} · Pending
                </span>
              </div>
              <p style={{ color: 'var(--text)' }}>{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
