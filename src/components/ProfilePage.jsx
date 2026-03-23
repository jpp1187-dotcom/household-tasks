import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Toronto', 'America/Vancouver',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Rome', 'Europe/Madrid', 'Europe/Amsterdam',
  'Asia/Tokyo', 'Asia/Dubai', 'Asia/Singapore',
  'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  'Pacific/Auckland', 'UTC',
]

function InitialsAvatar({ name, size = 'lg' }) {
  const initials = (name ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const sizeClass = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm'
  const hue = (name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white shrink-0 border-2 border-white`}
      style={{ backgroundColor: `hsl(${hue}, 45%, 48%)` }}
    >
      {initials}
    </div>
  )
}

export default function ProfilePage() {
  const { currentUser, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    name:     currentUser?.name     ?? '',
    bio:      currentUser?.bio      ?? '',
    gender:   currentUser?.gender   ?? '',
    timezone: currentUser?.timezone ?? 'America/New_York',
    city:     currentUser?.city     ?? '',
  })
  const [newPassword, setNewPassword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [message,   setMessage]   = useState(null) // { text, ok }

  // Re-sync form fields whenever currentUser updates
  useEffect(() => {
    if (currentUser) {
      setForm({
        name:     currentUser.name     ?? '',
        bio:      currentUser.bio      ?? '',
        gender:   currentUser.gender   ?? '',
        timezone: currentUser.timezone ?? 'America/New_York',
        city:     currentUser.city     ?? '',
      })
    }
  }, [currentUser])

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function flash(text, ok = true) {
    setMessage({ text, ok })
    setTimeout(() => setMessage(null), 4000)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        name:     form.name,
        bio:      form.bio,
        gender:   form.gender,
        timezone: form.timezone,
        city:     form.city,
      })
      .eq('id', currentUser.id)
    setSaving(false)
    if (error) flash('Error: ' + error.message, false)
    else {
      await refreshProfile()
      flash('Profile saved!')
    }
  }

  async function handlePasswordChange() {
    if (!newPassword.trim()) return
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) flash('Error: ' + error.message, false)
    else { flash('Password updated!'); setNewPassword('') }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${currentUser.id}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '1' })
    if (uploadErr) {
      flash('Upload error: ' + uploadErr.message, false)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', currentUser.id)
    if (updateErr) {
      flash('Saved photo but could not update profile: ' + updateErr.message, false)
    } else {
      await refreshProfile()
      flash('Photo updated!')
    }
    setUploading(false)
  }

  const inputCls = "w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-xl">
      <h2 className="font-display text-2xl text-sage-800 mb-8">Profile</h2>

      {/* Avatar */}
      <div className="flex items-center gap-5 mb-6">
        {currentUser?.avatar_url ? (
          <img
            src={currentUser.avatar_url}
            alt="avatar"
            className="w-20 h-20 rounded-full object-cover border-2 border-sage-100"
          />
        ) : (
          <InitialsAvatar name={currentUser?.name ?? currentUser?.email} />
        )}
        <div>
          <label className="cursor-pointer px-4 py-2 text-sm font-medium bg-sage-100 hover:bg-sage-200 text-sage-700 rounded-lg transition-colors">
            {uploading ? 'Uploading…' : 'Change photo'}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
          </label>
          <p className="text-xs text-sage-400 mt-1.5">Stored in Supabase Storage "avatars" bucket</p>
        </div>
      </div>

      {/* Role badges */}
      <div className="flex flex-wrap gap-2 mb-8">
        {currentUser?.roles?.map(r => (
          <span key={r} className="px-3 py-1 bg-sage-100 text-sage-700 text-xs font-semibold rounded-full capitalize">{r}</span>
        ))}
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="space-y-4 mb-8">

        <div>
          <label className="block text-xs font-semibold text-sage-500 mb-1">Display name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-sage-500 mb-1">Email</label>
          <input value={currentUser?.email ?? ''} disabled className="w-full border border-sage-100 rounded-lg px-3 py-2 text-sm text-sage-400 bg-sage-50" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-sage-500 mb-1">City</label>
          <input
            value={form.city}
            onChange={e => set('city', e.target.value)}
            placeholder="e.g. New York"
            className={inputCls}
          />
          <p className="text-xs text-sage-400 mt-0.5">Used as clock label and weather fallback</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-sage-500 mb-1">Timezone</label>
          <select value={form.timezone} onChange={e => set('timezone', e.target.value)} className={inputCls}>
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <p className="text-xs text-sage-400 mt-0.5">Used for the live clock on your dashboard</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-sage-500 mb-1">Bio</label>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            rows={3}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-sage-500 mb-1">Gender</label>
          <input value={form.gender} onChange={e => set('gender', e.target.value)} className={inputCls} />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Password change */}
      <div className="border-t border-sage-100 pt-6">
        <h3 className="text-sm font-semibold text-sage-700 mb-3">Change password</h3>
        <div className="flex gap-2">
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="New password"
            className="flex-1 border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          <button
            onClick={handlePasswordChange}
            className="px-4 py-2 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors"
          >
            Update
          </button>
        </div>
      </div>

      {/* Flash message */}
      {message && (
        <div className={`mt-6 text-sm rounded-lg px-4 py-3 border
          ${message.ok
            ? 'bg-sage-50 border-sage-200 text-sage-700'
            : 'bg-red-50 border-red-200 text-red-700'}`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
