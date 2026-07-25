"use client"
import React from 'react'
import { Search } from 'lucide-react'

export function Input({
  label,
  error,
  helperText,
  icon: Icon = null,
  className = '',
  containerClassName = '',
  ...props
}) {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">{label}</label>}
      <div className="relative flex items-center">
        {Icon && <Icon className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />}
        <input
          className={`w-full bg-slate-50 border border-slate-200/90 rounded-xl ${
            Icon ? 'pl-10' : 'px-4'
          } py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 ${
            error ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-400 mt-1">{helperText}</p>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '', ...props }) {
  return (
    <Input
      icon={Search}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  )
}

export function Select({ label, options = [], value, onChange, className = '', containerClassName = '', ...props }) {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        className={`w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Textarea({ label, error, className = '', containerClassName = '', ...props }) {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">{label}</label>}
      <textarea
        className={`w-full bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 ${
          error ? 'border-red-400' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}
    </div>
  )
}
