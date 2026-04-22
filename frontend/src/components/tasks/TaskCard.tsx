import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Clock, Repeat, MoreVertical, Pencil, Trash2, SkipForward, Play } from 'lucide-react'
import { motion } from 'framer-motion'
import { api, endpoints } from '../../lib/api'
import { useAppStore } from '../../store/app'
import { PriorityBadge, LabelBadge } from '../ui/Badge'
import { formatDueDate, isOverdue, isDueSoon, PRIORITY_COLORS } from '../../lib/utils'
import type { Task } from '../../types'

export default function TaskCard({ task, onEdit }: { task: Task; onEdit?: (t: Task) => void }) {
  const qc = useQueryClient()
  const { addToast } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['task-today'] })
    qc.invalidateQueries({ queryKey: ['task-stats'] })
  }

  const complete = useMutation({
    mutationFn: () => api.post(`${endpoints.tasks}${task.id}/complete`),
    onSuccess: () => { addToast('Task completed! 🎉', 'success'); invalidate() },
  })

  const defer = useMutation({
    mutationFn: () => api.post(`${endpoints.tasks}${task.id}/defer?days=1`),
    onSuccess: () => { addToast('Task deferred by 1 day', 'info'); invalidate() },
  })

  const del = useMutation({
    mutationFn: () => api.delete(`${endpoints.tasks}${task.id}`),
    onSuccess: () => { addToast('Task deleted', 'info'); invalidate() },
  })

  const overdue = isOverdue(task.due_date) && task.status !== 'completed'
  const soon = isDueSoon(task.due_date)
  const done = task.status === 'completed'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
        done
          ? 'border-gray-800 bg-gray-900/40 opacity-60'
          : overdue
          ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
          : 'border-gray-800 bg-gray-900 hover:border-gray-700'
      }`}
    >
      {/* Priority stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: done ? 'transparent' : PRIORITY_COLORS[task.priority] + '80' }}
      />

      {/* Checkbox */}
      <button
        onClick={() => !done && complete.mutate()}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          done
            ? 'border-emerald-500 bg-emerald-500'
            : 'border-gray-600 hover:border-primary-500'
        }`}
      >
        {done && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-gray-500' : 'text-gray-100'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <button onClick={() => onEdit?.(task)}
              className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setMenuOpen(o => !o)}
              className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-xl min-w-36 py-1">
                <button onClick={() => { defer.mutate(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition">
                  <SkipForward className="w-3.5 h-3.5" /> Defer 1 day
                </button>
                <button onClick={() => { del.mutate(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <PriorityBadge priority={task.priority} />

          {task.due_date && (
            <span className={`flex items-center gap-1 text-xs ${
              overdue ? 'text-red-400' : soon ? 'text-amber-400' : 'text-gray-500'
            }`}>
              <Clock className="w-3 h-3" />
              {formatDueDate(task.due_date, task.due_time)}
            </span>
          )}

          {task.is_recurring && (
            <span className="flex items-center gap-1 text-xs text-purple-400">
              <Repeat className="w-3 h-3" /> {task.recurrence}
            </span>
          )}

          {task.estimated_minutes && (
            <span className="text-xs text-gray-600">{task.estimated_minutes}m est.</span>
          )}

          {task.labels.map(l => (
            <LabelBadge key={l.id} name={l.name} color={l.color} />
          ))}

          {task.defer_count > 0 && (
            <span className="text-xs text-orange-400">deferred {task.defer_count}×</span>
          )}

          {task.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs text-gray-600">#{tag}</span>
          ))}
        </div>

        {/* Subtask progress */}
        {task.subtasks.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{task.subtasks.filter(s => s.status === 'completed').length}/{task.subtasks.length} subtasks</span>
              <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all"
                  style={{ width: `${(task.subtasks.filter(s => s.status === 'completed').length / task.subtasks.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
