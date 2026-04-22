import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, endpoints } from '../lib/api'
import { useAppStore } from '../store/app'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, parseISO, addMonths, subMonths } from 'date-fns'
import { PRIORITY_COLORS } from '../lib/utils'
import type { Task } from '../types'

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selected, setSelected] = useState<Date>(new Date())
  const { openTaskModal } = useAppStore()

  const { data: allTasks } = useQuery<Task[]>({
    queryKey: ['tasks-calendar', format(currentMonth, 'yyyy-MM')],
    queryFn: () => api.get(endpoints.tasks, {
      params: {
        due_from: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
        due_to: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
        sort_by: 'due_date',
      }
    }).then(r => r.data),
  })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = (getDay(monthStart) + 6) % 7  // Monday-first

  const tasksOnDay = (d: Date) =>
    (allTasks ?? []).filter(t => t.due_date && isSameDay(parseISO(t.due_date), d))

  const selectedTasks = tasksOnDay(selected)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Calendar</h1>
        <button onClick={() => openTaskModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-100 text-lg">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 text-xs rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition">
                Today
              </button>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {[...Array(startPad)].map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const dayTasks = tasksOnDay(day)
              const isSelected = isSameDay(day, selected)
              const today = isToday(day)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  className={`aspect-square flex flex-col items-center justify-start p-1 rounded-xl text-sm transition-all ${
                    isSelected ? 'bg-primary-600 text-white' :
                    today ? 'bg-primary-600/20 text-primary-400 border border-primary-600/40' :
                    'text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <span className="font-medium text-xs leading-none mb-1">{format(day, 'd')}</span>
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {dayTasks.slice(0, 3).map(t => (
                      <span key={t.id} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isSelected ? 'white' : PRIORITY_COLORS[t.priority] }} />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className={`text-[8px] leading-none ${isSelected ? 'text-white' : 'text-gray-500'}`}>+{dayTasks.length - 3}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day tasks */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-200">{format(selected, 'EEEE, MMM d')}</h3>
            <button onClick={() => openTaskModal()}
              className="p-1.5 rounded-lg text-gray-500 hover:text-primary-400 hover:bg-primary-500/10 transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {selectedTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm">No tasks on this day</p>
              <button onClick={() => openTaskModal()} className="mt-2 text-xs text-primary-400 hover:text-primary-300">
                + Add task
              </button>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-80">
              {selectedTasks.map(t => (
                <div key={t.id} className="p-3 rounded-xl border border-gray-800 hover:border-gray-700 transition">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[t.priority] }} />
                    <p className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                      {t.title}
                    </p>
                  </div>
                  {t.due_time && (
                    <p className="text-xs text-gray-500 mt-1 ml-4">at {t.due_time.slice(0, 5)}</p>
                  )}
                  <div className="flex gap-1 mt-1.5 ml-4">
                    {t.labels.map(l => (
                      <span key={l.id} className="text-xs px-1.5 py-0.5 rounded" style={{ background: l.color + '30', color: l.color }}>{l.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
