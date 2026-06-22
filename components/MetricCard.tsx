'use client'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'
import CopyLinkButton from '@/components/CopyLinkButton'

interface MetricCardProps {
  metric: {
    id: string
    name: string
    unit_label: string
    response_type: string
    start_date: string
    end_date: string
    has_goal: boolean
    goal_start: number | null
    goal_end: number | null
    graph_min: number | null
    graph_max: number | null
    is_active: boolean
    logs?: { logged_value: number; logged_at: string }[]
  }
  clientId: string
  dashboardUrl: string
}

export default function MetricCard({ metric, clientId, dashboardUrl }: MetricCardProps) {
  const logs = metric.logs || []
  const chartData = logs
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .map(log => ({
      date: format(parseISO(log.logged_at), 'MMM d'),
      value: metric.response_type === 'yesno' ? (log.logged_value === 1 ? 1 : 0) : log.logged_value,
    }))

  const goalValue = metric.has_goal && metric.goal_start != null ? metric.goal_start : null

  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-base" style={{ color: 'var(--navy)' }}>{metric.name}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {metric.unit_label} · {format(parseISO(metric.start_date), 'MMM d')} – {format(parseISO(metric.end_date), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CopyLinkButton url={dashboardUrl} label="Copy Client Link" />
          <Link href={`/metrics/${metric.id}`} className="text-xs font-medium" style={{ color: 'var(--blue)' }}>
            Details →
          </Link>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                domain={[metric.graph_min ?? 'auto', metric.graph_max ?? 'auto']}
                width={30}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}
                formatter={(val) => [
                  metric.response_type === 'yesno' ? (Number(val) ? 'Yes' : 'No') : val,
                  metric.unit_label
                ]}
              />
              {goalValue != null && (
                <ReferenceLine y={goalValue} stroke="#2E75B6" strokeDasharray="4 4" label={{ value: 'Goal', fontSize: 10, fill: '#2E75B6' }} />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2E75B6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#2E75B6' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center rounded-lg" style={{ background: '#F9FAFB' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Waiting for first response</p>
        </div>
      )}

      <div className="flex gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <Stat label="Entries" value={logs.length.toString()} />
        {logs.length > 0 && metric.response_type === 'number' && (
          <>
            <Stat label="Average" value={(logs.reduce((s, l) => s + l.logged_value, 0) / logs.length).toFixed(1)} />
            <Stat label="Best" value={Math.max(...logs.map(l => l.logged_value)).toString()} />
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{value}</div>
    </div>
  )
}
