import { PRIORITY_BG, STATUS_COLORS } from '../../lib/utils'
import type { Priority, TaskStatus } from '../../types'

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_BG[priority]}`}>
      {priority}
    </span>
  )
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const labels: Record<TaskStatus, string> = {
    todo: 'To Do', in_progress: 'In Progress', completed: 'Done', cancelled: 'Cancelled'
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]}`}>
      {labels[status]}
    </span>
  )
}

export function LabelBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ background: color + '30', color }}>
      {name}
    </span>
  )
}
