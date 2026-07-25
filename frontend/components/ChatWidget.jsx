"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Sparkles, ChevronDown, Check, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { sendChatMessage } from '@/lib/api'
import { getUser } from '@/lib/auth'

const AGENT_OPTIONS = [
  { key: 'auto', name: 'Auto (Manager Agent)', icon: '🐝', color: '#6366f1', role: 'Smart Supervisor Routing' },
  { key: 'support', name: 'Support Agent', icon: '🛟', color: '#EF4444', role: 'Customer & FAQ Support' },
  { key: 'finance', name: 'Finance Agent', icon: '💰', color: '#10B981', role: 'Expenses & Invoicing' },
  { key: 'content', name: 'Content Agent', icon: '📝', color: '#8B5CF6', role: 'Posts, Emails & Copy' },
  { key: 'scheduler', name: 'Scheduler Agent', icon: '📅', color: '#F59E0B', role: 'Reminders & Meetings' },
  { key: 'analytics', name: 'Analytics Agent', icon: '📊', color: '#3B82F6', role: 'Business & Performance Insights' },
]

/**
 * ChatWidget — Interactive multi-agent chat with voice support.
 *
 * Voice input:  Browser Web Speech API (SpeechRecognition) — no API key needed.
 * Voice output: Browser SpeechSynthesis to read agent responses aloud — no API key needed.
 * Both are built into the browser and work for every agent automatically.
 */
