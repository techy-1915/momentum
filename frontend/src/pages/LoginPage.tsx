import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { api, endpoints } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')

  const login = useMutation({
    mutationFn: () => api.post(endpoints.login, { email, password }),
    onSuccess: (res) => { setUser(res.data); navigate('/dashboard') },
    onError: (e: any) => setErr(e.response?.data?.detail ?? 'Invalid credentials'),
  })

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-100">Momentum</h1>
          <p className="text-gray-400 mt-1">Your Personal Productivity OS</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-100 mb-6">Sign in</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login.mutate()}
                placeholder="you@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && login.mutate()}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition"
                />
                <button onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}

            <button
              onClick={() => login.mutate()}
              disabled={!email || !password || login.isPending}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-xl transition mt-2">
              {login.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center mb-3">Demo credentials</p>
            <button
              onClick={() => { setEmail('demo@momentum.app'); setPassword('demo123') }}
              className="w-full py-2 border border-gray-700 rounded-xl text-gray-400 text-sm hover:bg-gray-800 hover:text-gray-200 transition">
              Use demo account
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition">Create one</Link>
        </p>
      </div>
    </div>
  )
}
