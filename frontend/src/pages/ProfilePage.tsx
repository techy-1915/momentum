import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, endpoints } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useAppStore } from '../store/app'
import { User, Palette, Bell, Shield, Download, Trash2, Save } from 'lucide-react'
import { getInitials } from '../lib/utils'

const AVATAR_COLORS = [
  '#7C3AED','#3B82F6','#10B981','#EF4444','#F59E0B',
  '#EC4899','#8B5CF6','#06B6D4','#84CC16','#F97316',
]

const TIMEZONES = [
  'Asia/Kolkata','Asia/Colombo','Asia/Dubai','Asia/Singapore',
  'Asia/Tokyo','Europe/London','Europe/Paris','America/New_York',
  'America/Chicago','America/Los_Angeles','UTC',
]

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const { addToast } = useAppStore()

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    timezone: user?.timezone ?? 'Asia/Kolkata',
    theme: user?.theme ?? 'dark',
    avatar_color: user?.avatar_color ?? '#7C3AED',
  })
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [section, setSection] = useState<'profile' | 'security' | 'notifications' | 'data'>('profile')

  const pf = (k: string, v: string) => setProfile(p => ({ ...p, [k]: v }))
  const pwf = (k: string, v: string) => setPasswords(p => ({ ...p, [k]: v }))

  const updateProfile = useMutation({
    mutationFn: () => api.put(endpoints.profile, profile),
    onSuccess: (res) => {
      setUser(res.data)
      addToast('Profile updated!', 'success')
    },
    onError: () => addToast('Failed to update profile', 'error'),
  })

  const changePassword = useMutation({
    mutationFn: () => {
      if (passwords.next !== passwords.confirm) throw new Error('Passwords do not match')
      if (passwords.next.length < 6) throw new Error('Password too short')
      return api.post(endpoints.changePass, { current_password: passwords.current, new_password: passwords.next })
    },
    onSuccess: (res) => {
      if (user && res.data.token) setUser({ ...user, token: res.data.token })
      setPasswords({ current: '', next: '', confirm: '' })
      addToast('Password changed successfully', 'success')
    },
    onError: (e: any) => addToast(e.message ?? e.response?.data?.detail ?? 'Failed', 'error'),
  })

  const exportData = async () => {
    try {
      const [tasksRes, remRes, labelsRes] = await Promise.all([
        api.get(endpoints.tasks),
        api.get(endpoints.reminders),
        api.get(endpoints.labels),
      ])
      const data = {
        exported_at: new Date().toISOString(),
        user: { name: user?.name, email: user?.email },
        tasks: tasksRes.data,
        reminders: remRes.data,
        labels: labelsRes.data,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `momentum-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast('Data exported!', 'success')
    } catch {
      addToast('Export failed', 'error')
    }
  }

  const SECTIONS = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'data', label: 'Data', icon: Download },
  ] as const

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Profile & Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-44 shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setSection(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  section === key
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {section === 'profile' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <h2 className="font-semibold text-gray-200">Profile</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                  style={{ background: profile.avatar_color }}>
                  {getInitials(profile.name || user?.name || '')}
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Avatar color</p>
                  <div className="flex gap-2 flex-wrap">
                    {AVATAR_COLORS.map(c => (
                      <button key={c} onClick={() => pf('avatar_color', c)}
                        className={`w-6 h-6 rounded-full transition-all ${profile.avatar_color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-110' : ''}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 block mb-1.5">Display Name</label>
                <input value={profile.name} onChange={e => pf('name', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 focus:outline-none focus:border-primary-500 transition" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 block mb-1.5">Email</label>
                <input value={user?.email ?? ''} disabled
                  className="w-full bg-gray-800/50 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-500 cursor-not-allowed" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 block mb-1.5">Timezone</label>
                <select value={profile.timezone} onChange={e => pf('timezone', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-300 focus:outline-none focus:border-primary-500">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 block mb-2">Theme</label>
                <div className="flex gap-2">
                  {[
                    { key: 'dark', label: '🌙 Dark' },
                    { key: 'light', label: '☀️ Light' },
                  ].map(t => (
                    <button key={t.key} onClick={() => pf('theme', t.key)}
                      className={`flex-1 py-2 rounded-xl border text-sm transition ${
                        profile.theme === t.key
                          ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
                <Save className="w-4 h-4" />
                {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {section === 'security' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-gray-200">Change Password</h2>
              <div>
                <label className="text-sm font-medium text-gray-400 block mb-1.5">Current Password</label>
                <input type="password" value={passwords.current} onChange={e => pwf('current', e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 block mb-1.5">New Password</label>
                <input type="password" value={passwords.next} onChange={e => pwf('next', e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 block mb-1.5">Confirm New Password</label>
                <input type="password" value={passwords.confirm} onChange={e => pwf('confirm', e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition" />
              </div>
              <button onClick={() => changePassword.mutate()}
                disabled={!passwords.current || !passwords.next || changePassword.isPending}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
                <Shield className="w-4 h-4" />
                {changePassword.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}

          {section === 'notifications' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-gray-200">Notifications</h2>
              <p className="text-sm text-gray-400">
                Momentum uses browser notifications for reminders. Click below to enable them.
              </p>
              <button onClick={async () => {
                const perm = await Notification.requestPermission()
                addToast(perm === 'granted' ? 'Notifications enabled!' : 'Permission denied', perm === 'granted' ? 'success' : 'error')
              }}
                className="flex items-center gap-2 border border-gray-700 hover:border-primary-500 text-gray-300 hover:text-primary-400 text-sm font-medium px-4 py-2.5 rounded-xl transition">
                <Bell className="w-4 h-4" />
                Request notification permission
              </button>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>• Reminders are polled every 60 seconds automatically</p>
                <p>• Browser notifications appear even when app is in background</p>
                <p>• Snoozed reminders will re-fire after the snooze period</p>
              </div>
            </div>
          )}

          {section === 'data' && (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="font-semibold text-gray-200 mb-2">Export Data</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Download all your tasks, reminders, and labels as a JSON file.
                </p>
                <button onClick={exportData}
                  className="flex items-center gap-2 border border-gray-700 hover:border-emerald-500 text-gray-300 hover:text-emerald-400 text-sm font-medium px-4 py-2.5 rounded-xl transition">
                  <Download className="w-4 h-4" />
                  Export as JSON
                </button>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="font-semibold text-gray-200 mb-2">Calendar Integration</h2>
                <p className="text-sm text-gray-400 mb-3">
                  Momentum supports ICS (iCalendar) format — compatible with Google Calendar, Apple Calendar, and Outlook.
                </p>
                <div className="space-y-2 text-xs text-gray-500 bg-gray-800/50 rounded-xl p-3">
                  <p className="font-medium text-gray-400">To sync with Google Calendar:</p>
                  <p>1. Export your data as JSON (above)</p>
                  <p>2. Convert to .ics using a tool like <code className="text-primary-400">ical.js</code></p>
                  <p>3. Import the .ics file into Google Calendar → Settings → Import & Export</p>
                  <p>4. For live sync, set up the Google Calendar API with OAuth2</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
