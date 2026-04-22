export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled'
export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type TimerType = 'pomodoro' | 'stopwatch' | 'countdown'

export interface Label {
  id: string
  name: string
  color: string
  icon?: string
  task_count?: number
}

export interface Task {
  id: string
  user_id: string
  parent_id?: string | null
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  due_date?: string | null
  due_time?: string | null
  scheduled_date?: string | null
  scheduled_time?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
  is_recurring: boolean
  recurrence?: Recurrence | null
  recurrence_interval: number
  recurrence_days?: number[] | null
  recurrence_end_date?: string | null
  recurrence_count?: number | null
  estimated_minutes?: number | null
  actual_minutes?: number | null
  category?: string | null
  color?: string | null
  notes?: string | null
  order_index: number
  defer_count: number
  tags: string[]
  priority_score: number
  suggested_priority: Priority
  subtasks: Task[]
  labels: Label[]
}

export interface Reminder {
  id: string
  task_id?: string | null
  user_id: string
  title: string
  message?: string
  remind_at: string
  is_sent: boolean
  is_dismissed: boolean
  repeat?: string | null
  created_at: string
  task_title?: string | null
}

export interface TimerSession {
  id: string
  task_id?: string | null
  user_id: string
  timer_type: TimerType
  target_seconds?: number | null
  actual_seconds: number
  status: string
  notes?: string
  started_at: string
  ended_at?: string | null
  task_title?: string | null
}

export interface TimeBlock {
  id: string
  user_id: string
  title: string
  description?: string
  day_of_week?: number | null
  specific_date?: string | null
  start_time: string
  end_time: string
  color: string
  category?: string | null
  is_recurring: boolean
  created_at: string
}

export interface AuthUser {
  token: string
  user_id: string
  email: string
  name: string
  theme: string
  avatar_color: string
  timezone: string
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}
