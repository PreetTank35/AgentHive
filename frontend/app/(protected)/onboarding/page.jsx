"use client"
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Briefcase, Target, AlertTriangle, Wrench,
  ChevronRight, ChevronLeft, Check, Sparkles,
  HelpCircle, Building2, MapPin, Users, Hexagon,
} from 'lucide-react'

const STEPS = [
  { id: 'profile', title: 'Business Profile', subtitle: 'Tell us about your business', icon: Briefcase },
  { id: 'goals', title: 'Goals & Expectations', subtitle: 'What do you want to achieve?', icon: Target },
  { id: 'challenges', title: 'Challenges & KPIs', subtitle: 'Where do you need the most help?', icon: AlertTriangle },
  { id: 'tools', title: 'Tools & Constraints', subtitle: 'Your current setup and resources', icon: Wrench },
]

const INDUSTRIES = [
  'Food & Beverage', 'Retail', 'Professional Services', 'Healthcare',
  'Education', 'Real Estate', 'Construction', 'Technology',
  'Beauty & Wellness', 'Fitness', 'Home Services', 'Other',
]

const GOAL_OPTIONS = [
  { id: 'save_time', label: 'Save time on repetitive tasks', icon: '⏱️' },
  { id: 'reduce_costs', label: 'Reduce operational costs', icon: '💰' },
  { id: 'grow_revenue', label: 'Grow revenue', icon: '📈' },
  { id: 'improve_ops', label: 'Improve operations', icon: '⚙️' },
  { id: 'better_marketing', label: 'Better marketing & content', icon: '📣' },
  { id: 'customer_support', label: 'Improve customer support', icon: '🛟' },
]

const CHALLENGE_OPTIONS = [
  { id: 'bookkeeping', label: 'Bookkeeping & finances', icon: '📊' },
  { id: 'marketing', label: 'Marketing & social media', icon: '📱' },
  { id: 'scheduling', label: 'Scheduling & reminders', icon: '📅' },
  { id: 'customer_support', label: 'Customer inquiries', icon: '💬' },
  { id: 'analytics', label: 'Data & analytics', icon: '📈' },
  { id: 'inventory', label: 'Inventory management', icon: '📦' },
]

const TOOL_OPTIONS = [
  { id: 'spreadsheets', label: 'Spreadsheets (Excel/Sheets)' },
  { id: 'quickbooks', label: 'QuickBooks / Accounting software' },
  { id: 'social_media', label: 'Social media tools' },
  { id: 'pos', label: 'POS System' },
  { id: 'crm', label: 'CRM Software' },
  { id: 'none', label: 'No digital tools yet' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    // Step 1 - Profile
    industry: '',
    businessSize: '',
    location: '',
    offerings: '',
    // Step 2 - Goals
    goals: [],
    specificGoals: '',
    // Step 3 - Challenges
    challenges: [],
    kpis: '',
    priorities: '',
    // Step 4 - Tools
    currentTools: [],
    budget: '',
    timeAvailability: '',
    skillLevel: '',
  })

  const updateField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const toggleArrayField = (field, value) => {
    setData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }))
  }

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return data.industry && data.businessSize
      case 1: return data.goals.length > 0
      case 2: return data.challenges.length > 0
      case 3: return data.skillLevel
      default: return true
    }
  }, [step, data])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Store business profile in localStorage for the report page
      localStorage.setItem('agenthive_business_profile', JSON.stringify(data))

      // Try to send onboarding data to backend (non-blocking)
      try {
        await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } catch {
        // Backend may not be running — that's okay
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Onboarding error:', err)
      // Still redirect on error
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const StepIcon = STEPS[step].icon

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25">
            <Hexagon className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Set up your AgentHive</h1>
          <p className="text-slate-500 text-sm mt-1">Help us customize your AI team to fit your business</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex items-center gap-2">
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-500"
                    style={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }}
                  />
                </div>
              </div>
              <div
                className={`onboarding-step-indicator flex-shrink-0 ${
                  i < step
                    ? 'bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/25'
                    : i === step
                    ? 'bg-sky-50 text-sky-600 border-2 border-sky-200'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Step content card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Step header */}
          <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/10 to-teal-500/10 flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">{STEPS[step].title}</h2>
              <p className="text-xs text-slate-500">{STEPS[step].subtitle}</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Why we ask</span>
            </div>
          </div>

          {/* Step body */}
          <div className="px-8 py-6 min-h-[320px]" key={step}>
            <div className="animate-fade-in-up space-y-5">
              {step === 0 && (
                <>
                  <div>
                    <label className="input-label">Industry</label>
                    <select
                      value={data.industry}
                      onChange={(e) => updateField('industry', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select your industry…</option>
                      {INDUSTRIES.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Team Size</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Just me', '2–5', '6–20', '20+'].map(size => (
                        <button
                          key={size}
                          onClick={() => updateField('businessSize', size)}
                          className={`py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                            data.businessSize === size
                              ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Location</label>
                    <input
                      type="text"
                      value={data.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder="City, State or Country"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="input-label">What does your business offer?</label>
                    <textarea
                      value={data.offerings}
                      onChange={(e) => updateField('offerings', e.target.value)}
                      placeholder="Briefly describe your products or services…"
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="input-label">What are your main goals? (select all that apply)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {GOAL_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => toggleArrayField('goals', opt.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                            data.goals.includes(opt.id)
                              ? 'bg-sky-50 border-sky-200 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xl">{opt.icon}</span>
                          <span className={`text-sm font-medium ${
                            data.goals.includes(opt.id) ? 'text-sky-700' : 'text-slate-600'
                          }`}>
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Any specific goals? (optional)</label>
                    <textarea
                      value={data.specificGoals}
                      onChange={(e) => updateField('specificGoals', e.target.value)}
                      placeholder="e.g., Double social media followers in 6 months…"
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="input-label">What are your biggest challenges? (select all that apply)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {CHALLENGE_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => toggleArrayField('challenges', opt.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                            data.challenges.includes(opt.id)
                              ? 'bg-amber-50 border-amber-200 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xl">{opt.icon}</span>
                          <span className={`text-sm font-medium ${
                            data.challenges.includes(opt.id) ? 'text-amber-700' : 'text-slate-600'
                          }`}>
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Key metrics you track (optional)</label>
                    <input
                      type="text"
                      value={data.kpis}
                      onChange={(e) => updateField('kpis', e.target.value)}
                      placeholder="e.g., Monthly revenue, customer count, social followers…"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="input-label">Top priority right now (optional)</label>
                    <input
                      type="text"
                      value={data.priorities}
                      onChange={(e) => updateField('priorities', e.target.value)}
                      placeholder="e.g., Getting more customers through the door…"
                      className="input-field"
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <label className="input-label">Tools you currently use (select all that apply)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {TOOL_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => toggleArrayField('currentTools', opt.id)}
                          className={`p-4 rounded-xl border text-left text-sm font-medium transition-all duration-200 ${
                            data.currentTools.includes(opt.id)
                              ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Monthly budget for tools</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['$0', '$1–50', '$50–200', '$200+'].map(b => (
                        <button
                          key={b}
                          onClick={() => updateField('budget', b)}
                          className={`py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                            data.budget === b
                              ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Your tech comfort level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                        <button
                          key={level}
                          onClick={() => updateField('skillLevel', level)}
                          className={`py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                            data.skillLevel === level
                              ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer nav */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn-ghost flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Setting up…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
