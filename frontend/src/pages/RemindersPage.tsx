import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, endpoints } from '../lib/api'
import { useAppStore } from '../store/app'
import { Bell, Plus, X, Clock, AlarmClock, Check, Repeat } from 'lucide-react'
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns'
import type { Reminder } from '../types'

function formatRemindAt(dt: string): string {
  try {
    const d = parseISO(dt)
    if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`
    if (isTomorrow(d)) return `Tomorrow at ${format(d, 'h:mm a')}`
    return format(d, 'MMM d, yyyy h:mm a')
  } catch { return dt }
}

export default function RemindersPage() {
  const qc = useQueryClient()
  const { addToast } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'upcoming' | 'all' | 'past'>('upcoming')
  const [form, setForm] = useState({
    title: '', message: '', remind_at: '', repeat: 'none',
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const { data: reminders } = useQuery<Reminder[]>({
    queryKey: ['reminders', filter],
    queryFn: () => api.get(endpoints.reminders, {
      params: filter === 'upcoming' ? { upcoming: true } : {}
    }).then(r => r.data),
    refetchInterval: 30000,
  })

  const create = useMutation({
    mutationFn: () => api.post(endpoints.reminders, {
      title: form.title,
      message: form.message || undefined,
      remind_at: form.remind_at,
      repeat: form.repeat !== 'none' ? form.repeat : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      setShowForm(false)
      setForm({ title: '', message: '', remind_at: '', repeat: 'none' })
      addToast('Reminder set!', 'success')
    },
    onError: () => addToast('Failed to create reminder', 'error'),
  })

  const dismiss = useMutation({
    mutationFn: (id: string) => api.put(`${endpoints.reminders}${id}`, { is_dismissed: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); addToast('Dismissed', 'info') },
  })

  const snooze = useMutation({
    mutationFn: (id: string) => api.post(`${endpoints.reminders}${id}/snooze?minutes=15`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); addToast('Snoozed 15 minutes', 'info') },
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`${endpoints.reminders}${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); addToast('Deleted', 'info') },
  })

  const displayed = (reminders ?? []).filter(r => {
    if (filter === 'upcoming') return !isPast(parseISO(r.remind_at)) && !r.is_dismissed
    if (filter === 'past') return isPast(parseISO(r.remind_at)) || r.is_sent
    return true
  })

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Reminders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{displayed.length} reminders</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition">
          <Plus className="w-4 h-4" /> Add Reminder
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {(['upcoming', 'all', 'past'] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
              filter === tab ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Reminders list */}
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-gray-800 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No reminders here</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-primary-400 hover:text-primary-300">
            + Add a reminder
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(r => {
            const overdue = isPast(parseISO(r.remind_at)) && !r.is_sent
            return (
              <div key={r.id} className={`bg-gray-900 border rounded-xl p-4 flex items-start gap-3 transition ${
                r.is_dismissed ? 'border-gray-800 opacity-50' :
                overdue ? 'border-amber-500/30 bg-amber-500/5' :
                'border-gray-800 hover:border-gray-700'
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  r.is_sent ? 'bg-emerald-500/10' : overdue ? 'bg-amber-500/10' : 'bg-primary-500/10'
                }`}>
                  {r.is_sent ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : overdue ? (
                    <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
                  ) : (
                    <Clock className="w-4 h-4 text-primary-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-200 text-sm">{r.title}</p>
                  {r.message && <p className="text-xs text-gray-500 mt-0.5">{r.message}</p>}
                  {r.task_title && (
                    <p className="text-xs text-blue-400 mt-0.5">Task: {r.task_title}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-amber-400' : 'text-gray-500'}`}>
                      <Clock className="w-3 h-3" />
                      {formatRemindAt(r.remind_at)}
                    </span>
                    {r.repeat && r.repeat !== 'none' && (
                      <span className="flex items-center gap-1 text-xs text-purple-400">
                        <Repeat className="w-3 h-3" /> {r.repeat}
                      </span>
                    )}
                  </div>
                </div>
                {!r.is_dismissed && !r.is_sent && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => snooze.mutate(r.id)} title="Snooze 15m"
                      className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition">
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => dismiss.mutate(r.id)} title="Dismiss"
                      className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => del.mutate(r.id)} title="Delete"
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add reminder modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-100">New Reminder</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <input value={form.title} onChange={e => f('title', e.target.value)}
              placeholder="Reminder title"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500" />

            <textarea value={form.message} onChange={e => f('message', e.target.value)}
              placeholder="Optional message..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 resize-none" />

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Remind at</label>
              <input type="datetime-local" value={form.remind_at} onChange={e => f('remind_at', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500" />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Repeat</label>
              <select value={form.repeat} onChange={e => f('repeat', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500">
                <option value="none">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            {/* Quick time presets */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Quick presets</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'In 15m', mins: 15 },
                  { label: 'In 1h', mins: 60 },
                  { label: 'Tomorrow 9am', custom: true },
                ].map(p => (
                  <button key={p.label}
                    onClick={() => {
                      const d = new Date()
                      if (p.custom) {
                        d.setDate(d.getDate() + 1)
                        d.setHours(9, 0, 0, 0)
                      } else {
                        d.setMinutes(d.getMinutes() + (p.mins ?? 0))
                      }
                      f('remind_at', d.toISOString().slice(0, 16))
                    }}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-700 rounded-xl text-gray-400 text-sm hover:bg-gray-800 transition">
                Cancel
              </button>
              <button onClick={() => create.mutate()} disabled={!form.title || !form.remind_at || create.isPending}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
                {create.isPending ? 'Setting...' : 'Set Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
