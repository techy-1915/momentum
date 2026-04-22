import axios from 'axios'

declare const __API_URL__: string

// When running as a native Capacitor app (APK/IPA), use the absolute cloud URL.
// When running as PWA/web, use relative URLs (proxied to local server).
function getBaseURL(): string {
  // Vite injects __API_URL__ at build time from VITE_API_URL env var
  const configured = typeof __API_URL__ !== 'undefined' ? __API_URL__ : ''
  if (configured) return configured

  // Capacitor native runtime detection
  const cap = (window as any).Capacitor
  if (cap?.isNativePlatform?.()) {
    // Fallback: local network backend during dev/testing
    // Android emulator uses 10.0.2.2 to reach host localhost
    return 'http://10.0.2.2:8000'
  }

  return ''  // relative URLs for web
}

export const api = axios.create({ baseURL: getBaseURL() })

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('momentum-auth')
    if (raw) {
      const { state } = JSON.parse(raw)
      if (state?.user?.token) {
        config.headers.Authorization = `Bearer ${state.user.token}`
      }
    }
  } catch {}
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('momentum-auth')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const endpoints = {
  register:          '/api/auth/register',
  login:             '/api/auth/login',
  logout:            '/api/auth/logout',
  me:                '/api/auth/me',
  profile:           '/api/auth/profile',
  changePass:        '/api/auth/change-password',
  tasks:             '/api/tasks/',
  taskToday:         '/api/tasks/today',
  taskUpcoming:      '/api/tasks/upcoming',
  taskOverdue:       '/api/tasks/overdue',
  taskStats:         '/api/tasks/stats',
  taskCats:          '/api/tasks/categories/list',
  reminders:         '/api/reminders/',
  pendingRems:       '/api/reminders/pending',
  labels:            '/api/labels/',
  timers:            '/api/timers/',
  timerToday:        '/api/timers/today',
  analyticsSummary:  '/api/analytics/summary',
  completionTrend:   '/api/analytics/completion-trend',
  priorityDist:      '/api/analytics/priority-distribution',
  categoryBreakdown: '/api/analytics/category-breakdown',
  focusTrend:        '/api/analytics/focus-trend',
  weeklyHeatmap:     '/api/analytics/weekly-heatmap',
  timetable:         '/api/timetable/',
}
