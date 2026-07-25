"use client"
import React from 'react'

export function Table({ children, className = '' }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-100/90 shadow-sm bg-white">
      <table className={`w-full text-left border-collapse ${className}`}>{children}</table>
    </div>
  )
}

export function TableHeader({ children }) {
  return (
    <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
      {children}
    </thead>
  )
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-100 text-sm text-slate-700">{children}</tbody>
}

export function TableRow({ children, className = '', onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-slate-50/80 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

export function TableHead({ children, className = '' }) {
  return <th className={`px-6 py-4 font-semibold ${className}`}>{children}</th>
}

export function TableCell({ children, className = '' }) {
  return <td className={`px-6 py-4 whitespace-nowrap ${className}`}>{children}</td>
}

export function Pagination({ currentPage = 1, totalPages = 5, onPageChange }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white rounded-b-2xl">
      <p className="text-xs text-slate-500 font-medium">
        Showing page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
        <span className="font-bold text-slate-800">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Previous
        </button>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Next
        </button>
      </div>
    </div>
  )
}
