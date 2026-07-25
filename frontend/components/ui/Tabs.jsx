"use client"
import React from 'react'

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  size = 'md',
}) {
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3',
    md: 'text-sm py-2 px-4',
    lg: 'text-base py-2.5 px-5',
  }

  return (
    <div className={`flex items-center gap-1.5 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const id = typeof tab === 'string' ? tab : tab.id
        const label = typeof tab === 'string' ? tab : tab.label
        const count = tab.count !== undefined ? tab.count : null
        const isActive = activeTab === id

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`font-semibold rounded-xl transition-all duration-200 whitespace-nowrap flex items-center gap-2 select-none ${sizeClasses[size]} ${
              isActive
                ? 'bg-white text-blue-600 shadow-md shadow-slate-200/60 border border-slate-200/40'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <span>{label}</span>
            {count !== null && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
