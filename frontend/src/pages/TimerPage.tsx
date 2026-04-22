import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, endpoints } from '../lib/api'
import { useAppStore } from '../store/app'
import { Play, Pause, Square, RotateCcw, Timer, Coffee, Zap } from 'lucide-react'
import { formatSeconds, formatFocusTime } from '../lib/utils'
import { playAlertSound } from '../lib/notifications'
import type { Task, TimerSession } from '../types'

type Mode = 'pomodoro' | 'short_break' | 'long_break' | 'stopwatch' | 'countdown'

const MODE_DURATIONS: Record<Mode, number> = {
  pomodoro: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  stopwatch: 0,
  countdown: 0,
}

const MODE_LABELS: Record<Mode, string> = {
  pomodoro: 'Pomodoro',
  short_break: 'Short Break',
  long_break: 'Long Break',
  stopwatch: 'Stopwatch',
  countdown: 'Countdown',
}

const MODE_COLORS: Record<Mode, string> = {
  pomodoro: '#7C3AED',
  short_break: '#10B981',
  long_break: '#3B82F6',
  stopwatch: '#F59E0B',
  countdown: '#EC4899',
}

export default function TimerPage() {
  const qc = useQueryClient()
  const { addToast } = useAppStore()

  const [mode, setMode] = useState<Mode>('pomodoro')
  const [seconds, setSeconds] = useState(MODE_DURATIONS.pomodoro)
  const [running, setRunning] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [countdownInput, setCountdownInput] = useState(25)
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ['tasks', 'todo'],
    queryFn: () => api.get(endpoints.tasks, { params: { status: 'todo', sort_by: 'smart' } }).then(r => r.data),
  })

  const { data: todaySessions } = useQuery({
    queryKey: ['timer-today'],
    queryFn: () => api.get(endpoints.timerToday).then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: history } = useQuery<TimerSession[]>({
    queryKey: ['timer-history'],
    queryFn: () => api.get(endpoints.timers, { params: { limit: 10 } }).then(r => r.data),
  })

  const saveSession = useMutation({
    mutationFn: (data: object) => api.post(endpoints.timers, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timer-today'] })
      qc.invalidateQueries({ queryKey: ['timer-history'] })
    },
  })

  const isCountdown = mode === 'pomodoro' || mode === 'short_break' || mode === 'long_break' || mode === 'countdown'

  const tick = useCallback(() => {
    if (isCountdown) {
      setSeconds(s => {
        if (s <= 1) {
          setRunning(false)
          playAlertSound()
          addToast(mode === 'pomodoro' ? '🎉 Pomodoro complete! Time for a break.' : '⏰ Break over! Back to work.', 'success')
          if (mode === 'pomodoro') setPomodoroCount(c => c + 1)
          return 0
        }
        return s - 1
      })
    } else {
      setElapsed(e => e + 1)
    }
  }, [isCountdown, mode, addToast])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, tick])

  const switchMode = (m: Mode) => {
    setRunning(false)
    setMode(m)
    setElapsed(0)
    setSeconds(m === 'countdown' ? countdownInput * 60 : MODE_DURATIONS[m])
  }

  const handleStart = () => {
    if (!startTime) setStartTime(new Date())
    setRunning(true)
  }

  const handlePause = () => setRunning(false)

  const handleStop = () => {
    setRunning(false)
    const dur = isCountdown
      ? (MODE_DURATIONS[mode] || countdownInput * 60) - seconds
      : elapsed
    if (dur > 10) {
      saveSession.mutate({
        task_id: selectedTaskId || undefined,
        timer_type: mode === 'pomodoro' || mode === 'short_break' || mode === 'long_break' ? 'pomodoro' :
                    mode === 'stopwatch' ? 'stopwatch' : 'countdown',
        target_seconds: isCountdown ? (MODE_DURATIONS[mode] || countdownInput * 60) : undefined,
        actual_seconds: dur,
        status: seconds === 0 ? 'completed' : 'cancelled',
        started_at: startTime?.toISOString(),
      })
    }
    setStartTime(null)
    setElapsed(0)
    setSeconds(mode === 'countdown' ? countdownInput * 60 : MODE_DURATIONS[mode])
  }

  const handleReset = () => {
    setRunning(false)
    setElapsed(0)
    setSeconds(mode === 'countdown' ? countdownInput * 60 : MODE_DURATIONS[mode])
    setStartTime(null)
  }

  const displaySeconds = isCountdown ? seconds : elapsed
  const total = isCountdown ? (MODE_DURATIONS[mode] || countdownInput * 60) : null
  const progress = total ? ((total - seconds) / total) : null
  const circumference = 2 * Math.PI * 90

  const color = MODE_COLORS[mode]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Focus Timer</h1>

      {/* Mode selector */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {(['pomodoro', 'short_break', 'long_break', 'stopwatch', 'countdown'] as Mode[]).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              mode === m ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={mode === m ? { background: MODE_COLORS[m] } : {}}>
            {m === 'pomodoro' ? '🍅' : m === 'short_break' ? '☕' : m === 'long_break' ? '🌿' : m === 'stopwatch' ? '⏱' : '⏳'} {MODE_LABELS[m].split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Countdown input (for countdown mode) */}
      {mode === 'countdown' && !running && (
        <div className="flex items-center gap-3 justify-center">
          <label className="text-sm text-gray-400">Duration (minutes):</label>
          <input type="number" min={1} max={120} value={countdownInput}
            onChange={e => { const v = parseInt(e.target.value); setCountdownInput(v); setSeconds(v * 60) }}
            className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 text-center focus:outline-none focus:border-primary-500" />
        </div>
      )}

      {/* Timer circle */}
      <div className="flex flex-col items-center">
        <div className="relative w-56 h-56">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#1F2937" strokeWidth="8" />
            {progress !== null && (
              <circle cx="100" cy="100" r="90" fill="none"
                stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold text-gray-100 tabular-nums">
              {formatSeconds(displaySeconds)}
            </span>
            <span className="text-sm text-gray-500 mt-1">{MODE_LABELS[mode]}</span>
            {running && <span className="w-2 h-2 rounded-full mt-2 animate-pulse" style={{ background: color }} />}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-6">
          <button onClick={handleReset} title="Reset"
            className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition">
            <RotateCcw className="w-4 h-4" />
          </button>

          {running ? (
            <button onClick={handlePause}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
              style={{ background: color }}>
              <Pause className="w-6 h-6" />
            </button>
          ) : (
            <button onClick={handleStart}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
              style={{ background: color }}>
              <Play className="w-6 h-6 ml-1" />
            </button>
          )}

          <button onClick={handleStop} title="Stop & save"
            className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-500 hover:text-red-400 hover:border-red-500/40 transition">
            <Square className="w-4 h-4" />
          </button>
        </div>

        {/* Pomodoro count */}
        {pomodoroCount > 0 && (
          <div className="flex gap-1 mt-4">
            {[...Array(Math.min(pomodoroCount, 8))].map((_, i) => (
              <span key={i} className="text-lg">🍅</span>
            ))}
            {pomodoroCount > 8 && <span className="text-sm text-gray-500">+{pomodoroCount - 8}</span>}
          </div>
        )}
      </div>

      {/* Task link */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <label className="text-sm font-medium text-gray-400 mb-2 block">Link to task (optional)</label>
        <select value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500">
          <option value="">— No task —</option>
          {(tasks ?? []).map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {/* Today's stats */}
      {todaySessions && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-100">{todaySessions.total_focus_minutes}</p>
            <p className="text-xs text-gray-500 mt-0.5">Focus minutes</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-100">{todaySessions.pomodoros_completed}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pomodoros</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-100">{todaySessions.sessions?.length ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Sessions</p>
          </div>
        </div>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-200 mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {history.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{s.timer_type === 'pomodoro' ? '🍅' : s.timer_type === 'stopwatch' ? '⏱' : '⏳'}</span>
                  <div>
                    <p className="text-sm text-gray-300">{s.task_title ?? 'Free focus'}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(s.started_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-gray-300">{formatFocusTime(s.actual_seconds)}</p>
                  <span className={`text-xs ${s.status === 'completed' ? 'text-emerald-400' : 'text-gray-600'}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
