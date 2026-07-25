import AuthForm from '@/components/auth/AuthForm'
import Logo from '@/components/ui/Logo'
import Link from 'next/link'

export const metadata = {
  title: 'Sign In — AgentHive',
  description: 'Sign in to your AgentHive account or create a new one.',
}

/**
 * Auth Page — sign-in/sign-up with upgraded branding & dynamic effects.
 */
export default function AuthPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-1 landing-gradient-bg relative overflow-hidden items-center justify-center p-12">
        {/* Ambient dynamic glow */}
        <div className="landing-glow w-[500px] h-[500px] bg-sky-500/20 top-[15%] left-[5%] animate-pulse-glow" />
        <div className="landing-glow w-[400px] h-[400px] bg-teal-500/20 bottom-[10%] right-[15%] animate-pulse-glow" />

        <div className="relative z-10 max-w-md text-center">
          {/* Upgraded Logo Display */}
          <div className="flex justify-center mb-8">
            <Logo size="xl" variant="dark" subtext="ENTERPRISE AI WORKFORCE" />
          </div>

          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            Welcome to AgentHive
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            Your autonomous AI agent workforce is ready. Log in to coordinate intelligent agents handling finance, marketing, lead qualification, customer support, and analytics.
          </p>

          {/* Feature pills with dynamic subtle glow */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8">
            {[
              { label: '💰 Finance & Billing', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
              { label: '📝 Marketing & Content', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
              { label: '📅 Operations & Schedulers', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
              { label: '🛟 24/7 Support Lead', color: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
              { label: '📊 Predictive Analytics', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' },
            ].map((f) => (
              <span
                key={f.label}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm shadow-xs ${f.color}`}
              >
                {f.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC]">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-center mb-10">
          <Logo size="lg" variant="light" subtext="AI WORKFORCE PLATFORM" />
        </div>

        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-900/5">
          <h2 className="text-2xl font-black text-slate-900 mb-2 text-center tracking-tight">
            Get started
          </h2>
          <p className="text-slate-500 text-xs font-medium mb-8 text-center">
            Sign in to your account or create a new business profile
          </p>

          <AuthForm />

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
