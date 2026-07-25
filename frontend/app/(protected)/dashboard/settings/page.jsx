"use client"
import React, { useState } from 'react'
import TopNav from '@/components/ui/TopNav'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Tabs from '@/components/ui/Tabs'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import {
  Settings, Key, Bell, ShieldCheck, CreditCard, Users, Save, Copy, Check
} from 'lucide-react'

export default function SettingsPage() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('general')

  const [businessName, setBusinessName] = useState('Sunrise Bakery & Cafe')
  const [industry, setIndustry] = useState('Food & Beverage')
  const [timeZone, setTimeZone] = useState('UTC-5 (EST)')
  const [apiKey, setApiKey] = useState('ah_live_99482710394857610293847')
  const [copiedKey, setCopiedKey] = useState(false)

  // Notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [slackAlerts, setSlackAlerts] = useState(true)
  const [reportDigest, setReportDigest] = useState(true)

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(apiKey)
    setCopiedKey(true)
    addToast('API key copied to clipboard', 'info')
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleSave = () => {
    addToast('Settings saved successfully', 'success')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TopNav />

      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Platform Settings</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Manage your business profile, API keys, notifications, and subscription plan.
            </p>
          </div>

          <Button variant="primary" icon={Save} onClick={handleSave}>
            Save Changes
          </Button>
        </div>

        {/* Tab Navigation */}
        <Tabs
          tabs={[
            { id: 'general', label: 'General & Profile' },
            { id: 'notifications', label: 'Notifications & Alerts' },
            { id: 'apikeys', label: 'API Keys & Security' },
            { id: 'billing', label: 'Billing & Subscriptions' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab Content */}
        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle subtitle="Basic info about your company">Business Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <Input
                label="Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  options={['Food & Beverage', 'Retail', 'Technology', 'Healthcare', 'Services']}
                />

                <Select
                  label="Default Timezone"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  options={['UTC-5 (EST)', 'UTC-8 (PST)', 'UTC+0 (GMT)', 'UTC+5:30 (IST)']}
                />
              </div>

              <Textarea
                label="Business Overview / Mission"
                defaultValue="Artisanal bakery and cafe specializing in fresh organic sourdough, pastries, and catering."
                rows={3}
              />
            </CardBody>
          </Card>
        )}

        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle subtitle="Configure how and when AI agents notify you">
                Alert Preferences
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-800">Email Notifications</p>
                  <p className="text-xs text-slate-500">Receive urgent task resolution summaries via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-800">Slack Channel Integration</p>
                  <p className="text-xs text-slate-500">Post agent progress & lead notifications to #agenthive-log</p>
                </div>
                <input
                  type="checkbox"
                  checked={slackAlerts}
                  onChange={(e) => setSlackAlerts(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-800">Daily Executive PDF Digest</p>
                  <p className="text-xs text-slate-500">Receive daily 9:00 AM summary of tasks & revenue saved</p>
                </div>
                <input
                  type="checkbox"
                  checked={reportDigest}
                  onChange={(e) => setReportDigest(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>
            </CardBody>
          </Card>
        )}

        {activeTab === 'apikeys' && (
          <Card>
            <CardHeader>
              <CardTitle subtitle="API keys for Zapier, Webhooks, & custom integrations">
                API Authentication
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Live Production API Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={apiKey}
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800"
                  />
                  <Button variant="secondary" icon={copiedKey ? Check : Copy} onClick={handleCopyKey}>
                    {copiedKey ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-800">
                ⚠️ Treat your API key like a password. Never commit keys to public GitHub repositories.
              </div>
            </CardBody>
          </Card>
        )}

        {activeTab === 'billing' && (
          <Card>
            <CardHeader>
              <CardTitle subtitle="Your subscription tier & usage breakdown">
                Current Plan: Pro Business ($299/mo)
              </CardTitle>
              <Badge variant="online" dot>Active</Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-teal-500 rounded-2xl text-white shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Agent Capacity</p>
                <h3 className="text-3xl font-extrabold mt-1">6 of 8 Agents Deployed</h3>
                <p className="text-xs opacity-90 mt-2">Renews on August 15, 2026. Includes priority LLM execution.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-800">Need more agent slots?</p>
                  <p className="text-xs text-slate-500">Upgrade to Enterprise for unlimited agents & custom LLM fine-tuning.</p>
                </div>
                <Button variant="primary">Upgrade Plan</Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
