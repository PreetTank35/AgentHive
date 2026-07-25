"use client"
import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Reusable Button component adhering to AgentHive Design System.
 * Supports variants: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'teal'
 * Sizes: 'sm' | 'md' | 'lg'
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5',
  }

  const variantStyles = {
    primary: 'bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5 border border-transparent',
    secondary: 'bg-white text-slate-800 border border-slate-200/80 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900',
    teal: 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30 hover:-translate-y-0.5 border border-transparent',
    outline: 'bg-transparent text-blue-600 border-2 border-blue-600/30 hover:bg-blue-50/50 hover:border-blue-600',
    danger: 'bg-red-500/10 text-red-600 border border-red-200/80 hover:bg-red-500/20 hover:border-red-300',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </>
      )}
    </button>
  )
}
