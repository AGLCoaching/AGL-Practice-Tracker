'use client'
import { LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'

interface Log {
  logged_value: number
  logged_at: string
}

interface Metric {
  id: string
  name: string
  unit_label: string
  response_type: string
  start_date: string
  end_date: string
  has_goal: boolean
  goal_start: number | null
  graph_min: number | null
  graph_max: number | null
  logs?: Log[]
}

interface Coach {
  first_name: string
  last_name: string
  company_name: string | null
  logo_url: string | null
}

interface Client {
  first_name: string
}

interface Props {
  client: Client
  coach: Coach
  metrics: Metric[]
}

export default function ClientDashboardContent({ client, coach, metrics }: Props) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b bg-white" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          {coach.logo_url && (
            <img src={coach.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
          )}
          <div>
            <div className="font-bold text-base" style={{ color: 'var(--navy)' }}>
              {coach.company_name || `${coach.first_name} ${coach.last_name}`}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>Practice Tracking</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--navy)' }}>
          Hi {client.first_name}!
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Here&apos;s your practice progress.</p>

        {metrics && metrics.length > 0 ? (
          <div className="space-y-6">
            {metrics.map((metric) => {
              const logs = (metric.logs || []).sort(
                (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
              )
              const chartData = logs.map((log) => ({
                date: format(parseISO(log.logged_at), 'MMM d'),
                value: metric.response_type === 'yesno' ? (log.logged_value ? 1 : 0) : log.logged_value,
              }))
              const avg = logs.length
                ? (logs.reduce((s, l) => s + l.logged_value, 0) / logs.length).toFixed(1)
                : null
              const best = logs.length ? Math.max(...logs.map((l) => l.logged_value)) : null

              return (
                <div key={metric.id} className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border)' }}>
                  <h2 className="font-bold text-lg mb-1" style={{ color: 'var(--navy)' }}>{metric.name}</h2>
                  <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                    {metric.unit_label} · {format(parseISO(metric.start_date), 'MMM d')} – {format(parseISO(metric.end_date), 'MMM d, yyyy')}
                  </p>

                  {chartData.length > 0 ? (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#6B7280' }}
                            axisLine={false}
                            tickLine={false}
                            width={28}
                            domain={[metric.graph_min ?? 'auto', metric.graph_max ?? 'auto']}
                          />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            formatter={(val) => [
                              metric.response_type === 'yesno' ? (Number(val) ? 'Yes' : 'No') : val,
                              metric.unit_label,
                            ]}
                          />
                          {metric.has_goal && metric.goal_start != null && (
                            <ReferenceLine
                              y={metric.goal_start}
                              stroke="#2E75B6"
                              strokeDasharray="4 4"
                              label={{ value: 'Goal', fontSize: 10, fill: '#2E75B6' }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#2E75B6"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#2E75B6' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-36 flex items-center justify-center rounded-lg" style={{ background: '#F9FAFB' }}>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>Waiting for your first response</p>
                    </div>
                  )}

                  {logs.length > 0 && (
                    <div className="flex gap-6 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                      <Stat label="Responses" value={logs.length.toString()} />
                      {metric.response_type === 'number' && avg && <Stat label="Average" value={avg} />}
                      {metric.response_type === 'number' && best != null && <Stat label="Best" value={best.toString()} />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No active practices yet. Check back soon!</p>
          </div>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-base font-bold" style={{ color: 'var(--navy)' }}>{value}</div>
    </div>
  )
}
