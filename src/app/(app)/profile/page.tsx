"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Mail, ShieldCheck, Loader2, Camera, Save, KeyRound } from "lucide-react"

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({
    full_name: '',
    avatar_url: ''
  })
  
  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [pwdMessage, setPwdMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile({
            full_name: data.full_name || '',
            avatar_url: data.avatar_url || ''
          })
        }
      }
      setLoading(false)
    }
    loadData()
  }, [supabase])

  const handleUpdateProfile = async () => {
    if (!user) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    }).eq('id', user.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      // Reload page to reflect changes in topbar
      setTimeout(() => window.location.reload(), 1000)
    }
    setSaving(false)
  }

  const handleUpdatePassword = async () => {
    if (!passwords.old_password) {
      setPwdMessage({ type: 'error', text: 'Please enter your old password.' })
      return
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setPwdMessage({ type: 'error', text: 'New passwords do not match!' })
      return
    }
    if (passwords.new_password.length < 6) {
      setPwdMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    setPasswordSaving(true)
    setPwdMessage({ type: '', text: '' })
    
    // 1. Verify old password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwords.old_password
    })

    if (signInError) {
      setPwdMessage({ type: 'error', text: 'Incorrect old password!' })
      setPasswordSaving(false)
      return
    }
    
    // 2. Update to new password
    const { error } = await supabase.auth.updateUser({
      password: passwords.new_password
    })

    if (error) {
      setPwdMessage({ type: 'error', text: error.message })
    } else {
      setPwdMessage({ type: 'success', text: 'Password updated successfully!' })
      setPasswords({ old_password: '', new_password: '', confirm_password: '' })
    }
    setPasswordSaving(false)
  }

  // Handle file upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}-${Math.random()}.${fileExt}`
      
      setMessage({ type: 'info', text: 'Uploading avatar...' })
      
      // Upload to supabase storage (avatars bucket)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })
        
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }))
      setMessage({ type: 'success', text: 'Avatar uploaded! Click Save to confirm.' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error uploading image.' })
    }
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>

  if (!user) return null

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">My Profile</h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-2">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/60 dark:border-zinc-800/60 shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white dark:border-zinc-950 shadow-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-3xl font-bold text-emerald-700 dark:text-emerald-500 uppercase">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    profile.full_name?.charAt(0) || user.email?.charAt(0) || 'U'
                  )}
                  <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </label>
                  <input 
                    type="file" 
                    id="avatar-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div className="text-xs text-slate-500">Click to upload</div>
              </div>

              {/* Form Section */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={profile.full_name} 
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    placeholder="E.g. Teguh Prasetyo"
                  />
                </div>
                
                <div className="space-y-2 opacity-70">
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-md bg-slate-50 dark:bg-zinc-900">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-zinc-400">{user.email}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Email cannot be changed directly.</p>
                </div>

                {message.text && (
                  <div className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : message.type === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {message.text}
                  </div>
                )}

                <Button onClick={handleUpdateProfile} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border-slate-200/60 dark:border-zinc-800/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-600" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Old Password</Label>
              <Input 
                id="oldPassword" 
                type="password" 
                value={passwords.old_password} 
                onChange={(e) => setPasswords({...passwords, old_password: e.target.value})}
              />
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                value={passwords.new_password} 
                onChange={(e) => setPasswords({...passwords, new_password: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={passwords.confirm_password} 
                onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
              />
            </div>

            {pwdMessage.text && (
              <div className={`p-3 rounded-md text-sm ${pwdMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {pwdMessage.text}
              </div>
            )}

            <Button onClick={handleUpdatePassword} disabled={passwordSaving} variant="outline" className="w-full">
              {passwordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* System Info Card */}
        <Card className="border-slate-200/60 dark:border-zinc-800/60 shadow-sm">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Internal account identifiers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-slate-100 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 rounded-xl shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">User ID</div>
              <div className="text-xs font-mono text-slate-700 dark:text-zinc-300 break-all">{user.id}</div>
            </div>
            <div className="p-4 border border-slate-100 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 rounded-xl shadow-sm flex items-center justify-between">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Status
              </div>
              <div className="text-sm font-medium text-emerald-700 dark:text-emerald-500">Verified & Active</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
