import React, { useState } from 'react'
import { X, UserPlus, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { useAuth } from '../contexts/AuthContext'

const ALL_ROLES = ['admin', 'member', 'cleaner', 'chef', 'travel_agent']

function InitialsAvatar({ name, size = 'md' }) {
  const initials = (name ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm'
  const hue = (name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: `hsl(${hue}, 45%, 48%)` }}
    >
      {initials}
    </div>
  )
}

function RoleEditor({ user, onSaved }) {
  const [roles, setRoles] = useState(user.roles ?? ['member'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggle(role) {
    setRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function save() {
    if (roles.length === 0) { setError('At least one role required.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({ roles })
      .eq('id', user.id)
    setSaving(false)
    if (err) setError(err.message)
    else onSaved(user.id, roles)
  }

  return (
    <div className="mt-3 bg-sage-50 rounded-lg p-3 border border-sage-200">
      <p className="text-xs font-semibold text-sage-500 mb-2">Edit roles</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {ALL_ROLES.map(r => (
          <label key={r} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={roles.includes(r)}
              onChange={() => toggle(r)}
              className="accent-sage-600"
            />
            <span className="text-xs text-sage-700 capitalize">{r.replace('_', ' ')}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button
        onClick={save}
        disabled={saving}
        className="px-3 py-1 text-xs font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

function InviteModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null) // { text, ok }

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    if (!supabaseAdmin) {
      setResult({ text: 'Admin client not configured. Add VITE_SUPABASE_SERVICE_KEY to .env.local', ok: false })
      return
    }
    setSending(true)
    setResult(null)
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email.trim())
    setSending(false)
    if (error) setResult({ text: 'Error: ' + error.message, ok: false })
    else setResult({ text: `Invite sent to ${email}!`, ok: true })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg text-sage-800">Invite team member</h2>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Email address</label>
            <div className="flex items-center gap-2 border border-sage-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-sage-300">
              <Mail size={14} className="text-sage-400 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 text-sm text-sage-800 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {result && (
            <p className={`text-xs rounded-lg px-3 py-2 border
              ${result.ok
                ? 'bg-sage-50 border-sage-200 text-sage-700'
                : 'bg-red-50 border-red-200 text-red-700'}`}
            >
              {result.text}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-40 transition-colors"
            >
              {sending ? 'Sending…' : 'Send invite'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-sage-500 hover:text-sage-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserDirectory() {
  const { currentUser, allUsers, isAdmin } = useAuth()
  const [editingUserId, setEditingUserId] = useState(null)
  const [localUsers, setLocalUsers] = useState(allUsers)
  const [showInvite, setShowInvite] = useState(false)

  React.useEffect(() => { setLocalUsers(allUsers) }, [allUsers])

  function handleRolesSaved(userId, newRoles) {
    setLocalUsers(prev =>
      prev.map(u => u.id === userId
        ? { ...u, roles: newRoles, role: newRoles[0] ?? 'member' }
        : u
      )
    )
    setEditingUserId(null)
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Team</h2>
          <p className="text-xs text-sage-400 mt-1">
            {localUsers.length} member{localUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin() && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm"
          >
            <UserPlus size={15} />
            Invite user
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {localUsers.map(u => {
          const isMe = u.id === currentUser?.id
          const editing = editingUserId === u.id

          return (
            <div
              key={u.id}
              className={`bg-white rounded-xl border shadow-sm p-5
                ${isMe ? 'border-sage-300' : 'border-sage-100'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : u.avatar && u.avatar !== '🧑' ? (
                  <span className="text-3xl shrink-0 leading-none">{u.avatar}</span>
                ) : (
                  <InitialsAvatar name={u.name} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sage-800 truncate">
                    {u.name ?? u.email}
                    {isMe && <span className="ml-1.5 text-xs text-sage-400 font-normal">(you)</span>}
                  </p>
                  {u.email && (
                    <p className="text-xs text-sage-400 truncate">{u.email}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {(u.roles ?? [u.role]).map(r => (
                  <span
                    key={r}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize
                      ${r === 'admin' ? 'bg-clay-100 text-clay-700' : 'bg-sage-100 text-sage-600'}`}
                  >
                    {r.replace('_', ' ')}
                  </span>
                ))}
              </div>

              {u.bio && (
                <p className="text-xs text-sage-500 mb-3 line-clamp-2">{u.bio}</p>
              )}

              {isAdmin() && (
                <button
                  onClick={() => setEditingUserId(editing ? null : u.id)}
                  className="text-xs text-sage-400 hover:text-sage-700 underline transition-colors"
                >
                  {editing ? 'Cancel' : 'Edit roles'}
                </button>
              )}

              {editing && (
                <RoleEditor user={u} onSaved={handleRolesSaved} />
              )}
            </div>
          )
        })}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
