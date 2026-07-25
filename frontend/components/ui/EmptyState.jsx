"use client"
import React from 'react'
import { Inbox } from 'lucide-react'
import Button from './Button'

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No data available',
  description = 'There are currently no items to display.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-slate-100 shadow-sm ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
