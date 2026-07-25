"use client"
import React, { useState, useEffect } from 'react'
import TopNav from '@/components/ui/TopNav'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/Input'
import Tabs from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { fetchAgentStatuses } from '@/lib/api'
import { AGENT_TEAM } from '@/lib/mockData'
import ChatWidget from '@/components/ChatWidget'
import {
  Bot, Settings, Plus, Sparkles, MessageSquare, Zap
} from 'lucide-react'

/**
 * Merges backend agent statuses with mock data for a richer display.
 * Backend provides: name, key, description, icon, color, status
 */
function mergeAgents(backendAgents, mockAgents) {
  const keyMap = {
    content: 'agent-3',   // Marketing Strategist
    finance: 'agent-4',   // Finance & Accounts
    scheduler: 'agent-6', // Operations & Workflow
    support: 'agent-1',   // Customer Support
    analytics: 'agent-8', // Data Analyst
  }

  return backendAgents.map(ba => {
    const mockId = keyMap[ba.key]
    const mock = mockAgents.find(m => m.id === mockId) || mockAgents[0]
    return {
      ...mock,
      id: ba.key,
      name: ba.name,
      description: ba.description,
      status: ba.status,
      color: ba.color,
      icon: ba.icon,
      isBackendAgent: true,
    }
  })
}

export default function AgentsPage() {
  const { addToast } = useToast()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeChatAgent, setActiveChatAgent] = useState(null)
  const [showChatModal, setShowChatModal] = useState(false)

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setLoading(true)
    try {
      const data = await fetchAgentStatuses()
      const merged = mergeAgents(data, AGENT_TEAM)
      setAgents(merged)
    } catch {
      setAgents(AGENT_TEAM.slice(0, 5).map((a, i) => ({
        ...a,
        isBackendAgent: false,
      })))
    } finally {
      setLoading(false)
    }
  }

  const toggleAgentStatus = (agentId, e) => {
    e?.stopPropagation()
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        const nextStatus = a.status === 'online' ? 'offline' : 'online'
        addToast(`${a.name} is now ${nextStatus.toUpperCase()}`, nextStatus === 'online' ? 'success' : 'info')
        return { ...a, status: nextStatus }
      }
      return a
    }))
  }

  const openDirectChat = (agentKey, e) => {
    e?.stopPropagation()
    setActiveChatAgent(agentKey)
    setShowChatModal(true)
  }

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (agent.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TopNav />

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-xs font-bold text-teal-700 mb-2">
              <Bot className="w-3.5 h-3.5 text-teal-600" />
              {agents.filter(a => a.status === 'online').length} Active AI Employees
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI Agent Workforce</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Chat directly with any specialist agent or use the Manager Agent to orchestrate team workflows.
            </p>
          </div>

          <Button variant="primary" icon={MessageSquare} onClick={() => openDirectChat('auto')}>
            Open Orchestrator Chat
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-full md:w-80">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto">
            <Tabs
              tabs={[
                { id: 'all', label: 'All Agents', count: agents.length },
                { id: 'online', label: 'Online', count: agents.filter(a => a.status === 'online').length },
                { id: 'busy', label: 'Busy', count: agents.filter(a => a.status === 'busy').length },
                { id: 'offline', label: 'Offline', count: agents.filter(a => a.status === 'offline').length },
              ]}
              activeTab={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        {/* Agent Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-2 w-full bg-slate-200 animate-pulse" />
                <CardBody className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="skeleton w-14 h-14 rounded-2xl" />
                    <div className="skeleton w-20 h-6 rounded-full" />
                  </div>
                  <div className="skeleton w-3/4 h-5 rounded" />
                  <div className="skeleton w-full h-3 rounded" />
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => {
              const isOnline = agent.status === 'online'
              const isBusy = agent.status === 'busy'

              return (
                <Card
                  key={agent.id}
                  hoverEffect
                  onClick={() => {
                    setSelectedAgent(agent)
                    setIsDetailOpen(true)
                  }}
                  className="group relative overflow-hidden flex flex-col justify-between"
                >
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: agent.color || '#2563EB' }}
                  />

                  <CardBody className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="relative">
                          {agent.avatar ? (
                            <img
                              src={agent.avatar}
                              alt={agent.name}
                              className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div
                              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 border-white shadow-md"
                              style={{ backgroundColor: `${agent.color}20` }}
                            >
                              {agent.icon}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                              isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : isBusy ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <Badge variant={isOnline ? 'online' : isBusy ? 'busy' : 'offline'} dot>
                            {agent.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">{agent.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={MessageSquare}
                        onClick={(e) => openDirectChat(agent.id, e)}
                      >
                        Chat Directly
                      </Button>

                      <Button
                        variant={isOnline ? 'secondary' : 'teal'}
                        size="sm"
                        onClick={(e) => toggleAgentStatus(agent.id, e)}
                      >
                        {isOnline ? 'Pause' : 'Activate'}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}

        {/* Direct Chat Modal */}
        {showChatModal && (
          <Modal
            isOpen={showChatModal}
            onClose={() => setShowChatModal(false)}
            title="Direct Agent Chat Workspace"
            size="lg"
          >
            <div className="h-[550px]">
              <ChatWidget initialAgent={activeChatAgent || 'auto'} fullHeight />
            </div>
          </Modal>
        )}

        {/* Detailed Agent Modal */}
        {selectedAgent && (
          <Modal
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            title={selectedAgent.name}
            subtitle={selectedAgent.description}
            footer={
              <>
                <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Close</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    openDirectChat(selectedAgent.id)
                    setIsDetailOpen(false)
                  }}
                >
                  Start Direct Chat
                </Button>
              </>
            }
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md"
                  style={{ backgroundColor: `${selectedAgent.color}20` }}
                >
                  {selectedAgent.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-800">{selectedAgent.name}</h4>
                    <Badge variant={selectedAgent.status === 'online' ? 'online' : 'offline'} dot>
                      {selectedAgent.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{selectedAgent.description}</p>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}
