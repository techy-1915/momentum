import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/TasksPage'
import CalendarPage from './pages/CalendarPage'
import TimetablePage from './pages/TimetablePage'
import RemindersPage from './pages/RemindersPage'
import TimerPage from './pages/TimerPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ProfilePage from './pages/ProfilePage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="tasks"      element={<TasksPage />} />
          <Route path="calendar"   element={<CalendarPage />} />
          <Route path="timetable"  element={<TimetablePage />} />
          <Route path="reminders"  element={<RemindersPage />} />
          <Route path="timer"      element={<TimerPage />} />
          <Route path="analytics"  element={<AnalyticsPage />} />
          <Route path="profile"    element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
