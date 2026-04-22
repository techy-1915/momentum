import { Bell, Plus, Search, Menu } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, endpoints } from '../../lib/api'
import { useAppStore } from '../../store/app'
import { format } from 'date-fns'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/tasks':      'Tasks',
  '/calendar':   'Calendar',
  '/timetable':  'Timetable',
  '/reminders':  'Reminders',
  '/timer':      'Focus Timer',
  '/analytics':  'Analytics',
  '/profile':    'Profile',
}

export default function TopBar() {
  const { openTaskModal, toggleSidebar } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: pending } = useQuery({
    queryKey: ['pending-count'],
    queryFn: () => api.get(endpoints.pendingRems).then(r => r.data),
    refetchInterval: 60000,
  })

  const title = PAGE_TITLES[location.pathname] ?? 'Momentum'

  return (
    <header className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-200 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-100">{title}</h1>
        <span className="text-gray-600 text-sm hidden md:block">
          {format(new Date(), 'EEEE, MMMM d')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:block">Search</span>
        </button>

        <button
          onClick={() => navigate('/reminders')}
          className="relative text-gray-400 hover:text-gray-200 p-2 rounded-lg hover:bg-gray-800 transition"
        >
          <Bell className="w-5 h-5" />
          {pending && pending.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => openTaskModal()}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  )
}
