"use client"
import { useEffect, useState } from 'react'
import { fetchActivity } from '@/lib/api'
import { Activity, RefreshCw, Filter } from 'lucide-react'

const AGENT_FILTERS = [
  { key: 'all', label: 'All', color: '#6366f1' },
  { key: 'finance', label: 'Finance', color: '#10B981' },
  { key: 'content', label: 'Content', color: '#8B5CF6' },
  { key: 'scheduler', label: 'Scheduler', color: '#F59E0B' },
  { key: 'support', label: 'Support', color: '#EF4444' },
]

const typeColors = {
  expense: 'bg-emerald-50 border-emerald-100',
  draft: 'bg-violet-50 border-violet-100',
  reminder: 'bg-amber-50 border-amber-100',
  support: 'bg-red-50 border-red-100',
}

/**
 * Activity page — full-page activity feed accessible from sidebar.
 */
export default function ActivityPage() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchActivity(50)
      setActivities(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  const filtered = filter === 'all'
    ? activities
    : activities.filter(a => a.agent?.toLowerCase().includes(filter))

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/10 to-teal-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Activity Feed</h1>
            <p className="text-sm text-slate-500">Recent actions across all agents</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-slate-400" />
        {AGENT_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              filter === f.key
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {error && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-sm text-red-500 mb-2">⚠️ {error}</p>
          <button onClick={load} className="text-xs text-sky-500 hover:underline">Retry</button>
        </div>
      )}

      {!error && !loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-slate-500 font-medium">No activity yet</p>
          <p className="text-xs text-slate-400 mt-1">Start chatting with your agents to see actions here</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-100">
              <div className="flex items-start gap-3">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton w-3/4 h-4" />
                  <div className="skeleton w-1/3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl px-4 py-3.5 border transition-all duration-200 hover:shadow-sm animate-fade-in ${
              typeColors[item.type] || 'bg-white border-slate-100'
            }`}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5 flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-snug">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">{item.agent}</span>
                  <span className="text-slate-200">•</span>
                  <span className="text-[11px] text-slate-400">{formatTime(item.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
