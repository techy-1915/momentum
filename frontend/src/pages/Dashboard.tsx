import { useQuery } from '@tanstack/react-query'
import { api, endpoints } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useAppStore } from '../store/app'
import { CheckSquare, Clock, AlertTriangle, Zap, Flame, TrendingUp, Plus, Timer } from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import TaskCard from '../components/tasks/TaskCard'
import { getInitials } from '../lib/utils'
import type { Task } from '../types'

function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const user = useAuthStore(s => s.user)
  const { openTaskModal } = useAppStore()

  const { data: stats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => api.get(endpoints.taskStats).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: todayTasks } = useQuery<Task[]>({
    queryKey: ['task-today'],
    queryFn: () => api.get(endpoints.taskToday).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: overdueTasks } = useQuery<Task[]>({
    queryKey: ['task-overdue'],
    queryFn: () => api.get(endpoints.taskOverdue).then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get(endpoints.analyticsSummary).then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: timerToday } = useQuery({
    queryKey: ['timer-today'],
    queryFn: () => api.get(endpoints.timerToday).then(r => r.data),
    refetchInterval: 60000,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: user?.avatar_color }}>
              {getInitials(user?.name ?? '')}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">{greeting}, {user?.name.split(' ')[0]}! 👋</h1>
              <p className="text-gray-500 text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => openTaskModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Due Today" value={stats?.due_today ?? 0} icon={<CheckSquare className="w-4 h-4 text-blue-400" />} color="bg-blue-500/10" />
        <StatCard label="Overdue" value={stats?.overdue ?? 0} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} color="bg-red-500/10" />
        <StatCard label="Streak" value={`${summary?.streak_days ?? 0} days`} icon={<Flame className="w-4 h-4 text-orange-400" />} color="bg-orange-500/10" />
        <StatCard label="Focus Today" value={timerToday ? `${timerToday.total_focus_minutes}m` : '0m'} icon={<Timer className="w-4 h-4 text-purple-400" />} color="bg-purple-500/10"
          sub={timerToday ? `${timerToday.pomodoros_completed} pomodoros` : undefined} />
      </div>

      {/* Completion progress */}
      {stats && stats.total > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-gray-200">Overall Progress</span>
            <span className="text-sm text-gray-400">{stats.completed}/{stats.total} tasks</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-600 to-emerald-500 rounded-full transition-all"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }} />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-500 inline-block" />{stats.todo} to do</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{stats.in_progress} in progress</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{stats.completed} done</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's tasks */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-200">Today's Tasks</h2>
            <Link to="/tasks" className="text-xs text-primary-400 hover:text-primary-300 transition">View all →</Link>
          </div>
          {!todayTasks?.length ? (
            <div className="text-center py-8">
              <Zap className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No tasks due today</p>
              <button onClick={() => openTaskModal()} className="mt-3 text-xs text-primary-400 hover:text-primary-300">+ Add a task</button>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {todayTasks.slice(0, 6).map(t => (
                <TaskCard key={t.id} task={t} onEdit={(t) => openTaskModal(t.id)} />
              ))}
              {todayTasks.length > 6 && (
                <Link to="/tasks" className="block text-center text-xs text-primary-400 hover:text-primary-300 py-1">
                  +{todayTasks.length - 6} more tasks
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Overdue + upcoming */}
        <div className="space-y-4">
          {/* Overdue */}
          {overdueTasks && overdueTasks.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Overdue
                </h2>
                <span className="text-xs text-red-400">{overdueTasks.length} tasks</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {overdueTasks.slice(0, 4).map(t => (
                  <TaskCard key={t.id} task={t} onEdit={(t) => openTaskModal(t.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Focus shortcuts */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="font-semibold text-gray-200 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/timer', icon: Timer, label: 'Start Focus', color: 'text-purple-400', bg: 'bg-purple-500/10 hover:bg-purple-500/20' },
                { to: '/calendar', icon: Clock, label: 'Calendar', color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/20' },
                { to: '/analytics', icon: TrendingUp, label: 'Analytics', color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20' },
                { to: '/timetable', icon: Zap, label: 'Timetable', color: 'text-amber-400', bg: 'bg-amber-500/10 hover:bg-amber-500/20' },
              ].map(({ to, icon: Icon, label, color, bg }) => (
                <Link key={to} to={to} className={`flex items-center gap-2 p-3 rounded-xl ${bg} transition`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm text-gray-300">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
