"use client"
import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'

/**
 * AgentCard — displays a specialist agent's avatar, status, and description.
 *
 * @param {Object} props
 * @param {string} props.name - Agent display name.
 * @param {string} props.description - Short description of the agent's role.
 * @param {string} props.icon - Emoji icon for the agent.
 * @param {string} props.color - Accent color (hex).
 * @param {string} props.status - "online" | "offline".
 * @param {string} props.agentKey - Agent key identifier.
 */
export default function AgentCard({ name, description, icon, color, status, agentKey }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      className="glass-card-solid rounded-2xl p-5 transition-all duration-300 cursor-default group animate-bounce-in"
      style={{
        borderTop: `3px solid ${color}`,
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hover
          ? `0 20px 40px -12px ${color}20, 0 8px 16px -8px rgba(0,0,0,0.08)`
          : '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-start justify-between mb-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          {icon}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'online' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-300'
            }`}
          />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {status}
          </span>
        </div>
      </div>

      {/* Name & description */}
      <h3 className="font-semibold text-slate-800 text-sm mb-1">{name}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>

      {/* Activity hint */}
      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-amber-400" />
        <span className="text-[11px] text-slate-400">Ready to assist</span>
      </div>
    </div>
  )
}
