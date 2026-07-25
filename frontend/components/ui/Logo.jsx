"use client"
import React from 'react'

/**
 * Upgraded AgentHive Logo Component — dynamic futuristic honeycomb + core pulse AI logo.
 *
 * Props:
 * @param {'sm'|'md'|'lg'|'xl'} size - Icon size variant.
 * @param {boolean} showText - Whether to show "AgentHive" brand name.
 * @param {'dark'|'light'} variant - Color theme for dark sidebar vs light header.
 * @param {string} subtext - Optional tagline/business text below brand.
 * @param {string} className - Additional container styling.
 */
export default function Logo({
  size = 'md',
  showText = true,
  variant = 'dark',
  subtext,
  className = '',
}) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl',
  }

  const isDark = variant === 'dark'

  return (
    <div className={`inline-flex items-center gap-3 select-none group cursor-pointer ${className}`}>
      {/* Dynamic Hexagonal Hive Icon */}
      <div className={`relative ${iconSizes[size]} flex items-center justify-center flex-shrink-0`}>
        {/* Ambient Glow Aura */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-indigo-600 blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-500 animate-pulse-glow" />

        {/* Outer Rotating/Gradient Hex Ring */}
        <div className="relative w-full h-full rounded-2xl bg-slate-900 border border-cyan-500/30 p-1.5 shadow-xl flex items-center justify-center overflow-hidden">
          {/* Internal Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-teal-400/20 group-hover:opacity-100 transition-opacity" />

          {/* Futuristic Hex Hive SVG */}
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-cyan-400 relative z-10">
            {/* Outer Hexagon outline */}
            <path
              d="M12 2L21 7.2V16.8L12 22L3 16.8V7.2L12 2Z"
              stroke="url(#hiveGrad)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Inner Honeycomb Core Network */}
            <path
              d="M12 6L17 8.9V14.7L12 17.6L7 14.7V8.9L12 6Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeOpacity="0.4"
              fill="rgba(14, 165, 233, 0.15)"
            />
            {/* Central Manager Core Node */}
            <circle cx="12" cy="11.8" r="2.2" fill="url(#coreGrad)" className="animate-pulse" />

            {/* Orbiting Agent Nodes */}
            <circle cx="12" cy="6" r="1.1" fill="#38BDF8" />
            <circle cx="17" cy="14.7" r="1.1" fill="#14B8A6" />
            <circle cx="7" cy="14.7" r="1.1" fill="#8B5CF6" />

            {/* Connecting Rays */}
            <line x1="12" y1="11.8" x2="12" y2="6" stroke="#38BDF8" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="12" y1="11.8" x2="17" y2="14.7" stroke="#14B8A6" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="12" y1="11.8" x2="7" y2="14.7" stroke="#8B5CF6" strokeWidth="1" strokeOpacity="0.8" />

            {/* Gradients */}
            <defs>
              <linearGradient id="hiveGrad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38BDF8" />
                <stop offset="0.5" stopColor="#14B8A6" />
                <stop offset="1" stopColor="#6366F1" />
              </linearGradient>
              <radialGradient id="coreGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 11.8) scale(2.2)">
                <stop stopColor="#38BDF8" />
                <stop offset="1" stopColor="#0284C7" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black ${textSizes[size]} tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Agent
            </span>
            <span className={`font-black ${textSizes[size]} tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-teal-400 to-indigo-500`}>
              Hive
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-xs shadow-teal-400/80 animate-ping ml-0.5" />
          </div>
          {subtext && (
            <span className={`text-[10px] font-extrabold uppercase tracking-widest truncate mt-0.5 ${isDark ? 'text-teal-400' : 'text-slate-500'}`}>
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
