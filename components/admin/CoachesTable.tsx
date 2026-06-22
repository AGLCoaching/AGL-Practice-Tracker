'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface CoachClient {
  id: string
  first_name: string
  last_name: string
  company_name: string | null
  is_active: boolean
}

interface Coach {
  id: string
  first_name: string
  last_name: string
  email: string
  company_name: string | null
  phone: string | null
  photo_url: string | null
  is_active: boolean
  invited_at: string | null
  clients: CoachClient[]
}

type SortField = 'name' | 'clients' | 'status'
type SortDir = 'asc' | 'desc'

export default function CoachesTable({ coaches }: { coaches: Coach[] }) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return coaches
      .filter(coach => {
        if (!q) return true
        const coachName = `${coach.first_name} ${coach.last_name}`.toLowerCase()
        if (coachName.includes(q)) return true
        return coach.clients.some(c => {
          const clientName = `${c.first_name} ${c.last_name}`.toLowerCase()
          const company = (c.company_name || '').toLowerCase()
          return clientName.includes(q) || company.includes(q)
        })
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortField === 'name') {
          cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
        } else if (sortField === 'clients') {
          cmp = a.clients.length - b.clients.length
        } else if (sortField === 'status') {
          cmp = (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [coaches, search, sortField, sortDir])

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span style={{ color: 'var(--muted)', opacity: 0.4 }}>↕</span>
    return <span style={{ color: 'var(--blue)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by coach name, client name, or company..."
          className="w-full max-w-md border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: 'var(--border)' }}
        />
        {search && (
          <span className="ml-3 text-sm" style={{ color: 'var(--muted)' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: '#F9FAFB' }}>
                <th className="px-5 py-3 text-left">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700">
                    Coach <SortIcon field="name" />
                  </button>
                </th>
                <th className="px-5 py-3 text-left">Company</th>
                <th className="px-5 py-3 text-left">
                  <button onClick={() => toggleSort('clients')} className="flex items-center gap-1 hover:text-gray-700">
                    Clients <SortIcon field="clients" />
                  </button>
                </th>
                <th className="px-5 py-3 text-left">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-gray-700">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(coach => {
                const q = search.trim().toLowerCase()
                const activeClients = coach.clients.filter(c => c.is_active).length

                // Show matching clients when search matches client name or company
                const coachNameMatch = !q || `${coach.first_name} ${coach.last_name}`.toLowerCase().includes(q)
                const matchingClients = !q || coachNameMatch ? [] : coach.clients.filter(c => {
                  return `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
                    (c.company_name || '').toLowerCase().includes(q)
                })

                return (
                  <tr key={coach.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                          {coach.photo_url ? (
                            <Image src={coach.photo_url} alt={coach.first_name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                          ) : (
                            <span className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>
                              {coach.first_name[0]}{coach.last_name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--navy)' }}>
                            {coach.first_name} {coach.last_name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--muted)' }}>{coach.email}</div>
                          {matchingClients.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {matchingClients.map(c => (
                                <Link
                                  key={c.id}
                                  href={`/clients/${c.id}`}
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ background: '#EFF6FF', color: 'var(--blue)' }}
                                >
                                  {c.first_name} {c.last_name}
                                  {c.company_name ? ` · ${c.company_name}` : ''}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text)' }}>
                      {coach.company_name || <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text)' }}>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        activeClients > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {activeClients} active
                      </span>
                      {coach.clients.length > activeClients && (
                        <span className="ml-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                          / {coach.clients.length} total
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        coach.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {coach.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/coaches/${coach.id}`} className="text-sm font-medium" style={{ color: 'var(--blue)' }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {search ? `No coaches or clients match "${search}"` : 'No coaches yet.'}
          </p>
        </div>
      )}
    </div>
  )
}
