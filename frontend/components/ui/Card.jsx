"use client"
import React from 'react'

export function Card({
  children,
  className = '',
  hoverEffect = false,
  glass = false,
  onClick,
  ...props
}) {
  const baseClass = glass
    ? 'bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/40 rounded-2xl'
    : 'bg-white border border-slate-100/90 shadow-xl shadow-slate-200/50 rounded-2xl'

  const hoverClass = hoverEffect
    ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/60 hover:border-slate-200 cursor-pointer'
    : ''

  return (
    <div
      onClick={onClick}
      className={`${baseClass} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-5 border-b border-slate-100/80 flex items-center justify-between ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', subtitle }) {
  return (
    <div>
      <h3 className={`text-lg font-bold text-slate-800 tracking-tight ${className}`}>{children}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 bg-slate-50/60 border-t border-slate-100/80 rounded-b-2xl ${className}`}>
      {children}
    </div>
  )
}
