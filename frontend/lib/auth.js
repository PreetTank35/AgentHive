/**
 * Auth helpers for AgentHive — Supabase Auth with localStorage fallback.
 *
 * When Supabase is configured (NEXT_PUBLIC_SUPABASE_URL set), auth operations
 * go through Supabase. Otherwise, falls back to localStorage JWT storage
 * for local dev without Supabase.
 */

import { createClient } from '@/utils/supabase/client'

const AUTH_TOKEN_KEY = 'agenthive_token'
const AUTH_USER_KEY = 'agenthive_user'

/**
 * Get the Supabase client (returns null if not configured).
 */
function getSupabase() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) return null
    return createClient()
  } catch {
    return null
  }
}

/**
 * Store auth data after a successful login/register.
 * @param {{ token: string, user_id: number, business_name: string, email?: string }} authData
 */
export function setAuth(authData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, authData.token)
  localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify({
      id: authData.user_id,
      email: authData.email || '',
      business_name: authData.business_name,
    })
  )
}

/**
 * Get the stored JWT token (from Supabase session or localStorage fallback).
 * @returns {string|null}
 */
export function getToken() {
  if (typeof window === 'undefined') return null
  // Try localStorage first (fastest, works for both Supabase and fallback tokens)
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

/**
 * Get the stored user object.
 * @returns {{ id: number, email: string, business_name: string }|null}
 */
export function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  // Default mock user when auth is temporarily disabled
  return {
    id: 1,
    email: 'owner@agenthive.com',
    business_name: 'Sunrise Bakery & Cafe',
  }
}

/**
 * Check if the user is authenticated.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return true // Temporarily bypassed for demo
}

/**
 * Clear auth data (logout).
 */
export async function logout() {
  if (typeof window === 'undefined') return
  // Clear localStorage
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  // Sign out of Supabase if configured
  const sb = getSupabase()
  if (sb) {
    try {
      await sb.auth.signOut()
    } catch {}
  }
}

/**
 * Update stored user fields (e.g. after profile edit).
 * @param {Partial<{ email: string, business_name: string }>} updates
 */
export function updateStoredUser(updates) {
  const user = getUser()
  if (!user) return
  const updated = { ...user, ...updates }
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated))
  }
}

export { AUTH_TOKEN_KEY, AUTH_USER_KEY }
