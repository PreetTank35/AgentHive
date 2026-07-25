/**
 * API helper functions for communicating with the AgentHive backend.
 *
 * All functions return parsed JSON or throw on error.
 * The base URL uses Next.js rewrites (requests to /api/* are
 * forwarded to the backend at localhost:8000).
 */

import { getToken } from './auth'

const BASE = '/api'

/**
 * Build headers with optional auth token.
 * @returns {Record<string, string>}
 */
function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// ── Auth ─────────────────────────────────────────────────────

/**
 * Register a new user account.
 * @param {string} email
 * @param {string} password
 * @param {string} businessName
 * @returns {Promise<{token: string, user_id: number, business_name: string}>}
 */
export async function registerUser(email, password, businessName) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, business_name: businessName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Registration failed')
  }
  return res.json()
}

/**
 * Log in an existing user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user_id: number, business_name: string}>}
 */
export async function loginUser(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Login failed')
  }
  return res.json()
}

// ── Chat ─────────────────────────────────────────────────────

/**
 * Send a chat message to the Manager Agent or direct target agent.
 * @param {string} message - The user's message text.
 * @param {number} userId - The user's database ID (default 1 for demo).
 * @param {number|null} conversationId - Existing conversation ID to continue.
 * @param {string|null} targetAgent - Specific target agent key ('support', 'finance', 'content', 'scheduler', 'analytics', 'manager', 'auto').
 * @returns {Promise<{response: string, agent_name: string, orchestrator: string, conversation_id: number}>}
 */
export async function sendChatMessage(message, userId = 1, conversationId = null, targetAgent = null) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      message,
      user_id: userId,
      conversation_id: conversationId,
      target_agent: targetAgent,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Chat request failed')
  }
  return res.json()
}

// ── Activity Feed ────────────────────────────────────────────

/**
 * Fetch the activity feed (recent actions across all agents).
 * @param {number} limit - Max number of items (default 20).
 * @returns {Promise<Array<{type: string, icon: string, agent: string, description: string, timestamp: string}>>}
 */
export async function fetchActivity(limit = 20) {
  const res = await fetch(`${BASE}/activity?limit=${limit}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch activity')
  return res.json()
}

// ── Agent Status ─────────────────────────────────────────────

/**
 * Fetch agent statuses.
 * @returns {Promise<Array<{name: string, key: string, description: string, icon: string, color: string, status: string}>>}
 */
export async function fetchAgentStatuses() {
  const res = await fetch(`${BASE}/agents/status`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch agent statuses')
  return res.json()
}

// ── Dashboard Stats ──────────────────────────────────────────

/**
 * Fetch dashboard summary stats.
 * @returns {Promise<{expense_total: number, draft_count: number, pending_reminders: number, support_questions: number}>}
 */
export async function fetchStats() {
  const res = await fetch(`${BASE}/stats`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

// ── Marketplace ──────────────────────────────────────────────

/**
 * Fetch marketplace agents.
 * @param {string|null} category - Filter by category.
 * @returns {Promise<Array>}
 */
export async function fetchMarketplaceAgents(category = null) {
  const url = category
    ? `${BASE}/marketplace/agents?category=${encodeURIComponent(category)}`
    : `${BASE}/marketplace/agents`
  const res = await fetch(url, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch marketplace agents')
  return res.json()
}

/**
 * Hire a marketplace agent.
 * @param {number} agentId - The marketplace agent's ID.
 * @param {number} userId - The user's ID.
 * @returns {Promise<{status: string, message: string, hired_id: number}>}
 */
export async function hireAgent(agentId, userId = 1) {
  const res = await fetch(`${BASE}/marketplace/hire`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ agent_id: agentId, user_id: userId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Hire request failed')
  }
  return res.json()
}

/**
 * Fetch hired agents for a user.
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function fetchHiredAgents(userId = 1) {
  const res = await fetch(`${BASE}/marketplace/hired?user_id=${userId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch hired agents')
  return res.json()
}

// ── Health Check ─────────────────────────────────────────────

/**
 * Check if the backend is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch('/health')
    return res.ok
  } catch {
    return false
  }
}
