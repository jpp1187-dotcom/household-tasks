import React, { useState, useEffect } from 'react'
import { Plus, X, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * TeamsPage — create teams and add/remove GormBase users.
 *
 * Required SQL:
 * CREATE TABLE IF NOT EXISTS teams (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name text NOT NULL,
 *   created_by uuid REFERENCES auth.users(id),
 *   created_at timestamptz DEFAULT now()
 * );
 * CREATE TABLE IF NOT EXISTS team_members (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
 *   user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 *   role text DEFAULT 'member',
 *   created_at timestamptz DEFAULT now(),
 *   UNIQUE(team_id, user_id)
 * );
 */

function SidebarAvatar({ name, size = 8 }) {
  const initials = (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = (name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0`}
      style={{ backgroundColor: `hsl(${hue}, 45%, 48%)` }}
    >
      {initials}
    </div>
  )
}

export default function TeamsPage() {
  const { currentUser, allUsers, isAdmin } = useAuth()
  const [teams, setTeams]     = useState([])
  const [members, setMembers] = useState([]) // flat list of {team_id, user_id, role}
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [addMemberTeamId, setAddMemberTeamId] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('teams').select('*').order('created_at', { ascending: true }),
      supabase.from('team_members').select('*'),
    ]).then(([tRes, mRes]) => {
      if (tRes.error) {
        if (tRes.error.code === '42P01' || tRes.error.message?.includes('does not exist')) {
          setDbError('Teams tables not found. Run the teams SQL migration to enable teams.')
        } else {
          setDbError(tRes.error.message)
        }
      } else {
        setTeams(tRes.data ?? [])
        setMembers(mRes.data ?? [])
      }
      setLoading(false)
    })
  }, [])

  async function createTeam(e) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    const { data, error } = await supabase.from('teams').insert({
      name: newTeamName.trim(), created_by: currentUser?.id,
    }).select().single()
    if (error) { alert(error.message); return }
    setTeams(prev => [...prev, data])
    setNewTeamName('')
    setShowCreate(false)
  }

  async function addMember(teamId, userId) {
    const { data, error } = await supabase.from('team_members')
      .upsert({ team_id: teamId, user_id: userId }, { onConflict: 'team_id,user_id' })
      .select()
    if (error) { alert(error.message); return }
    if (data?.[0]) setMembers(prev => [...prev.filter(m => !(m.team_id === teamId && m.user_id === userId)), data[0]])
    setAddMemberTeamId(null)
  }

  async function removeMember(teamId, userId) {
    const { error } = await supabase.from('team_members')
      .delete().eq('team_id', teamId).eq('user_id', userId)
    if (error) { alert(error.message); return }
    setMembers(prev => prev.filter(m => !(m.team_id === teamId && m.user_id === userId)))
  }

  if (loading) return <div className="p-8 text-sage-400 text-sm">Loading…</div>

  if (dbError) {
    return (
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
        <h2 className="font-display text-2xl text-sage-800 mb-4">Teams</h2>
        <div className="bg-clay-50 border border-clay-200 rounded-xl p-5 text-sm text-clay-700 max-w-lg">
          <p className="font-semibold mb-2">⚠️ Setup required</p>
          <p className="mb-3">{dbError}</p>
          <pre className="bg-white border border-clay-200 rounded-lg p-3 text-xs overflow-x-auto text-sage-700">{`CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);`}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Teams</h2>
          <p className="text-xs text-sage-400 mt-1">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin() && (
          <button onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm">
            <Plus size={16} /> New Team
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={createTeam} className="bg-white border-2 border-sage-200 rounded-xl p-4 mb-6 max-w-md flex gap-2">
          <input autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
            placeholder="Team name…"
            className="flex-1 text-sm border border-sage-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-300" />
          <button type="submit" className="px-4 py-2 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700">Create</button>
          <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm text-sage-400 hover:text-sage-600">✕</button>
        </form>
      )}

      {teams.length === 0 ? (
        <div className="text-center py-20 text-sage-300">
          <Users size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No teams yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
          {teams.map(team => {
            const teamMembers = members.filter(m => m.team_id === team.id)
            const teamUsers = teamMembers.map(m => allUsers.find(u => u.id === m.user_id)).filter(Boolean)
            const nonMembers = allUsers.filter(u => !teamMembers.some(m => m.user_id === u.id))

            return (
              <div key={team.id} className="bg-white rounded-xl border border-sage-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sage-800">{team.name}</h3>
                  <span className="text-xs text-sage-400">{teamUsers.length} member{teamUsers.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2 mb-3">
                  {teamUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-2">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                        : <SidebarAvatar name={u.name ?? u.email} />
                      }
                      <span className="text-sm text-sage-700 flex-1 truncate">{u.name ?? u.email}</span>
                      <span className="text-xs text-sage-400 capitalize">{u.role}</span>
                      {isAdmin() && (
                        <button onClick={() => removeMember(team.id, u.id)}
                          className="text-sage-200 hover:text-red-400 transition-colors">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isAdmin() && nonMembers.length > 0 && (
                  addMemberTeamId === team.id ? (
                    <div className="space-y-1">
                      {nonMembers.map(u => (
                        <button key={u.id} onClick={() => addMember(team.id, u.id)}
                          className="w-full text-left text-xs px-3 py-1.5 rounded-lg text-sage-600 hover:bg-sage-50 transition-colors flex items-center gap-2">
                          <Plus size={11} /> {u.name ?? u.email}
                        </button>
                      ))}
                      <button onClick={() => setAddMemberTeamId(null)}
                        className="text-xs text-sage-400 hover:text-sage-600 px-3">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setAddMemberTeamId(team.id)}
                      className="text-xs text-sage-400 hover:text-sage-600 flex items-center gap-1 transition-colors">
                      <Plus size={11} /> Add member
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
