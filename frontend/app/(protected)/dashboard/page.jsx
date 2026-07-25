"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot, CheckCircle2, DollarSign, Zap, TrendingUp, ArrowUpRight,
  Plus, FileSpreadsheet, Activity, RefreshCw, MessageSquare, Calendar,
  ClipboardList, HelpCircle, Loader2
} from 'lucide-react'
import TopNav from '@/components/ui/TopNav'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { fetchStats, fetchActivity, fetchAgentStatuses } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { AGENT_TEAM } from '@/lib/mockData'
import ChatWidget from '@/components/ChatWidget'
import WhatsAppConnect from '@/components/WhatsAppConnect'

export default function DashboardPage() {
  const router = useRouter()
  const { addToast } = useToast()

  // Live data state
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [agents, setAgents] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [statsError, setStatsError] = useState(null)

  // UI state
  const [filterType, setFilterType] = useState('all')
  const [isHireModalOpen, setIsHireModalOpen] = useState(false)
  const [selectedAgentForHire, setSelectedAgentForHire] = useState(AGENT_TEAM[0])
  const [isHiringLoading, setIsHiringLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const user = getUser()

  // Load live data
  const loadData = async (showRefreshToast = false) => {
    if (showRefreshToast) setRefreshing(true)

    // Fetch stats
    try {
      const data = await fetchStats()
      setStats(data)
      setStatsError(null)
    } catch (err) {
      setStatsError(err.message)
    } finally {
      setStatsLoading(false)
    }

    // Fetch activity
    try {
      const data = await fetchActivity(10)
      setActivities(data)
    } catch (err) {
      console.warn('Failed to load activity feed:', err)
    } finally {
      setActivityLoading(false)
    }

    // Fetch agent statuses
    try {
      const liveStatuses = await fetchAgentStatuses()
      const merged = AGENT_TEAM.map((agent) => {
        const live = liveStatuses.find((l) => l.agent_id === agent.id)
        return {
          ...agent,
          status: live ? live.status : agent.status,
          currentTask: live ? live.current_task : null,
          tasksHandled: live ? live.tasks_handled : agent.tasksHandled,
        }
      })
      setAgents(merged)
    } catch (err) {
      setAgents(AGENT_TEAM)
    }

    if (showRefreshToast) {
      setRefreshing(false)
      addToast('Dashboard data updated from backend', 'info')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const statCards = stats
    ? [
        {
          id: 'active-agents',
          title: 'Active AI Agents',
          value: `${stats.active_agents} / ${stats.total_agents}`,
          change: 'Live Sync',
          isPositive: true,
          icon: Bot,
          color: 'from-blue-600 to-teal-500',
          subtitle: 'Capacity Operational',
        },
        {
          id: 'tasks-completed',
          title: 'Tasks Automated',
          value: stats.tasks_automated?.toLocaleString() || '14,790',
          change: '+18.4%',
          isPositive: true,
          icon: CheckCircle2,
          color: 'from-teal-500 to-emerald-500',
          subtitle: 'Hours Saved Today',
        },
        {
          id: 'cost-savings',
          title: 'Est. Cost Savings',
          value: `$${stats.cost_savings_usd?.toLocaleString() || '12,450'}`,
          change: '8.4x ROI',
          isPositive: true,
          icon: DollarSign,
          color: 'from-indigo-600 to-blue-500',
          subtitle: 'Platform Yield',
        },
        {
          id: 'avg-response',
          title: 'Avg. Response Time',
          value: `${stats.avg_response_time_sec || 14.2}s`,
          change: '99.8% Uptime',
          isPositive: true,
          icon: Zap,
          color: 'from-amber-500 to-orange-500',
          subtitle: 'By Support Agent',
        },
      ]
    : []

  const onlineAgentCount = agents.filter(a => a.status === 'online').length

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TopNav onOpenHireModal={() => setIsHireModalOpen(true)} />

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-xs font-bold text-blue-700 mb-2">
              <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
              AI Automation Engine Active
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {user?.business_name ? `${user.business_name} — Command Center` : 'Business Command Center'}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {onlineAgentCount > 0
                ? `Your ${onlineAgentCount} active AI agents are currently executing workflows and handling operations.`
                : 'Manage your autonomous AI workforce.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              {refreshing ? 'Syncing…' : 'Refresh Data'}
            </Button>

            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setIsHireModalOpen(true)}
            >
              Hire Agent
            </Button>
          </div>
        </div>

        {/* Key Metrics / Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="skeleton w-10 h-10 rounded-xl" />
                  <div className="skeleton w-24 h-6 rounded-lg" />
                  <div className="skeleton w-32 h-4 rounded-lg" />
                </div>
              ))
            : statCards.map((stat) => (
                <div
                  key={stat.id}
                  className="relative p-6 bg-white rounded-3xl border border-slate-100/90 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 shimmer-card overflow-hidden group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">{stat.title}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-2">{stat.subtitle}</p>
                </div>
              ))}
        </div>

        {/* WhatsApp Channel Integration Banner */}
        <WhatsAppConnect />

        {/* Agent Roster Grid */}
        <Card>
          <CardHeader>
            <CardTitle subtitle="Real-time operational status of your deployed AI agents">
              Active AI Specialist Team
            </CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/dashboard/agents')}
            >
              View Full Team
            </Button>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.slice(0, 6).map((agent) => (
                <div
                  key={agent.id}
                  className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-xs"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{agent.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">{agent.department}</p>
                      </div>
                    </div>

                    <div className="relative flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        agent.status === 'online' ? 'bg-emerald-500 live-radar-ring' : 'bg-amber-500'
                      }`} />
                      <span className="text-[11px] font-bold capitalize text-slate-600">{agent.status}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{agent.tasksHandled} tasks handled</span>
                    <button
                      onClick={() => setShowChat(true)}
                      className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Chat →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Floating Chat Widget */}
      <ChatWidget isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  )
}
