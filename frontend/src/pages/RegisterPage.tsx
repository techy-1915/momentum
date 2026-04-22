import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Zap } from 'lucide-react'
import { api, endpoints } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', timezone: 'Asia/Kolkata' })
  const [err, setErr] = useState('')
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const register = useMutation({
    mutationFn: () => {
      if (form.password !== form.confirm) throw new Error('Passwords do not match')
      if (form.password.length < 6) throw new Error('Password must be at least 6 characters')
      return api.post(endpoints.register, { name: form.name, email: form.email, password: form.password, timezone: form.timezone })
    },
    onSuccess: (res) => { setUser(res.data); navigate('/dashboard') },
    onError: (e: any) => setErr(e.message ?? e.response?.data?.detail ?? 'Registration failed'),
  })

  const TIMEZONES = ['Asia/Kolkata', 'Asia/Colombo', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC']

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-100">Momentum</h1>
          <p className="text-gray-400 mt-1">Create your account</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400 block mb-1.5">Full Name</label>
            <input value={form.name} onChange={e => f('name', e.target.value)}
              placeholder="Alex Johnson"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 block mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => f('email', e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 block mb-1.5">Timezone</label>
            <select value={form.timezone} onChange={e => f('timezone', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 focus:outline-none focus:border-primary-500 transition">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={e => f('password', e.target.value)}
                placeholder="Min. 6 chars"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-1.5">Confirm</label>
              <input type="password" value={form.confirm} onChange={e => f('confirm', e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition" />
            </div>
          </div>

          {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}

          <button
            onClick={() => register.mutate()}
            disabled={!form.name || !form.email || !form.password || register.isPending}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-xl transition">
            {register.isPending ? 'Creating account...' : 'Create account'}
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
