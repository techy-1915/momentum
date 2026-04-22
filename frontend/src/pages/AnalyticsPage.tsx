import { useQuery } from '@tanstack/react-query'
import { api, endpoints } from '../lib/api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, CheckSquare, Flame, Timer, Target } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const COLORS = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899']
const PRIORITY_COLORS: Record<string, string> = {
  low: '#6B7280', medium: '#3B82F6', high: '#F59E0B', urgent: '#EF4444',
}

function StatCard({ label, value, icon, sub, color = 'text-primary-400' }: any) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? '#a78bfa' }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get(endpoints.analyticsSummary).then(r => r.data),
  })

  const { data: trend } = useQuery({
    queryKey: ['completion-trend'],
    queryFn: () => api.get(endpoints.completionTrend, { params: { days: 30 } }).then(r => r.data),
  })

  const { data: priorityDist } = useQuery({
    queryKey: ['priority-dist'],
    queryFn: () => api.get(endpoints.priorityDist).then(r => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['category-breakdown'],
    queryFn: () => api.get(endpoints.categoryBreakdown).then(r => r.data),
  })

  const { data: focusTrend } = useQuery({
    queryKey: ['focus-trend'],
    queryFn: () => api.get(endpoints.focusTrend, { params: { days: 14 } }).then(r => r.data),
  })

  const { data: heatmap } = useQuery({
    queryKey: ['weekly-heatmap'],
    queryFn: () => api.get(endpoints.weeklyHeatmap).then(r => r.data),
  })

  const trendFormatted = (trend ?? []).map((d: any) => ({
    ...d,
    label: format(parseISO(d.date), 'MMM d'),
  }))

  const focusFormatted = (focusTrend ?? []).map((d: any) => ({
    ...d,
    label: format(parseISO(d.date), 'MMM d'),
  }))

  // Heatmap processing
  const maxCount = Math.max(...(heatmap ?? []).map((d: any) => d.count), 1)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={summary?.total_tasks ?? 0}
          icon={<CheckSquare className="w-4 h-4" />} />
        <StatCard label="Completion Rate" value={`${summary?.completion_rate ?? 0}%`}
          icon={<Target className="w-4 h-4" />} color="text-emerald-400" />
        <StatCard label="Current Streak" value={`${summary?.streak_days ?? 0} days`}
          icon={<Flame className="w-4 h-4" />} color="text-orange-400"
          sub="consecutive days" />
        <StatCard label="Focus Hours" value={`${summary?.total_focus_hours ?? 0}h`}
          icon={<Timer className="w-4 h-4" />} color="text-purple-400"
          sub="total time tracked" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion trend */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-200 mb-4">Tasks Completed (30 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendFormatted} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 10 }}
                tickLine={false} axisLine={false}
                interval={Math.floor((trendFormatted.length - 1) / 6)} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="completed" fill="#7C3AED" radius={[3, 3, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-200 mb-4">Priority Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={180}>
              <PieChart>
                <Pie data={priorityDist ?? []} dataKey="count" nameKey="priority"
                  cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3}>
                  {(priorityDist ?? []).map((entry: any) => (
                    <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] ?? '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {(priorityDist ?? []).map((d: any) => (
                <div key={d.priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PRIORITY_COLORS[d.priority] }} />
                    <span className="text-xs text-gray-400 capitalize">{d.priority}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-300">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Focus time trend */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-200 mb-4">Focus Time (14 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={focusFormatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 10 }}
                tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} unit="m" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="minutes" stroke="#8B5CF6" strokeWidth={2}
                dot={false} name="Focus min" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-200 mb-4">Category Breakdown</h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {(categories ?? []).map((c: any, i: number) => (
              <div key={c.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{c.category}</span>
                  <span className="text-xs text-gray-500">{c.completed}/{c.total} ({c.rate}%)</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${c.rate}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity heatmap */}
      {heatmap && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-200 mb-4">Activity Heatmap (last 12 weeks)</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {Array.from({ length: 12 }, (_, week) => (
                <div key={week} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }, (_, day) => {
                    const idx = week * 7 + day
                    const d = heatmap[idx]
                    if (!d) return <div key={day} className="w-3 h-3" />
                    const intensity = d.count / maxCount
                    return (
                      <div key={day} title={`${d.date}: ${d.count} tasks`}
                        className="w-3 h-3 rounded-sm transition-colors cursor-default"
                        style={{
                          background: d.count === 0 ? '#1F2937' :
                            `rgba(124, 58, 237, ${0.2 + intensity * 0.8})`
                        }} />
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-xs text-gray-500">Less</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(i => (
                <div key={i} className="w-3 h-3 rounded-sm"
                  style={{ background: `rgba(124, 58, 237, ${i})` }} />
              ))}
              <span className="text-xs text-gray-500">More</span>
            </div>
          </div>
        </div>
      )}

      {/* Key insights */}
      {summary && (
        <div className="bg-gradient-to-br from-primary-600/10 to-purple-600/5 border border-primary-600/20 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-400" /> Key Insights
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-400">
            <p>📊 <strong className="text-gray-200">{summary.completed_this_week}</strong> tasks completed this week</p>
            <p>🔥 <strong className="text-gray-200">{summary.streak_days} day</strong> productivity streak</p>
            <p>⚡ <strong className="text-gray-200">{summary.high_priority_pending}</strong> high-priority tasks pending</p>
            <p>✅ <strong className="text-gray-200">{summary.completion_rate}%</strong> all-time completion rate</p>
            <p>⏱ <strong className="text-gray-200">{summary.total_focus_hours}h</strong> total focus time logged</p>
            <p>📋 <strong className="text-gray-200">{summary.overdue}</strong> overdue tasks need attention</p>
          </div>
        </div>
      )}
    </div>
  )
}
