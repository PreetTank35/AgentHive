"use client"
import React from 'react'

/**
 * Badge component for AgentHive design system.
 * Variants: 'online' | 'busy' | 'offline' | 'primary' | 'teal' | 'amber' | 'purple' | 'gray'
 */
export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '',
}) {
  const base = 'inline-flex items-center font-semibold rounded-full select-none'

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }

  const variants = {
    online: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    busy: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    offline: 'bg-slate-100 text-slate-600 border border-slate-200/60',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200/60',
    teal: 'bg-teal-50 text-teal-700 border border-teal-200/60',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/60',
    amber: 'bg-amber-50 text-amber-800 border border-amber-200/60',
    gray: 'bg-slate-100 text-slate-700 border border-slate-200/60',
    dark: 'bg-slate-800 text-slate-100 border border-slate-700',
  }

  const dotColors = {
    online: 'bg-emerald-500',
    busy: 'bg-amber-500 animate-pulse',
    offline: 'bg-slate-400',
    primary: 'bg-blue-500',
    teal: 'bg-teal-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    gray: 'bg-slate-500',
    dark: 'bg-emerald-400',
  }

  return (
    <span className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-current'}`} />}
      <span>{children}</span>
    </span>
  )
}
