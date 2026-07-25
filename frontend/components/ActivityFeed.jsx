"use client"
import { useEffect, useState } from 'react'
import { fetchActivity } from '@/lib/api'
import { Activity, RefreshCw } from 'lucide-react'

/**
 * ActivityFeed — shows recent actions across all agents.
 *
 * Pulls from /api/activity and displays a chronological list
 * of expenses logged, drafts created, reminders set, etc.
 *
 * @param {Object} props
 * @param {number} props.refreshKey - Change this value to trigger a re-fetch.
 */
export default function ActivityFeed({ refreshKey }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchActivity(25)
      setActivities(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [refreshKey])

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
    } catch {
      return ''
    }
  }

  const typeColors = {
    expense: 'bg-emerald-50 border-emerald-100',
    draft: 'bg-violet-50 border-violet-100',
    reminder: 'bg-amber-50 border-amber-100',
    support: 'bg-red-50 border-red-100',
  }

  return (
    <div className="glass-card-solid rounded-2xl flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4.5 h-4.5 text-primary-500" />
          <h2 className="font-semibold text-slate-800 text-sm">Activity Feed</h2>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Feed items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-red-500">⚠️ {error}</p>
            <button onClick={load} className="text-xs text-primary-500 mt-2 hover:underline">
              Retry
            </button>
          </div>
        )}

        {!error && !loading && activities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm text-slate-400">No activity yet</p>
            <p className="text-xs text-slate-300 mt-1">Start chatting to see actions here</p>
          </div>
        )}

        {activities.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl px-3.5 py-3 border transition-all duration-200 hover:shadow-sm animate-slide-up ${
              typeColors[item.type] || 'bg-slate-50 border-slate-100'
            }`}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-lg mt-0.5 flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-snug">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] font-medium text-slate-400">{item.agent}</span>
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
