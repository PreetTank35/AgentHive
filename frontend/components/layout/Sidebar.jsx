"use client"
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { logout as authLogout } from '@/lib/auth'
import {
  Hexagon,
  LayoutDashboard,
  Activity,
  Bot,
  Store,
  Settings,
  User,
  Component,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react'

import Logo from '@/components/ui/Logo'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { href: '/dashboard/agents', icon: Bot, label: 'Agent Team', badge: '6 Active' },
  { href: '/dashboard/marketplace', icon: Store, label: 'Marketplace', badge: 'New' },
  { href: '/dashboard/activity', icon: Activity, label: 'Activity Feed', badge: 'Live' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', badge: null },
  { href: '/dashboard/profile', icon: User, label: 'Profile', badge: null },
]

export default function Sidebar({ user }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const businessName = user?.user_metadata?.business_name || 'My Business'
  const initials = businessName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="h-screen flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 z-40 relative border-r border-slate-800/80"
      style={{
        width: collapsed ? '76px' : '265px',
        background: 'linear-gradient(180deg, #0F172A 0%, #090D16 100%)',
      }}
    >
      {/* Header with Upgraded Dynamic Logo */}
      <div
        onClick={() => router.push('/dashboard')}
        className="flex items-center px-4 h-16 flex-shrink-0 border-b border-slate-800/90 cursor-pointer overflow-hidden"
      >
        <Logo size="md" showText={!collapsed} variant="dark" subtext={businessName} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`sidebar-item w-full relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {item.badge && !collapsed && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-teal-500/20 text-teal-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Upgrade Callout (if not collapsed) */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 mb-2 rounded-2xl bg-gradient-to-br from-blue-900/60 to-slate-800/80 border border-blue-500/30 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold">Pro Workspace</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">6 of 8 AI Agent slots used. Unlimited tasks active.</p>
        </div>
      )}

      {/* Bottom section */}
      <div className="px-3 py-3 space-y-1 border-t border-slate-800">
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="w-4.5 h-4.5 flex-shrink-0" />
          ) : (
            <ChevronLeft className="w-4.5 h-4.5 flex-shrink-0" />
          )}
          {!collapsed && <span className="truncate">Collapse Sidebar</span>}
        </button>

        {/* Logout Button */}
        <button
          onClick={() => { authLogout(); router.push('/auth') }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-all cursor-pointer"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          {!collapsed && <span className="truncate">Sign Out</span>}
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1 rounded-xl bg-slate-800/40">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 shadow-sm">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in flex-1">
              <p className="text-xs font-bold text-white truncate">{businessName}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'owner@agenthive.com'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
