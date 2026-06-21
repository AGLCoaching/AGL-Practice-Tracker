import ClientForm from '@/components/forms/ClientForm'

export default function NewClientPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Add New Client</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          Set up the client&apos;s profile. You can add practice metrics after saving.
        </p>
      </div>
      <ClientForm />
    </div>
  )
}
