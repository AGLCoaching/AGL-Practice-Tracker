import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientForm from '@/components/forms/ClientForm'
import Link from 'next/link'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single()
  if (!client) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href={`/clients/${id}`} className="text-sm mb-2 inline-block" style={{ color: 'var(--muted)' }}>
          ← Back to Client
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>
          Edit {client.first_name} {client.last_name}
        </h1>
      </div>
      <ClientForm initialData={client} />
    </div>
  )
}
