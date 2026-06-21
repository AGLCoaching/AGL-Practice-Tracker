'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addDays, addWeeks, addMonths, format } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface MetricWizardProps {
  clientId: string
  clientPreferredContact: string
  clientTimezone: string
}

export default function MetricWizard({ clientId, clientPreferredContact, clientTimezone }: MetricWizardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [name, setName] = useState('')
  const [promptText, setPromptText] = useState('')
  const [unitLabel, setUnitLabel] = useState('Times per day')
  const [responseType, setResponseType] = useState<'number' | 'yesno'>('number')

  // Step 2
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [recurrenceValue, setRecurrenceValue] = useState(1)
  const [recurrenceUnit, setRecurrenceUnit] = useState<'days' | 'weeks' | 'months'>('days')
  const [sendDays, setSendDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [endDateAuto, setEndDateAuto] = useState(true)
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 28), 'yyyy-MM-dd'))

  // Step 3
  const [hasGoal, setHasGoal] = useState(false)
  const [goalStart, setGoalStart] = useState('')
  const [goalEnd, setGoalEnd] = useState('')
  const [goalDirection, setGoalDirection] = useState<'meet_or_exceed' | 'meet_or_below'>('meet_or_exceed')

  // Step 4
  const [sendTime, setSendTime] = useState('08:00')
  const [deliveryMethod, setDeliveryMethod] = useState(clientPreferredContact as 'sms' | 'email')

  // Step 5
  const [graphMin, setGraphMin] = useState('')
  const [graphMax, setGraphMax] = useState('')

  function calcEndDate() {
    const start = new Date(startDate)
    if (recurrenceUnit === 'days') return format(addDays(start, recurrenceValue * 28), 'yyyy-MM-dd')
    if (recurrenceUnit === 'weeks') return format(addWeeks(start, recurrenceValue * 4), 'yyyy-MM-dd')
    return format(addMonths(start, recurrenceValue * 3), 'yyyy-MM-dd')
  }

  function toggleDay(day: string) {
    setSendDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in.'); setSaving(false); return }

    const finalEndDate = endDateAuto ? calcEndDate() : endDate

    const { data, error: err } = await supabase.from('practice_metrics').insert({
      client_id: clientId,
      coach_id: user.id,
      name,
      prompt_text: promptText,
      unit_label: responseType === 'yesno' ? 'Yes or No' : unitLabel,
      response_type: responseType,
      start_date: startDate,
      end_date: finalEndDate,
      recurrence_value: recurrenceValue,
      recurrence_unit: recurrenceUnit,
      send_days: sendDays.length < 7 ? sendDays : null,
      send_time: sendTime,
      delivery_method: deliveryMethod,
      has_goal: hasGoal,
      goal_start: hasGoal && goalStart ? parseFloat(goalStart) : null,
      goal_end: hasGoal && goalEnd ? parseFloat(goalEnd) : null,
      goal_direction: hasGoal ? goalDirection : null,
      graph_min: graphMin ? parseFloat(graphMin) : null,
      graph_max: graphMax ? parseFloat(graphMax) : null,
      is_active: true,
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/clients/${clientId}`)
    router.refresh()
  }

  // Preview chart data
  const previewData = Array.from({ length: 7 }, (_, i) => ({
    date: format(addDays(new Date(startDate), i), 'MMM d'),
    value: responseType === 'number'
      ? Math.round(2 + Math.random() * 3)
      : Math.round(Math.random()),
  }))

  const steps = ['Define Metric', 'Schedule', 'Goal', 'Reminders', 'Graph', 'Preview']

  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      {/* Progress bar */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i + 1 <= step ? 'bg-blue-500' : 'bg-gray-200'}`}
                style={i + 1 <= step ? { background: 'var(--blue)' } : {}} />
              <div className="text-xs mt-1 text-center hidden sm:block" style={{ color: i + 1 === step ? 'var(--blue)' : 'var(--muted)', fontWeight: i + 1 === step ? 600 : 400 }}>
                {s}
              </div>
            </div>
          ))}
        </div>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--navy)' }}>
          Step {step}: {steps[step - 1]}
        </h2>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* STEP 1 */}
        {step === 1 && (
          <>
            <Field label="Metric Name" hint="Internal label">
              <input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="e.g. Ask 3 powerful questions" />
            </Field>
            <Field label="Message to Client" hint="Sent with every reminder">
              <textarea value={promptText} onChange={e => setPromptText(e.target.value)} className={inp} rows={3}
                placeholder="e.g. How many times did you ask a powerful question today?" />
              {promptText && (
                <div className="mt-2 p-3 rounded-lg bg-gray-50 text-sm border" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Preview: </span>
                  {promptText} — Reply with {responseType === 'yesno' ? 'YES or NO' : 'a number'}.
                </div>
              )}
            </Field>
            <Field label="Response Type">
              <div className="flex gap-4 mt-1">
                {[['number', 'Number (e.g. 3, 5, 10)'], ['yesno', 'Yes / No']] as const}
                  {([['number', 'Number (e.g. 3, 5, 10)'], ['yesno', 'Yes / No']] as [string, string][]).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="responseType" value={val} checked={responseType === val}
                      onChange={() => setResponseType(val as 'number' | 'yesno')} />
                    {label}
                  </label>
                ))}
              </div>
            </Field>
            {responseType === 'number' && (
              <Field label="Unit Label">
                <input value={unitLabel} onChange={e => setUnitLabel(e.target.value)} className={inp} placeholder="Times per day" />
              </Field>
            )}
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <Field label="Start Date">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} />
            </Field>
            <Field label="Recurrence">
              <div className="flex gap-2 items-center">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Every</span>
                <input type="number" min={1} value={recurrenceValue} onChange={e => setRecurrenceValue(parseInt(e.target.value))} className={`${inp} w-20`} />
                <select value={recurrenceUnit} onChange={e => setRecurrenceUnit(e.target.value as 'days' | 'weeks' | 'months')} className={`${inp} flex-1`}>
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
              </div>
            </Field>
            <Field label="Days of Week" hint="Optional — leave all checked for every day">
              <div className="flex gap-2 mt-1 flex-wrap">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      sendDays.includes(day) ? 'text-white border-transparent' : 'border-gray-300 text-gray-500'
                    }`}
                    style={sendDays.includes(day) ? { background: 'var(--blue)', borderColor: 'var(--blue)' } : {}}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="End Date">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={endDateAuto} onChange={() => setEndDateAuto(true)} />
                  Auto-calculate ({calcEndDate()})
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={!endDateAuto} onChange={() => setEndDateAuto(false)} />
                  Set manually
                </label>
                {!endDateAuto && (
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inp} />
                )}
              </div>
            </Field>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <Field label="Target Goal">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={hasGoal} onChange={e => setHasGoal(e.target.checked)} className="w-4 h-4" />
                This practice has a target goal
              </label>
            </Field>
            {hasGoal && responseType === 'number' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Starting Goal">
                    <input type="number" value={goalStart} onChange={e => setGoalStart(e.target.value)} className={inp} placeholder="e.g. 2" />
                  </Field>
                  <Field label="Ending Goal">
                    <input type="number" value={goalEnd} onChange={e => setGoalEnd(e.target.value)} className={inp} placeholder="e.g. 5" />
                  </Field>
                </div>
                <Field label="Goal Direction">
                  <div className="flex gap-4 mt-1">
                    {[
                      ['meet_or_exceed', 'Meet or Exceed'],
                      ['meet_or_below', 'Meet or Stay Below'],
                    ].map(([val, label]) => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" name="goalDirection" value={val} checked={goalDirection === val}
                          onChange={() => setGoalDirection(val as 'meet_or_exceed' | 'meet_or_below')} />
                        {label}
                      </label>
                    ))}
                  </div>
                </Field>
              </>
            )}
            {hasGoal && responseType === 'yesno' && (
              <p className="text-sm p-3 rounded-lg bg-blue-50" style={{ color: 'var(--blue)' }}>
                Goal for Yes/No: aim to answer &quot;Yes&quot; every time. This will show as a 100% target on the graph.
              </p>
            )}
          </>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <>
            <Field label={`Send Time (${clientTimezone.replace('America/', '').replace('_', ' ')} time)`}>
              <input type="time" value={sendTime} onChange={e => setSendTime(e.target.value)} className={inp} />
            </Field>
            <Field label="Delivery Method">
              <div className="flex gap-4 mt-1">
                {(['sms', 'email'] as const).map((val) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="deliveryMethod" value={val} checked={deliveryMethod === val}
                      onChange={() => setDeliveryMethod(val)} />
                    {val === 'sms' ? 'SMS' : 'Email'}
                  </label>
                ))}
              </div>
            </Field>
          </>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Optional: set the y-axis range for the progress graph. Leave blank to auto-scale.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Y-Axis Minimum">
                <input type="number" value={graphMin} onChange={e => setGraphMin(e.target.value)} className={inp} placeholder="e.g. 0" />
              </Field>
              <Field label="Y-Axis Maximum">
                <input type="number" value={graphMax} onChange={e => setGraphMax(e.target.value)} className={inp} placeholder="e.g. 10" />
              </Field>
            </div>
          </>
        )}

        {/* STEP 6 — Preview */}
        {step === 6 && (
          <>
            <div className="p-4 rounded-lg bg-gray-50 border space-y-1 text-sm" style={{ borderColor: 'var(--border)' }}>
              <p><strong>Metric:</strong> {name}</p>
              <p><strong>Message:</strong> {promptText} — Reply with {responseType === 'yesno' ? 'YES or NO' : 'a number'}.</p>
              <p><strong>Schedule:</strong> Every {recurrenceValue} {recurrenceUnit} · {sendDays.join(', ')}</p>
              <p><strong>Sends at:</strong> {sendTime} ({clientTimezone.replace('America/', '').replace('_', ' ')})</p>
              <p><strong>Delivery:</strong> {deliveryMethod === 'sms' ? '📱 SMS' : '📧 Email'}</p>
              <p><strong>Dates:</strong> {startDate} → {endDateAuto ? calcEndDate() : endDate}</p>
              {hasGoal && <p><strong>Goal:</strong> {goalStart} → {goalEnd} ({goalDirection === 'meet_or_exceed' ? 'Meet or Exceed' : 'Meet or Stay Below'})</p>}
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--navy)' }}>Graph Preview (sample data)</p>
              <div className="h-44 bg-white border rounded-lg p-2" style={{ borderColor: 'var(--border)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={previewData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={28}
                      domain={[graphMin ? parseFloat(graphMin) : 'auto', graphMax ? parseFloat(graphMax) : 'auto']} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    {hasGoal && goalStart && (
                      <ReferenceLine y={parseFloat(goalStart)} stroke="#2E75B6" strokeDasharray="4 4"
                        label={{ value: 'Goal', fontSize: 10, fill: '#2E75B6' }} />
                    )}
                    <Line type="monotone" dataKey="value" stroke="#2E75B6" strokeWidth={2} dot={{ r: 3, fill: '#2E75B6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
          </>
        )}

        {/* Nav buttons */}
        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <button type="button" onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 rounded-lg text-sm font-medium border"
              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
              ← Back
            </button>
          )}
          {step < 6 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && (!name || !promptText)}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--blue)' }}>
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ background: 'var(--blue)' }}>
              {saving ? 'Activating...' : 'Activate This Metric'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
        {label}
        {hint && <span className="ml-1 font-normal text-xs" style={{ color: 'var(--muted)' }}>({hint})</span>}
      </label>
      {children}
    </div>
  )
}
