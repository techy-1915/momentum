import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { X, Plus, Repeat, Bell } from 'lucide-react'
import { api, endpoints } from '../../lib/api'
import { useAppStore } from '../../store/app'
import type { Task, Label, Priority, Recurrence } from '../../types'
import { PRIORITY_COLORS } from '../../lib/utils'

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const RECURRENCES: Recurrence[] = ['daily', 'weekly', 'monthly', 'yearly']

export default function TaskModal() {
  const { closeTaskModal, editingTaskId, addToast } = useAppStore()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium' as Priority,
    due_date: '', due_time: '', scheduled_date: '', scheduled_time: '',
    category: '', notes: '', estimated_minutes: '',
    is_recurring: false, recurrence: 'daily' as Recurrence,
    recurrence_interval: 1, recurrence_end_date: '',
    tags: '' as string, label_ids: [] as string[],
    addReminder: false, remind_at: '',
  })

  const { data: labels } = useQuery<Label[]>({
    queryKey: ['labels'],
    queryFn: () => api.get(endpoints.labels).then(r => r.data),
  })

  const { data: editTask } = useQuery<Task>({
    queryKey: ['task', editingTaskId],
    queryFn: () => api.get(`${endpoints.tasks}${editingTaskId}`).then(r => r.data),
    enabled: !!editingTaskId,
  })

  useEffect(() => {
    if (editTask) {
      setForm(f => ({
        ...f,
        title: editTask.title,
        description: editTask.description ?? '',
        priority: editTask.priority,
        due_date: editTask.due_date ?? '',
        due_time: editTask.due_time ?? '',
        scheduled_date: editTask.scheduled_date ?? '',
        category: editTask.category ?? '',
        notes: editTask.notes ?? '',
        estimated_minutes: editTask.estimated_minutes?.toString() ?? '',
        is_recurring: editTask.is_recurring,
        recurrence: editTask.recurrence ?? 'daily',
        recurrence_interval: editTask.recurrence_interval ?? 1,
        recurrence_end_date: editTask.recurrence_end_date ?? '',
        tags: (editTask.tags ?? []).join(', '),
        label_ids: editTask.labels.map(l => l.id),
      }))
    }
  }, [editTask])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['task-today'] })
    qc.invalidateQueries({ queryKey: ['task-stats'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description || undefined,
        priority: form.priority,
        due_date: form.due_date || undefined,
        due_time: form.due_time || undefined,
        scheduled_date: form.scheduled_date || undefined,
        category: form.category || undefined,
        notes: form.notes || undefined,
        estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : undefined,
        is_recurring: form.is_recurring,
        recurrence: form.is_recurring ? form.recurrence : undefined,
        recurrence_interval: form.recurrence_interval,
        recurrence_end_date: form.recurrence_end_date || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        label_ids: form.label_ids,
      }
      if (editingTaskId) {
        await api.put(`${endpoints.tasks}${editingTaskId}`, payload)
      } else {
        const res = await api.post(endpoints.tasks, payload)
        // Add reminder if requested
        if (form.addReminder && form.remind_at) {
          await api.post(endpoints.reminders, {
            title: `Reminder: ${form.title}`,
            remind_at: form.remind_at,
            task_id: res.data.id,
          })
        }
      }
    },
    onSuccess: () => {
      addToast(editingTaskId ? 'Task updated' : 'Task created!', 'success')
      invalidate()
      closeTaskModal()
    },
    onError: () => addToast('Failed to save task', 'error'),
  })

  const f = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeTaskModal() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">{editingTaskId ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={closeTaskModal} className="text-gray-500 hover:text-gray-300 transition p-1 rounded-lg hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-4">
          {/* Title */}
          <input
            autoFocus
            value={form.title}
            onChange={e => f('title', e.target.value)}
            placeholder="What needs to be done?"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 text-lg font-medium focus:outline-none focus:border-primary-500 transition"
          />

          {/* Description */}
          <textarea
            value={form.description}
            onChange={e => f('description', e.target.value)}
            placeholder="Add description (optional)"
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 transition resize-none"
          />

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-2 block">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => f('priority', p)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                    form.priority === p
                      ? 'border-transparent text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                  style={form.priority === p ? { background: PRIORITY_COLORS[p] + 'dd' } : {}}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => f('due_date', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500 transition" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Due Time</label>
              <input type="time" value={form.due_time} onChange={e => f('due_time', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500 transition" />
            </div>
          </div>

          {/* Category + Estimate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Category</label>
              <input value={form.category} onChange={e => f('category', e.target.value)}
                placeholder="e.g. Work, Health"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Estimated (minutes)</label>
              <input type="number" value={form.estimated_minutes} onChange={e => f('estimated_minutes', e.target.value)}
                placeholder="e.g. 30"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition" />
            </div>
          </div>

          {/* Labels */}
          {labels && labels.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">Labels</label>
              <div className="flex flex-wrap gap-2">
                {labels.map(l => (
                  <button key={l.id}
                    onClick={() => f('label_ids', form.label_ids.includes(l.id)
                      ? form.label_ids.filter(id => id !== l.id)
                      : [...form.label_ids, l.id]
                    )}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      form.label_ids.includes(l.id) ? 'border-transparent' : 'border-gray-700 text-gray-400'
                    }`}
                    style={form.label_ids.includes(l.id) ? { background: l.color + '40', color: l.color, borderColor: l.color + '60' } : {}}>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => f('tags', e.target.value)}
              placeholder="e.g. important, urgent, q3"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition" />
          </div>

          {/* Recurring */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={form.is_recurring} onChange={e => f('is_recurring', e.target.checked)}
                className="w-4 h-4 rounded accent-primary-600" />
              <Repeat className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Recurring task</span>
            </label>
            {form.is_recurring && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Repeat</label>
                  <select value={form.recurrence} onChange={e => f('recurrence', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-primary-500">
                    {RECURRENCES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Every (N)</label>
                  <input type="number" min={1} value={form.recurrence_interval}
                    onChange={e => f('recurrence_interval', parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End date</label>
                  <input type="date" value={form.recurrence_end_date}
                    onChange={e => f('recurrence_end_date', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-primary-500" />
                </div>
              </div>
            )}
          </div>

          {/* Reminder */}
          {!editingTaskId && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" checked={form.addReminder} onChange={e => f('addReminder', e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-600" />
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-gray-300">Add reminder</span>
              </label>
              {form.addReminder && (
                <input type="datetime-local" value={form.remind_at} onChange={e => f('remind_at', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500" />
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => f('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={closeTaskModal}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm font-medium hover:bg-gray-800 transition">
              Cancel
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={!form.title.trim() || save.isPending}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium transition">
              {save.isPending ? 'Saving...' : editingTaskId ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
