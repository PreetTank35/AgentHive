import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { ArrowRight, Shield, Zap, Users, MessageSquare, BarChart3, Calendar, Sparkles, Bot, CheckCircle2 } from 'lucide-react'

/**
 * Landing Page — pre-login entry point with dynamic effects & upgraded Logo.
 */
export default function LandingPage() {
  const features = [
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Chat-First Command Center',
      description: 'Talk to your AI workforce naturally — state your intent and the right specialist executes it.',
      color: '#0ea5e9',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Finance & Accounts Specialist',
      description: 'Track expense receipts, generate invoices, and audit variances in real-time.',
      color: '#10b981',
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Operations & Smart Schedulers',
      description: 'Automate team rotas, send customer reminders, and manage calendar appointments.',
      color: '#f59e0b',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Expandable Agent Roster',
      description: 'Deploy specialized AI agents for support, sales, marketing, and legal compliance in 1-click.',
      color: '#8b5cf6',
    },
  ]

  const trustItems = [
    { icon: <Shield className="w-5 h-5 text-emerald-400" />, text: 'Enterprise-grade encryption' },
    { icon: <Zap className="w-5 h-5 text-amber-400" />, text: 'Powered by LangChain & FastAPI' },
    { icon: <Users className="w-5 h-5 text-sky-400" />, text: 'Tailored for small business operations' },
  ]

  return (
    <div className="min-h-screen landing-gradient-bg text-white overflow-hidden relative">
      {/* Dynamic ambient background glow animations */}
      <div className="landing-glow w-[500px] h-[500px] bg-sky-500/20 top-[-100px] left-[-100px] fixed animate-pulse-glow" />
      <div className="landing-glow w-[400px] h-[400px] bg-teal-500/20 bottom-[-50px] right-[-50px] fixed animate-pulse-glow" />
      <div className="landing-glow w-[300px] h-[300px] bg-indigo-500/20 top-[40%] left-[60%] fixed animate-pulse-glow" />

      {/* Nav */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/">
          <Logo size="lg" variant="dark" subtext="AI WORKFORCE" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/80 hover:text-white transition-colors duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/auth"
            className="btn-primary flex items-center gap-2 text-sm font-bold shadow-lg shadow-sky-500/30"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-teal-300 mb-8 backdrop-blur-md animate-fade-in shadow-inner">
          <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
          <span>Next-Gen Autonomous AI Agents for Your Business</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6 animate-fade-in-up">
          Hire an Autonomous <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400">
            AI Agent Workforce
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed font-normal animate-fade-in-up delay-100">
          AgentHive coordinates specialized AI agents that execute real operational tasks — handling customer support, bookkeeping, marketing campaigns, and lead qualification 24/7.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
          <Link
            href="/auth"
            className="btn-primary flex items-center justify-center gap-2 px-8 py-4 text-base font-bold w-full sm:w-auto shadow-xl shadow-sky-500/30"
          >
            Deploy Your AI Team Now
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard"
            className="btn-secondary flex items-center justify-center gap-2 px-8 py-4 text-base font-bold w-full sm:w-auto bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30 backdrop-blur-md shadow-lg"
          >
            <Bot className="w-5 h-5 text-teal-400" />
            Explore Dashboard
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 pt-8 border-t border-white/10 animate-fade-in delay-300">
          {trustItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-semibold text-white/70">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid with Glassmorphism & Micro-animations */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Supercharge Operations with Specialized AI
          </h2>
          <p className="text-white/60 text-sm max-w-lg mx-auto">
            Each agent brings domain expertise, integrated tools, and real-time execution capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="glass-pro-dark rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl shimmer-card group border border-white/10"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: `${feature.color}25`, color: feature.color }}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{feature.title}</h3>
              <p className="text-xs text-white/65 leading-relaxed font-normal">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
