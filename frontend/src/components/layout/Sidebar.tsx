import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Calendar, Grid3x3,
  Bell, Timer, BarChart2, User, LogOut, Zap, Tag
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useAppStore } from '../../store/app'
import { api, endpoints } from '../../lib/api'
import { getInitials } from '../../lib/utils'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',      icon: CheckSquare,     label: 'Tasks' },
  { to: '/calendar',   icon: Calendar,        label: 'Calendar' },
  { to: '/timetable',  icon: Grid3x3,         label: 'Timetable' },
  { to: '/reminders',  icon: Bell,            label: 'Reminders' },
  { to: '/timer',      icon: Timer,           label: 'Focus Timer' },
  { to: '/analytics',  icon: BarChart2,       label: 'Analytics' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, addToast } = useAppStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await api.post(endpoints.logout) } catch {}
    logout()
    navigate('/login')
    addToast('Signed out successfully', 'info')
  }

  const collapsed = sidebarCollapsed

  return (
    <aside className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 flex flex-col z-30 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className={`px-4 py-4 border-b border-gray-800 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && <span className="font-bold text-gray-100 text-lg">Momentum</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              } ${collapsed ? 'justify-center' : ''}`
            }>
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}

        <div className="mx-4 my-3 border-t border-gray-800" />

        <NavLink to="/profile"
          title={collapsed ? 'Profile' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive ? 'bg-primary-600/20 text-primary-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            } ${collapsed ? 'justify-center' : ''}`
          }>
          <User className="w-4 h-4 shrink-0" />
          {!collapsed && 'Profile'}
        </NavLink>
      </nav>

      {/* User + logout */}
      <div className={`p-3 border-t border-gray-800 space-y-2 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: user.avatar_color }}>
              {getInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Sign out"
          className={`flex items-center gap-2 text-gray-400 hover:text-red-400 text-xs py-1.5 px-2 rounded-lg hover:bg-red-500/10 transition w-full ${collapsed ? 'justify-center' : ''}`}>
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
