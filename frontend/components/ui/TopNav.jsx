"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Bell, Plus, Sun, Moon, User, Settings, LogOut, Bot, ChevronDown, MessageSquare
} from 'lucide-react'
import { NOTIFICATIONS } from '@/lib/mockData'
import { getUser, logout as authLogout } from '@/lib/auth'
import Logo from './Logo'
import Button from './Button'
import Badge from './Badge'

export default function TopNav({ user: userProp, onOpenHireModal }) {
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Use prop or read from auth storage
  const storedUser = getUser()
  const businessName = userProp?.user_metadata?.business_name || storedUser?.business_name || 'Business Owner'
  const email = userProp?.email || storedUser?.email || 'owner@agenthive.com'

  const unreadCount = notifications.filter(n => n.unread).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const handleLogout = () => {
    authLogout()
    router.push('/auth')
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 flex items-center justify-between shadow-xs transition-all">
      {/* Mobile / Compact Brand Logo fallback */}
      <div className="flex items-center gap-4">
        <div className="md:hidden" onClick={() => router.push('/dashboard')}>
          <Logo size="sm" variant="light" showText={false} />
        </div>
        {/* Search Input */}
        <div className="relative flex items-center w-full max-w-xs sm:max-w-md">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents, tasks, analytics, or settings (Press '/' to focus)"
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* WhatsApp Direct CTA */}
        <a
          href="https://wa.me/17017911866"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-xs font-bold transition-all"
          title="Chat on WhatsApp"
        >
          <MessageSquare className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
          <span>WhatsApp</span>
        </a>

        {/* Quick Hire CTA */}
        <Button
          onClick={onOpenHireModal || (() => router.push('/dashboard/marketplace'))}
          variant="primary"
          size="sm"
          icon={Plus}
        >
          Hire Agent
        </Button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowProfileMenu(false)
            }}
            className="relative w-9 h-9 rounded-xl bg-slate-100/80 text-slate-600 hover:text-blue-600 hover:bg-slate-200/80 flex items-center justify-center transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm shadow-blue-500/50 animate-bounce-in">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-slate-900/15 overflow-hidden z-50 animate-scale-in">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Notifications</h3>
                  {unreadCount > 0 && <Badge variant="primary" size="sm">{unreadCount} new</Badge>}
                </div>
                <button
                  onClick={markAllRead}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Mark all read
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 hover:bg-slate-50 transition-colors ${n.unread ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">{n.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-9 h-9 rounded-xl bg-slate-100/80 text-slate-600 hover:text-blue-600 hover:bg-slate-200/80 flex items-center justify-center transition-all cursor-pointer"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotifications(false)
            }}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100/80 transition-all cursor-pointer border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {businessName.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-slate-700 hidden md:block">{businessName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-slate-900/15 p-2 z-50 animate-scale-in">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-800">{businessName}</p>
                <p className="text-[11px] text-slate-400 truncate">{email}</p>
              </div>

              <button
                onClick={() => {
                  router.push('/dashboard/profile')
                  setShowProfileMenu(false)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
              >
                <User className="w-4 h-4" />
                Profile Settings
              </button>

              <button
                onClick={() => {
                  router.push('/dashboard/settings')
                  setShowProfileMenu(false)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Account Settings
              </button>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
