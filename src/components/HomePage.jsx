import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { supabase } from '../lib/supabase'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function ResidentCaseCard({ resident, tasks, onClick }) {
  const residentTasks = tasks.filter(t => t.residentId === resident.id && !t.archived)
  const open = residentTasks.filter(t => t.status !== 'done')
  const overdue = open.filter(t => t.dueDate && t.dueDate < today())

  const words = (resident.legalName ?? '').trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] ?? '').toUpperCase() + (words[words.length - 1][0] ?? '').toUpperCase()
    : (words[0]?.[0] ?? '?').toUpperCase()

  const hue = resident.legalName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full bg-white rounded-xl border border-sage-100 shadow-sm px-4 py-3 hover:shadow-md transition-shadow text-left"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
        style={{ backgroundColor: `hsl(${hue}, 40%, 52%)` }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-sage-800 truncate">
          {resident.preferredName || resident.legalName}
        </p>
        {resident.householdName && (
          <p className="text-xs text-sage-400 truncate">{resident.householdName}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-sage-700">{open.length}</p>
        <p className="text-xs text-sage-400">open</p>
      </div>
      {overdue.length > 0 ? (
        <div className="flex items-center gap-1 shrink-0">
          <AlertCircle size={13} className="text-red-400" />
          <span className="text-xs text-red-500 font-medium">{overdue.length} overdue</span>
        </div>
      ) : open.length > 0 ? (
        <span className="text-xs text-sage-400 shrink-0">on track</span>
      ) : null}
    </button>
  )
}

function TeamMemberCard({ user }) {
  const isOnline = user.last_seen
    ? (Date.now() - new Date(user.last_seen).getTime()) < 5 * 60 * 1000
    : false

  const initials = (user.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = (user.name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative shrink-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: `hsl(${hue}, 45%, 48%)` }}
          >
            {initials}
          </div>
        )}
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-400' : 'bg-sage-200'}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sage-800 truncate">{user.name ?? user.email}</p>
        <p className="text-xs text-sage-400 capitalize">{user.role}</p>
      </div>
    </div>
  )
}

export default function HomePage({ navigate }) {
  const { currentUser, allUsers } = useAuth()
  const { tasks } = useTasks()
  const { residents, households } = useHouseholds()

  const [teamName, setTeamName] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])

  useEffect(() => {
    if (!currentUser?.id) return
    // Fetch team membership
    supabase
      .from('team_members')
      .select('team_id, teams(id, name)')
      .eq('user_id', currentUser.id)
      .limit(1)
      .then(({ data }) => {
        if (data?.length > 0) {
          const team = data[0].teams
          setTeamName(team?.name ?? null)
          // Fetch teammates
          supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', data[0].team_id)
            .then(({ data: members }) => {
              const memberIds = new Set((members ?? []).map(m => m.user_id))
              setTeamMembers(allUsers.filter(u => memberIds.has(u.id)))
            })
        } else {
          // Fallback: show all users if no team tables
          setTeamMembers(allUsers)
        }
      })
      .catch(() => {
        setTeamMembers(allUsers)
      })
  }, [currentUser?.id, allUsers])

  // My Caseload: residents with tasks I created or am assigned to
  const myTaskResidentIds = new Set(
    tasks
      .filter(t => !t.archived && (t.assignedTo === currentUser?.id || t.createdBy === currentUser?.id) && t.residentId)
      .map(t => t.residentId)
  )
  const caseloadResidents = residents
    .filter(r => !r.archived && myTaskResidentIds.has(r.id))
    .map(r => ({
      ...r,
      householdName: households.find(h => h.id === r.householdId)?.name ?? '',
    }))
    .sort((a, b) => (a.preferredName || a.legalName).localeCompare(b.preferredName || b.legalName))

  const totalOpen = tasks.filter(t => t.status !== 'done' && !t.archived).length
  const activeResidentCount = residents.filter(r => !r.archived).length

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="font-display text-2xl text-sage-800">
          {greeting()}, {currentUser?.name?.split(' ')[0] ?? 'there'} 🐕
        </h2>
        <p className="text-sm text-sage-400 mt-0.5">{formatDate()}</p>
        {teamName && <p className="text-xs text-sage-400 mt-0.5">{teamName}</p>}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-4">
          <p className="text-2xl font-bold text-sage-700">{totalOpen}</p>
          <p className="text-xs text-sage-400 mt-0.5">open tasks</p>
        </div>
        <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-4">
          <p className="text-2xl font-bold text-sage-700">{activeResidentCount}</p>
          <p className="text-xs text-sage-400 mt-0.5">residents</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* My Caseload — left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg text-sage-800">My Caseload</h3>
            <span className="text-xs text-sage-400">{caseloadResidents.length} resident{caseloadResidents.length !== 1 ? 's' : ''}</span>
          </div>

          {caseloadResidents.length === 0 ? (
            <div className="text-center py-12 text-sage-300 bg-white rounded-xl border border-sage-100">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No residents with active tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {caseloadResidents.map(r => (
                <ResidentCaseCard
                  key={r.id}
                  resident={r}
                  tasks={tasks}
                  onClick={() => navigate('resident', { residentId: r.id, householdId: r.householdId })}
                />
              ))}
            </div>
          )}
        </div>

        {/* My Team — right */}
        <div className="w-full lg:w-72 shrink-0">
          <h3 className="font-display text-lg text-sage-800 mb-3">My Team</h3>
          <div className="bg-white rounded-xl border border-sage-100 shadow-sm px-4 py-3">
            {teamMembers.length === 0 ? (
              <p className="text-xs text-sage-300 py-4 text-center">No team members found.</p>
            ) : (
              <div className="divide-y divide-sage-50">
                {teamMembers.map(u => (
                  <TeamMemberCard key={u.id} user={u} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
