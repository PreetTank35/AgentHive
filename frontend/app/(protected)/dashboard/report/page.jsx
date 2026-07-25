"use client"
import { useState, useEffect } from 'react'
import {
  FileText, Building2, Target, AlertTriangle, Lightbulb,
  ChevronDown, ChevronUp, RefreshCw, Sparkles,
} from 'lucide-react'

/**
 * Report page — displays the business profile from onboarding + AI-generated insights.
 */
export default function ReportPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState(new Set(['summary', 'recommendations']))

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const raw = localStorage.getItem('agenthive_business_profile')
      if (raw) {
        setProfile(JSON.parse(raw))
      }
    } catch {}
    setLoading(false)
  }

  const toggleSection = (id) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <div className="skeleton w-full h-8 rounded-lg" />
        <div className="skeleton w-3/4 h-6 rounded-lg" />
        <div className="skeleton w-full h-48 rounded-2xl" />
        <div className="skeleton w-full h-32 rounded-2xl" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Report Available</h2>
        <p className="text-slate-500 text-sm">
          Complete the onboarding questionnaire to generate your business report.
        </p>
      </div>
    )
  }

  const goalLabels = {
    save_time: 'Save time on repetitive tasks',
    reduce_costs: 'Reduce operational costs',
    grow_revenue: 'Grow revenue',
    improve_ops: 'Improve operations',
    better_marketing: 'Better marketing & content',
    customer_support: 'Improve customer support',
  }

  const challengeLabels = {
    bookkeeping: 'Bookkeeping & finances',
    marketing: 'Marketing & social media',
    scheduling: 'Scheduling & reminders',
    customer_support: 'Customer inquiries',
    analytics: 'Data & analytics',
    inventory: 'Inventory management',
  }

  const sections = [
    {
      id: 'summary',
      title: 'Business Summary',
      icon: Building2,
      color: '#0ea5e9',
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-400 mb-1">Industry</p>
            <p className="text-sm font-semibold text-slate-800">{profile.industry || 'Not specified'}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-400 mb-1">Team Size</p>
            <p className="text-sm font-semibold text-slate-800">{profile.businessSize || 'Not specified'}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-400 mb-1">Location</p>
            <p className="text-sm font-semibold text-slate-800">{profile.location || 'Not specified'}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-400 mb-1">Tech Level</p>
            <p className="text-sm font-semibold text-slate-800">{profile.skillLevel || 'Not specified'}</p>
          </div>
          {profile.offerings && (
            <div className="col-span-2 p-4 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-400 mb-1">Products/Services</p>
              <p className="text-sm text-slate-700">{profile.offerings}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'goals',
      title: 'Goals & Objectives',
      icon: Target,
      color: '#10b981',
      content: (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(profile.goals || []).map(g => (
              <span key={g} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                {goalLabels[g] || g}
              </span>
            ))}
          </div>
          {profile.specificGoals && (
            <div className="p-4 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-400 mb-1">Specific Goals</p>
              <p className="text-sm text-slate-700">{profile.specificGoals}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'challenges',
      title: 'Challenges & Priorities',
      icon: AlertTriangle,
      color: '#f59e0b',
      content: (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(profile.challenges || []).map(c => (
              <span key={c} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                {challengeLabels[c] || c}
              </span>
            ))}
          </div>
          {profile.priorities && (
            <div className="p-4 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-400 mb-1">Top Priority</p>
              <p className="text-sm text-slate-700">{profile.priorities}</p>
            </div>
          )}
          {profile.kpis && (
            <div className="p-4 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-400 mb-1">Key Metrics</p>
              <p className="text-sm text-slate-700">{profile.kpis}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'recommendations',
      title: 'Recommended Agent Setup',
      icon: Lightbulb,
      color: '#8b5cf6',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            Based on your profile, here are the agents we recommend enabling:
          </p>
          <div className="space-y-2">
            {[
              { name: 'Manager Agent', rec: 'Always active — routes all your requests', icon: '🐝', alwaysOn: true },
              ...(profile.challenges?.includes('bookkeeping') ? [{ name: 'Finance Agent', rec: 'Track expenses and manage invoices', icon: '💰' }] : []),
              ...(profile.challenges?.includes('marketing') ? [{ name: 'Content Agent', rec: 'Create social posts and marketing materials', icon: '📝' }] : []),
              ...(profile.challenges?.includes('scheduling') ? [{ name: 'Scheduler Agent', rec: 'Never miss a deadline or appointment', icon: '📅' }] : []),
              ...(profile.challenges?.includes('customer_support') ? [{ name: 'Support Agent', rec: 'Auto-answer common customer questions', icon: '🛟' }] : []),
              ...(profile.challenges?.includes('analytics') ? [{ name: 'Analytics Agent', rec: 'Get insights from your business data', icon: '📊' }] : []),
            ].map(agent => (
              <div key={agent.name} className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                <span className="text-xl">{agent.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{agent.name}</p>
                  <p className="text-xs text-slate-500">{agent.rec}</p>
                </div>
                {agent.alwaysOn && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold">Default</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/10 to-teal-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Business Report</h1>
            <p className="text-sm text-slate-500">Your onboarding profile and recommendations</p>
          </div>
        </div>
      </div>

      {/* Report sections */}
      <div className="space-y-3">
        {sections.map((section, i) => {
          const isExpanded = expandedSections.has(section.id)
          const Icon = section.icon

          return (
            <div
              key={section.id}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${section.color}15`, color: section.color }}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-sm font-semibold text-slate-800 flex-1 text-left">
                  {section.title}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {isExpanded && (
                <div className="px-6 pb-5 animate-fade-in-down">
                  {section.content}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