export default function ChatWidget({ onNewActivity, initialAgent = 'auto', fullHeight = false }) {
  const [selectedAgent, setSelectedAgent] = useState(initialAgent)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Welcome to AgentHive! I'm your Manager Agent.\n\nYou can chat with me in Auto Mode, select a specific agent above, or ask me to delegate tasks directly!\n\nExamples:\n• \"Tell Customer Support Agent to help with bakery hours\"\n• \"Ask Finance Agent to log a $150 flour expense\"\n• \"Tell Content Agent to draft a sourdough post\"\n• \"Remind me to order supplies next Monday\"\n\n🎤 Click the mic button to use voice input!",
      agent_name: 'manager',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // ── Voice state ────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true) // auto-read responses aloud
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (initialAgent) {
      setSelectedAgent(initialAgent)
    }
  }, [initialAgent])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Web Speech API: Speech Recognition (voice input) ──────
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Your browser does not support speech recognition. Try Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)

      // Auto-send when speech recognition gives a final result
      if (event.results[event.results.length - 1].isFinal) {
        // Small delay to let state update
        setTimeout(() => {
          setIsListening(false)
        }, 300)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  // ── Web Speech API: Speech Synthesis (voice output) ────────
  const speakText = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    // Clean up the text for speech (remove markdown, emojis, etc.)
    const cleanText = text
      .replace(/[*_#`]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/[^\w\s.,!?'-]/g, ' ')
      .trim()

    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [voiceEnabled])

  const toggleVoiceOutput = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel()
      setIsSpeaking(false)
    }
    setVoiceEnabled(prev => !prev)
  }, [isSpeaking])

  // ── Agent display data ─────────────────────────────────────
  const currentAgentInfo = AGENT_OPTIONS.find(a => a.key === selectedAgent) || AGENT_OPTIONS[0]

  const agentColors = {
    manager: '#6366f1',
    auto: '#6366f1',
    finance: '#10B981',
    content: '#8B5CF6',
    scheduler: '#F59E0B',
    support: '#EF4444',
    analytics: '#3B82F6',
  }

  const agentIcons = {
    manager: '🐝',
    auto: '🐝',
    finance: '💰',
    content: '📝',
    scheduler: '📅',
    support: '🛟',
    analytics: '📊',
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      const user = getUser()
      const targetParam = selectedAgent === 'auto' ? null : selectedAgent
      const data = await sendChatMessage(text, user?.id || 1, conversationId, targetParam)
      setConversationId(data.conversation_id)

      // Add agent response
      const agentMsg = {
        role: 'assistant',
        content: data.response,
        agent_name: data.agent_name || selectedAgent,
        orchestrator: data.orchestrator,
      }
      setMessages(prev => [...prev, agentMsg])

      // Read response aloud if voice output is enabled
      if (voiceEnabled) {
        speakText(data.response)
      }

      // Notify parent to refresh activity feed
      if (onNewActivity) onNewActivity()
    } catch (err) {
      // Surface helpful error context for local vs Vercel production
      const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      const errorMessage = isProduction
        ? `⚠️ **Connection Error** — Could not reach the backend server.\n\n**Error:** ${err.message}\n\n**How to fix on Vercel:**\n1. Go to **Vercel Dashboard → Project Settings → Environment Variables**.\n2. Add **NEXT_PUBLIC_API_URL** or **BACKEND_URL** pointing to your deployed backend URL (e.g. \`https://your-backend.onrender.com\`).\n3. Redeploy your Vercel project.`
        : `⚠️ **Connection Error** — Could not reach the backend server.\n\n**Error:** ${err.message}\n\nPlease make sure the backend (uvicorn) is running on port 8000 (\`uvicorn backend.core.app:app --reload\`).`

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage,
          agent_name: 'manager',
          orchestrator: 'Error — Backend Unreachable',
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`flex flex-col ${fullHeight ? 'h-full' : 'glass-card-solid rounded-2xl h-[620px]'} overflow-hidden shadow-2xl border border-slate-200/80`}>
      {/* Header with Agent Selector */}
      <div className="bg-slate-900 px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-3 relative">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md cursor-pointer transition-transform active:scale-95"
            style={{ backgroundColor: `${currentAgentInfo.color}20`, border: `1px solid ${currentAgentInfo.color}40` }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {currentAgentInfo.icon}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 text-left text-white font-bold text-sm hover:text-sky-300 transition-colors"
            >
              <span>{currentAgentInfo.name}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            <p className="text-slate-400 text-xs font-medium">{currentAgentInfo.role}</p>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-12 left-0 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-scale-in">
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                  Select Target Agent
                </div>
                {AGENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setSelectedAgent(opt.key)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      selectedAgent === opt.key
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">{opt.icon}</span>
                      <span>{opt.name}</span>
                    </div>
                    {selectedAgent === opt.key && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice output toggle */}
          <button
            onClick={toggleVoiceOutput}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              voiceEnabled
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'
            }`}
            title={voiceEnabled ? 'Voice output ON — click to mute' : 'Voice output OFF — click to enable'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div className="max-w-[85%]">
              {/* Agent Badge Header */}
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1 ml-1">
                  <span className="text-sm">{agentIcons[msg.agent_name] || '🤖'}</span>
                  <span
                    className="text-[11px] font-extrabold uppercase tracking-wider"
                    style={{ color: agentColors[msg.agent_name] || '#6366f1' }}
                  >
                    {msg.agent_name ? `${msg.agent_name} Agent` : 'Manager Agent'}
                  </span>
                  {msg.orchestrator && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-600">
                      {msg.orchestrator}
                    </span>
                  )}
                </div>
              )}

              {/* Chat Bubble */}
              <div
                className={`rounded-2xl px-4.5 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md shadow-md shadow-blue-600/20 font-medium'
                    : 'bg-white text-slate-800 rounded-bl-md shadow-sm border border-slate-200/80'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs font-bold text-slate-600">
                  {selectedAgent === 'auto'
                    ? 'Manager Agent routing & orchestrating…'
                    : `${currentAgentInfo.name} processing request…`}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Message Input Bar with Voice */}
      <div className="p-3.5 border-t border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Microphone button — Web Speech API, no API key needed */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={loading}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer
              ${isListening
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isListening ? 'Stop listening' : 'Start voice input (no API key needed)'}
            id="voice-input-btn"
          >
            {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? '🎤 Listening… speak now'
                : selectedAgent === 'auto'
                  ? 'Ask Manager or say "Tell Customer Support Agent to..."'
                  : `Message ${currentAgentInfo.name} directly…`
            }
            disabled={loading}
            className={`flex-1 bg-slate-100/80 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400
                       border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                       transition-all duration-200 disabled:opacity-50 font-medium
                       ${isListening ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}
            id="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 
                       flex items-center justify-center text-white shadow-md shadow-blue-600/30
                       disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-95 cursor-pointer"
            id="chat-send-btn"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Voice status indicators */}
        {(isListening || isSpeaking) && (
          <div className="flex items-center gap-2 mt-2 px-1">
            {isListening && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Listening…
              </span>
            )}
            {isSpeaking && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                <Volume2 className="w-3 h-3 animate-pulse" />
                Speaking…
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
