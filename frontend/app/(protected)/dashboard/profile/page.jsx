"use client"
import React, { useState, useRef } from 'react'
import TopNav from '@/components/ui/TopNav'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  User, Mail, Phone, MapPin, Building, ShieldCheck, CheckCircle2, Calendar, Camera, Upload, Trash2, Image as ImageIcon
} from 'lucide-react'

export default function ProfilePage() {
  const { addToast } = useToast()
  const fileInputRef = useRef(null)

  const user = { email: 'owner@agenthive.com', user_metadata: { business_name: 'Sunrise Bakery & Cafe' } }
  const businessName = user?.user_metadata?.business_name || 'Sunrise Bakery & Cafe'
  const email = user?.email || 'owner@agenthive.com'

  const [fullName, setFullName] = useState('Vinayak Tambole')
  const [phone, setPhone] = useState('+1 (555) 234-5678')
  const [location, setLocation] = useState('San Francisco, CA')
  const [profileImage, setProfileImage] = useState(null)

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('Image size should be less than 5MB', 'error')
        return
      }
      const imageUrl = URL.createObjectURL(file)
      setProfileImage(imageUrl)
      addToast('Profile picture updated!', 'success')
    }
  }

  const handleRemoveImage = () => {
    setProfileImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    addToast('Profile picture removed', 'info')
  }

  const handleSaveProfile = () => {
    addToast('Profile details updated successfully', 'success')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TopNav user={user} />

      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        {/* Profile Hero Header */}
        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-r from-blue-900 via-blue-800 to-teal-800 text-white">
          <CardBody className="p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Profile Avatar Container with Camera Overlay */}
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={fullName}
                    className="w-24 h-24 rounded-3xl object-cover shadow-2xl border-4 border-white/20 group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-400 to-teal-400 text-slate-900 font-extrabold text-3xl flex items-center justify-center shadow-2xl border-4 border-white/20">
                    VT
                  </div>
                )}
                
                {/* Camera Overlay Badge */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-blue-700 transition-colors">
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight">{fullName}</h1>
                  <Badge variant="online" dot>Verified Owner</Badge>
                </div>
                <p className="text-sm text-teal-300 font-semibold mt-0.5">{businessName}</p>
                <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {email}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {location}</span>
                </div>
              </div>

              <Button variant="secondary" onClick={handleSaveProfile}>
                Save Profile
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Profile Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
            <span className="text-xs font-bold text-slate-400 uppercase">AI Agents Hired</span>
            <span className="text-2xl font-extrabold text-blue-600 block mt-1">6 Active</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Automated Hours Saved</span>
            <span className="text-2xl font-extrabold text-teal-600 block mt-1">340+ Hours</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Member Since</span>
            <span className="text-2xl font-extrabold text-purple-600 block mt-1">Jan 2026</span>
          </div>
        </div>

        {/* Personal Details & Profile Picture Form */}
        <Card>
          <CardHeader>
            <CardTitle subtitle="Update your personal information & profile picture">Personal Information</CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Profile Picture Upload Control */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {profileImage ? (
                  <img src={profileImage} alt="Avatar Preview" className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-200" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Profile Picture</h4>
                  <p className="text-xs text-slate-500">JPG, PNG or GIF. Max size of 5MB.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Upload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload New
                </Button>
                {profileImage && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />

              <Input
                label="Email Address"
                value={email}
                readOnly
                helperText="Email is managed via primary authentication provider."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input
                label="Location / City"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
