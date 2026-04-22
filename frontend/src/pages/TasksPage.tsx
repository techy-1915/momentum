import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, endpoints } from '../lib/api'
import { useAppStore } from '../store/app'
import TaskCard from '../components/tasks/TaskCard'
import { Search, SlidersHorizontal, Plus, CheckSquare } from 'lucide-react'
import type { Task } from '../types'

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Done' },
]

const SORT_OPTIONS = [
  { key: 'smart', label: 'Smart (Priority)' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'priority', label: 'Priority' },
  { key: 'created', label: 'Newest' },
  { key: 'title', label: 'A–Z' },
]

export default function TasksPage() {
  const { openTaskModal } = useAppStore()
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('smart')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', status, sort, search, priority],
    queryFn: () => api.get(endpoints.tasks, {
      params: { status: status || undefined, sort_by: sort, search: search || undefined, priority: priority || undefined }
    }).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: stats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => api.get(endpoints.taskStats).then(r => r.data),
  })

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Tasks</h1>
          {stats && <p className="text-sm text-gray-500 mt-0.5">{stats.todo} remaining · {stats.completed} done</p>}
        </div>
        <button onClick={() => openTaskModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Search + sort */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition"
          />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-primary-500">
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <button onClick={() => setShowFilters(s => !s)}
          className={`p-2.5 rounded-xl border transition ${showFilters ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-gray-800 text-gray-400 hover:border-gray-700'}`}>
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none">
              <option value="">All</option>
              {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {STATUS_TABS.map(tab => (
          <button key={tab.key} onClick={() => setStatus(tab.key)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
              status === tab.key
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !tasks?.length ? (
        <div className="text-center py-16">
          <CheckSquare className="w-12 h-12 text-gray-800 mx-auto mb-3" />
          <p className="text-gray-500">No tasks found</p>
          <button onClick={() => openTaskModal()} className="mt-4 text-sm text-primary-400 hover:text-primary-300">
            + Create your first task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => (
            <TaskCard key={t.id} task={t} onEdit={(t) => openTaskModal(t.id)} />
          ))}
          <p className="text-center text-xs text-gray-600 py-2">{tasks.length} tasks</p>
        </div>
      )}
    </div>
  )
}
