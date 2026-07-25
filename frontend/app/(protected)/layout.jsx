"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { getUser, isLoggedIn } from '@/lib/auth'

/**
 * Protected Layout — app shell with sidebar + main content area.
 * Redirects to /auth if not authenticated (currently temporarily bypassed).
 * Reads user data from JWT auth storage or mock fallback.
 */
export default function ProtectedLayout({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Auth bypass (temporary)
    const storedUser = getUser() || {
      id: 1,
      email: 'owner@agenthive.com',
      business_name: 'Sunrise Bakery & Cafe',
    }
    setUser(storedUser)
    setReady(true)
  }, [router])

  // Build a user object compatible with Sidebar/TopNav props
  const serializedUser = user
    ? {
        id: user.id,
        email: user.email,
        user_metadata: { business_name: user.business_name },
      }
    : {
        id: 'guest',
        email: 'owner@agenthive.com',
        user_metadata: { business_name: 'My Business' },
      }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-slate-400">Loading AgentHive…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar user={serializedUser} />
      <main className="flex-1 overflow-y-auto">
        <div className="page-enter">
          {children}
        </div>
      </main>
    </div>
  )
}
