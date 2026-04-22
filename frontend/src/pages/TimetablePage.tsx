import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, endpoints } from '../lib/api'
import { useAppStore } from '../store/app'
import { Plus, Trash2, X } from 'lucide-react'
import type { TimeBlock } from '../types'
import { DAYS, DAYS_SHORT } from '../lib/utils'

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6)  // 6am–10pm
const COLORS = ['#7C3AED','#3B82F6','#10B981','#EF4444','#F59E0B','#EC4899','#8B5CF6','#06B6D4']

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToPx(minutes: number, rowH: number): number {
  return (minutes / 60) * rowH
}

const ROW_H = 56  // px per hour

export default function TimetablePage() {
  const qc = useQueryClient()
  const { addToast } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', day_of_week: 0, start_time: '09:00', end_time: '10:00',
    color: '#7C3AED', category: '', is_recurring: true,
  })
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const { data: blocks } = useQuery<TimeBlock[]>({
    queryKey: ['timetable'],
    queryFn: () => api.get(endpoints.timetable).then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => api.post(endpoints.timetable, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timetable'] }); setShowForm(false); addToast('Block added', 'success') },
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`${endpoints.timetable}${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timetable'] }); addToast('Block removed', 'info') },
  })

  const recurringBlocks = (blocks ?? []).filter(b => b.is_recurring)

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Timetable</h1>
          <p className="text-gray-500 text-sm mt-0.5">Weekly recurring schedule</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition">
          <Plus className="w-4 h-4" /> Add Block
        </button>
      </div>

      {/* Weekly grid */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `64px repeat(7, 1fr)` }}>
          {/* Header */}
          <div className="border-b border-gray-800 py-3" />
          {DAYS_SHORT.map((d, i) => (
            <div key={d} className="border-b border-gray-800 border-l py-3 text-center text-xs font-medium text-gray-400">{d}</div>
          ))}

          {/* Time rows */}
          {HOURS.map(h => (
            <div key={h} className="contents">
              <div className="border-t border-gray-800/50 py-3 px-2 text-right text-xs text-gray-600 font-mono"
                style={{ height: ROW_H }}>
                {String(h).padStart(2,'0')}:00
              </div>
              {DAYS.map((_, dayIdx) => {
                const dayBlocks = recurringBlocks.filter(b => b.day_of_week === dayIdx)
                const startedHere = dayBlocks.filter(b => {
                  const blockStart = Math.floor(timeToMinutes(b.start_time) / 60)
                  return blockStart === h
                })
                return (
                  <div key={dayIdx} className="border-t border-l border-gray-800/50 relative" style={{ height: ROW_H }}>
                    {startedHere.map(b => {
                      const startMin = timeToMinutes(b.start_time)
                      const endMin = timeToMinutes(b.end_time)
                      const top = minutesToPx(startMin % 60, ROW_H)
                      const height = minutesToPx(endMin - startMin, ROW_H)
                      return (
                        <div key={b.id}
                          className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-xs overflow-hidden group cursor-pointer"
                          style={{ top, height: Math.max(height, 20), background: b.color + '30', borderLeft: `3px solid ${b.color}` }}>
                          <p className="font-medium truncate" style={{ color: b.color }}>{b.title}</p>
                          <p className="text-gray-500 text-[10px]">{b.start_time}–{b.end_time}</p>
                          <button
                            onClick={() => del.mutate(b.id)}
                            className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition text-gray-500 hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {blocks && blocks.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">All Blocks</h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set((blocks ?? []).map(b => b.title))).map(title => {
              const b = blocks.find(b => b.title === title)!
              return (
                <div key={title} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: b.color + '20', color: b.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                  {title}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add block modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-100">Add Time Block</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input value={form.title} onChange={e => f('title', e.target.value)}
              placeholder="Block title (e.g. Deep Work)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Day</label>
                <select value={form.day_of_week} onChange={e => f('day_of_week', parseInt(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500">
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Category</label>
                <input value={form.category} onChange={e => f('category', e.target.value)}
                  placeholder="e.g. Work"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start time</label>
                <input type="time" value={form.start_time} onChange={e => f('start_time', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End time</label>
                <input type="time" value={form.end_time} onChange={e => f('end_time', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => f('color', c)}
                    className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-700 rounded-xl text-gray-400 text-sm hover:bg-gray-800 transition">
                Cancel
              </button>
              <button onClick={() => create.mutate()} disabled={!form.title || create.isPending}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
                {create.isPending ? 'Adding...' : 'Add Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
