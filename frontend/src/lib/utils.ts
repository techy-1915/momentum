import { format, formatDistanceToNow, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import type { Priority, TaskStatus } from '../types'

export const PRIORITY_COLORS: Record<Priority, string> = {
  low:    '#6B7280',
  medium: '#3B82F6',
  high:   '#F59E0B',
  urgent: '#EF4444',
}

export const PRIORITY_BG: Record<Priority, string> = {
  low:    'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high:   'bg-amber-500/20 text-amber-400',
  urgent: 'bg-red-500/20 text-red-400',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo:        'bg-gray-500/20 text-gray-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed:   'bg-emerald-500/20 text-emerald-400',
  cancelled:   'bg-red-500/20 text-red-400',
}

export function formatDueDate(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const d = parseISO(dateStr)
    let label = ''
    if (isToday(d)) label = 'Today'
    else if (isTomorrow(d)) label = 'Tomorrow'
    else label = format(d, 'MMM d')
    if (timeStr) label += ` at ${timeStr.slice(0,5)}`
    return label
  } catch {
    return dateStr
  }
}

export function isDueSoon(dateStr?: string | null): boolean {
  if (!dateStr) return false
  try {
    const d = parseISO(dateStr)
    const diff = (d.getTime() - Date.now()) / 86400000
    return diff >= 0 && diff <= 2
  } catch { return false }
}

export function isOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false
  try {
    return isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr))
  } catch { return false }
}

export function timeAgo(dt?: string | null): string {
  if (!dt) return ''
  try { return formatDistanceToNow(parseISO(dt), { addSuffix: true }) }
  catch { return '' }
}

export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function formatFocusTime(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
