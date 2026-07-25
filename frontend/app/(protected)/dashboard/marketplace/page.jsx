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
import { fetchMarketplaceAgents, hireAgent, fetchHiredAgents } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { AGENT_TEAM } from '@/lib/mockData'
import {
  Store, Star, Plus, CheckCircle2, Sparkles, Loader2
} from 'lucide-react'

export default function MarketplacePage() {
  const { addToast } = useToast()
  const [category, setCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [isHireModalOpen, setIsHireModalOpen] = useState(false)
  const [isHiring, setIsHiring] = useState(false)

  // Backend marketplace data
  const [backendAgents, setBackendAgents] = useState([])
  const [hiredAgentIds, setHiredAgentIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [usingBackend, setUsingBackend] = useState(false)

  const user = getUser()

  useEffect(() => {
    loadMarketplace()
  }, [])

  const loadMarketplace = async () => {
    setLoading(true)
    try {
      const [agents, hired] = await Promise.all([
        fetchMarketplaceAgents(),
        fetchHiredAgents(user?.id || 1),
      ])
      setBackendAgents(agents)
      setHiredAgentIds(new Set(hired.map(h => h.agent?.id)))
      setUsingBackend(true)
    } catch {
      // Backend unavailable — use mock data
      setUsingBackend(false)
    } finally {
      setLoading(false)
    }
  }

  // Use backend data if available, otherwise mock
  const displayAgents = usingBackend
    ? backendAgents.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category || 'general',
        pricing: a.pricing || 'free',
        icon: a.icon || '🤖',
        creator: a.creator,
        isBackend: true,
        isHired: hiredAgentIds.has(a.id),
      }))
    : AGENT_TEAM

  const categories = usingBackend
    ? ['All', ...new Set(backendAgents.map(a => a.category).filter(Boolean))]
    : ['All', 'Support', 'Sales', 'Marketing', 'Finance', 'HR', 'Operations', 'Legal', 'Analytics']

  const filteredAgents = displayAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (agent.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = category === 'All' || agent.category === category
    return matchesSearch && matchesCategory
  })

  const handleHireConfirm = async () => {
    if (!selectedAgent) return

    if (usingBackend && selectedAgent.isBackend) {
      setIsHiring(true)
      try {
        const result = await hireAgent(selectedAgent.id, user?.id || 1)
        addToast(result.message || `Successfully hired ${selectedAgent.name}!`, 'success')
        setHiredAgentIds(prev => new Set([...prev, selectedAgent.id]))
        setIsHireModalOpen(false)
      } catch (err) {
        addToast(err.message || 'Failed to hire agent', 'error')
      } finally {
        setIsHiring(false)
      }
    } else {
      addToast(`Successfully hired ${selectedAgent.name}! Your workspace capacity was updated.`, 'success')
      setIsHireModalOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TopNav />

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Marketplace Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-teal-800 p-8 md:p-10 text-white shadow-2xl shadow-blue-900/20 overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-teal-300 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              {usingBackend ? 'Live Marketplace' : 'AI Agent Marketplace'}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Expand Your Business Workforce with Autonomous AI Employees
            </h1>
            <p className="text-sm md:text-base text-slate-200 font-medium mt-3 leading-relaxed">
              {usingBackend
                ? `${backendAgents.length} agents available. Instantly hire specialized AI agents for your business.`
                : 'Instantly hire specialized AI agents for finance, marketing, customer support, sales, and operations.'}
            </p>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full md:w-96">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search marketplace by skill or agent name..."
              />
            </div>

            <Tabs
              tabs={categories.map(c => ({ id: c, label: c }))}
              activeTab={category}
              onChange={setCategory}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardBody className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="skeleton w-14 h-14 rounded-2xl" />
                    <div className="skeleton w-24 h-6 rounded-full" />
                  </div>
                  <div className="skeleton w-3/4 h-5 rounded" />
                  <div className="skeleton w-full h-3 rounded" />
                  <div className="skeleton w-full h-3 rounded" />
                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <div className="skeleton w-16 h-6 rounded" />
                    <div className="skeleton w-24 h-8 rounded-xl" />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* All Marketplace Roster Grid */}
            <div className="space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {usingBackend ? 'Available Agents' : 'All AI Specialists'} ({filteredAgents.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAgents.map((agent) => (
                  <Card key={agent.id} hoverEffect className="group flex flex-col justify-between">
                    <CardBody className="p-6 flex flex-col justify-between h-full">
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          {agent.avatar ? (
                            <img src={agent.avatar} alt={agent.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shadow-sm">
                              {agent.icon}
                            </div>
                          )}
                          <div className="flex flex-col items-end gap-1">
                            {agent.isHired && (
                              <Badge variant="online" size="sm">✓ Hired</Badge>
                            )}
                            {agent.badge && <Badge variant="purple" size="sm">{agent.badge}</Badge>}
                            {agent.rating && (
                              <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                {agent.rating} ({agent.reviewsCount})
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {agent.name}
                        </h3>
                        {agent.role && (
                          <p className="text-xs font-semibold text-slate-500 mb-2">{agent.role}</p>
                        )}
                        {agent.creator && (
                          <p className="text-xs font-semibold text-slate-500 mb-2">by {agent.creator}</p>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">{agent.description}</p>

                        {/* Capabilities Tags */}
                        {agent.capabilities && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {agent.capabilities.map(cap => (
                              <span key={cap} className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                                ✓ {cap}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pricing & CTA */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
                        <div>
                          <span className="text-xs text-slate-400 font-bold block uppercase">Pricing</span>
                          <span className="text-base font-extrabold text-slate-900">
                            {agent.price || agent.pricing || 'Free'}
                          </span>
                        </div>

                        <Button
                          variant={agent.isHired ? 'secondary' : 'primary'}
                          size="sm"
                          disabled={agent.isHired}
                          onClick={() => {
                            setSelectedAgent(agent)
                            setIsHireModalOpen(true)
                          }}
                        >
                          {agent.isHired ? 'Hired' : 'Hire Agent'}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {filteredAgents.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                  <Store className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No agents found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Hire Agent Modal */}
        {selectedAgent && (
          <Modal
            isOpen={isHireModalOpen}
            onClose={() => setIsHireModalOpen(false)}
            title={`Hire ${selectedAgent.name}`}
            subtitle={`${selectedAgent.category || selectedAgent.department || ''} · ${selectedAgent.price || selectedAgent.pricing || 'Free'}`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setIsHireModalOpen(false)}>Cancel</Button>
                <Button variant="primary" loading={isHiring} onClick={handleHireConfirm}>
                  {isHiring ? 'Hiring...' : `Confirm Hire (${selectedAgent.price || selectedAgent.pricing || 'Free'})`}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                {selectedAgent.avatar ? (
                  <img src={selectedAgent.avatar} alt={selectedAgent.name} className="w-14 h-14 rounded-2xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                    {selectedAgent.icon}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{selectedAgent.name}</h4>
                  <p className="text-xs text-slate-500 font-semibold">{selectedAgent.description}</p>
                  {selectedAgent.rating && (
                    <span className="text-xs text-emerald-600 font-bold mt-1 block">★ {selectedAgent.rating} rating from {selectedAgent.reviewsCount} businesses</span>
                  )}
                </div>
              </div>

              {selectedAgent.capabilities && (
                <div className="p-4 rounded-xl border border-slate-200/80 bg-blue-50/40">
                  <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Included Automation Package:</h5>
                  <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                    {selectedAgent.capabilities.map(c => (
                      <li key={c} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}
