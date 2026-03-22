import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function ProfilePage() {
  const { currentUser, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    name:   currentUser?.name   ?? '',
    bio:    currentUser?.bio    ?? '',
    gender: currentUser?.gender ?? '',
  })
  const [newPassword, setNewPassword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null) // { text, ok }

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
      .update({ name: form.name, bio: form.bio, gender: form.gender })
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
      .upload(path, file, { upsert: true })
    if (uploadErr) {
      flash('Upload error: ' + uploadErr.message, false)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', currentUser.id)
    await refreshProfile()
    setUploading(false)
    flash('Photo updated!')
  }

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
          <div className="w-20 h-20 rounded-full bg-sage-100 flex items-center justify-center text-4xl border-2 border-sage-100">
            {currentUser?.avatar ?? '🧑'}
          </div>
        )}
        <div>
          <label className="cursor-pointer px-4 py-2 text-sm font-medium bg-sage-100 hover:bg-sage-200 text-sage-700 rounded-lg transition-colors">
            {uploading ? 'Uploading…' : 'Change photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          <p className="text-xs text-sage-400 mt-1.5">Stored in Supabase Storage "avatars" bucket</p>
        </div>
      </div>

      {/* Role badges */}
      <div className="flex flex-wrap gap-2 mb-8">
        {currentUser?.roles?.map(r => (
          <span
            key={r}
            className="px-3 py-1 bg-sage-100 text-sage-700 text-xs font-semibold rounded-full capitalize"
          >
            {r}
          </span>
        ))}
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="space-y-4 mb-8">
        <div>
          <label className="block text-xs font-semibold text-sage-500 mb-1">Display name</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-sage-500 mb-1">Email</label>
          <input
            value={currentUser?.email ?? ''}
            disabled
            className="w-full border border-sage-100 rounded-lg px-3 py-2 text-sm text-sage-400 bg-sage-50"
          />
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
          <input
            value={form.gender}
            onChange={e => set('gender', e.target.value)}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
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
