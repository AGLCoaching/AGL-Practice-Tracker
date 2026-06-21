export type UserRole = 'admin' | 'coach'
export type ContactMethod = 'sms' | 'email'
export type ResponseType = 'number' | 'yesno'
export type RecurrenceUnit = 'days' | 'weeks' | 'months'
export type GoalDirection = 'meet_or_exceed' | 'meet_or_below'
export type ReminderStatus = 'pending' | 'sent' | 'failed'
export type LogSource = 'sms' | 'email' | 'manual'

export interface AppUser {
  id: string
  email: string
  first_name: string
  last_name: string
  company_name: string | null
  logo_url: string | null
  phone: string | null
  timezone: string
  role: UserRole
  is_active: boolean
  invited_at: string | null
  accepted_at: string | null
  created_at: string
}

export interface Client {
  id: string
  coach_id: string
  first_name: string
  last_name: string
  company_name: string | null
  title: string | null
  email: string
  phone: string | null
  timezone: string
  preferred_contact: ContactMethod
  notes: string | null
  dashboard_token: string
  is_active: boolean
  created_at: string
}

export interface PracticeMetric {
  id: string
  client_id: string
  coach_id: string
  name: string
  prompt_text: string
  unit_label: string
  response_type: ResponseType
  start_date: string
  end_date: string
  recurrence_value: number
  recurrence_unit: RecurrenceUnit
  send_days: string[] | null
  send_time: string
  delivery_method: ContactMethod
  has_goal: boolean
  goal_start: number | null
  goal_end: number | null
  goal_direction: GoalDirection | null
  graph_min: number | null
  graph_max: number | null
  is_active: boolean
  created_at: string
}

export interface PracticeLog {
  id: string
  metric_id: string
  client_id: string
  logged_value: number
  logged_at: string
  source: LogSource
  raw_response: string | null
}

export interface ReminderJob {
  id: string
  metric_id: string
  scheduled_for: string
  sent_at: string | null
  status: ReminderStatus
  response_received: boolean
}

// Extended types with joins
export interface ClientWithCoach extends Client {
  coach?: AppUser
  metrics?: PracticeMetric[]
}

export interface MetricWithLogs extends PracticeMetric {
  logs?: PracticeLog[]
}
