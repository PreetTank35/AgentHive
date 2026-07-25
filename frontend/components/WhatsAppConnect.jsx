"use client"
import React, { useState, useEffect } from 'react'
import { MessageSquare, ExternalLink, CheckCircle2, Phone, Sparkles, Copy, Check, QrCode } from 'lucide-react'

/**
 * WhatsAppConnect Component — Displays live WhatsApp gateway connection,
 * direct wa.me click-to-chat links, and instructions for visitors.
 */
export default function WhatsAppConnect({ className = "" }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/webhook/whatsapp/status')
      .then((res) => res.json())
      .catch(() => ({
        provider: 'twilio',
        connected: true,
        display_number: '+1 701 791 1866',
        click_to_chat_url: 'https://wa.me/17017911866',
        instructions: 'Send any message to +1 701 791 1866 to chat with your AI Team!',
      }))
      .then((data) => {
        setStatus(data)
        setLoading(false)
      })
  }, [])

  const handleCopy = () => {
    if (!status?.display_number) return
    navigator.clipboard.writeText(status.display_number)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const numberToDisplay = status?.display_number || '+1 701 791 1866'
  const chatUrl = status?.click_to_chat_url || `https://wa.me/${numberToDisplay.replace(/[^0-9]/g, '')}`

  return (
    <div className={`bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-emerald-500/30 relative overflow-hidden ${className}`}>
      {/* Background Glow */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            <MessageSquare className="w-3.5 h-3.5 fill-emerald-400" />
            WhatsApp Channel Gateway
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </div>

          <h3 className="text-xl font-black text-white tracking-tight">
            Chat with your AI Team on WhatsApp
          </h3>

          <p className="text-sm text-slate-300 font-medium leading-relaxed">
            Anyone visiting your site can message your AI agents directly over WhatsApp. Send text messages or voice notes to execute workflows remotely!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-mono text-emerald-300">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>{numberToDisplay}</span>
              <button
                onClick={handleCopy}
                className="ml-2 hover:text-white transition-colors"
                title="Copy phone number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <span className="text-xs text-slate-400 font-semibold">
              Provider: <span className="text-white capitalize">{status?.provider || 'Twilio Sandbox'}</span>
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-95"
          >
            <MessageSquare className="w-4 h-4 fill-slate-950" />
            <span>Chat on WhatsApp</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
