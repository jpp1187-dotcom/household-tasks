import React, { useState } from 'react'
import {
  LayoutDashboard, CheckSquare, List, Home, Activity, Users,
  Plus, ChevronDown, ChevronRight, LogOut, UserCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { useHouseholds } from '../contexts/HouseholdContext'

export default function Sidebar({ activeView, activeListId, activeHouseholdId, activeProjectId, activeResidentId, navigate, onAddList }) {
  const { currentUser, signOut, isAdmin } = useAuth()
  const { lists, tasks } = useTasks()
  const { households, projects, residents, addHousehold } = useHouseholds()

  const [listsOpen, setListsOpen] = useState(true)
  const [expandedHouseholds, setExpandedHouseholds] = useState(new Set())
  const [addHouseholdName, setAddHouseholdName] = useState('')
  const [showAddHousehold, setShowAddHousehold] = useState(false)
  const [addHouseholdError, setAddHouseholdError] = useState('')

  function toggleHousehold(id) {
    setExpandedHouseholds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openTaskCount(listId) {
    return tasks.filter(t => t.listId === listId && t.status !== 'done').length
  }

  async function handleAddHousehold(e) {
    e.preventDefault()
    if (!addHouseholdName.trim()) return
    setAddHouseholdError('')
    try {
      await addHousehold({ name: addHouseholdName.trim() })
      setAddHouseholdName('')
      setShowAddHousehold(false)
    } catch (err) {
      setAddHouseholdError(err.message ?? 'Failed to add household.')
    }
  }

  function navClass(active) {
    return `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors
      ${active ? 'bg-sage-100 text-sage-800' : 'text-sage-600 hover:bg-sage-50'}`
  }

  return (
    <aside className="w-64 bg-white border-r border-sage-100 flex flex-col h-full shrink-0">
      {/* Logo + App name */}
      <div className="px-6 pt-7 pb-4 flex items-center gap-2.5">
        <img src="https://dhwcawykduzxtohollmx.supabase.co/storage/v1/object/public/avatars/gormy.png" alt="GormBase" className="h-7 w-auto" />
        <div>
          <h1 className="font-display text-xl text-sage-800 leading-tight">GormBase</h1>
          <p className="text-xs text-sage-400 leading-tight">Your household, organized.</p>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto pb-2">
        {/* ── General ───────────────────────────────── */}
        <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-1 mt-2">
          General
        </p>

        <button onClick={() => navigate('dashboard')} className={navClass(activeView === 'dashboard')}>
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </button>

        <button onClick={() => navigate('my-tasks')} className={navClass(activeView === 'my-tasks')}>
          <CheckSquare size={16} />
          <span>My Tasks</span>
        </button>

        {/* Quick Lists — collapsible */}
        <button
          onClick={() => setListsOpen(v => !v)}
          className={navClass(activeView === 'quick-list')}
        >
          <List size={16} />
          <span className="flex-1 text-left">Quick Lists</span>
          {listsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {listsOpen && (
          <div className="ml-6 mb-1">
            {lists.map(list => {
              const open = openTaskCount(list.id)
              return (
                <button
                  key={list.id}
                  onClick={() => navigate('quick-list', { listId: list.id })}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors
                    ${activeView === 'quick-list' && activeListId === list.id
                      ? 'bg-sage-100 text-sage-800 font-medium'
                      : 'text-sage-500 hover:bg-sage-50'}`}
                >
                  <span className="text-base leading-none">{list.icon}</span>
                  <span className="flex-1 text-left truncate">{list.name}</span>
                  {open > 0 && (
                    <span className="text-xs bg-sage-200 text-sage-700 rounded-full px-1.5 py-0.5">{open}</span>
                  )}
                </button>
              )
            })}
            {isAdmin() && (
              <button
                onClick={onAddList}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-sage-400 hover:text-sage-600 hover:bg-sage-50 transition-colors"
              >
                <Plus size={13} />
                <span>New list</span>
              </button>
            )}
          </div>
        )}

        {/* ── Households ────────────────────────────── */}
        <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-1 mt-4">
          Households
        </p>

        {households.map(h => {
          const hExpanded = expandedHouseholds.has(h.id)
          const hProjects = projects.filter(p => p.householdId === h.id)
          return (
            <div key={h.id}>
              <div className="flex items-center mb-0.5">
                <button
                  onClick={() => navigate('household', { householdId: h.id })}
                  className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-l-lg text-sm font-medium transition-colors
                    ${activeView === 'household' && activeHouseholdId === h.id
                      ? 'bg-sage-100 text-sage-800'
                      : 'text-sage-600 hover:bg-sage-50'}`}
                >
                  <Home size={15} />
                  <span className="flex-1 text-left truncate">{h.name}</span>
                </button>
                <button
                  onClick={() => toggleHousehold(h.id)}
                  className="px-2 py-2 text-sage-400 hover:text-sage-600 hover:bg-sage-50 rounded-r-lg transition-colors"
                  title={hExpanded ? 'Collapse' : 'Expand projects'}
                >
                  {hExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>

              {/* Sub-links: Residents + Projects */}
              {hExpanded && (
                <div className="ml-8 mb-1">
                  {/* Residents link */}
                  <button
                    onClick={() => navigate('household', { householdId: h.id, tab: 'residents' })}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs mb-0.5 transition-colors
                      ${activeView === 'household' && activeHouseholdId === h.id
                        ? 'text-sage-600 hover:bg-sage-50'
                        : 'text-sage-500 hover:bg-sage-50'}`}
                  >
                    <UserCircle size={12} className="text-sage-400" />
                    <span className="truncate">
                      Residents ({residents.filter(r => r.householdId === h.id).length})
                    </span>
                  </button>

                  {/* Project list */}
                  {hProjects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => navigate('project', { projectId: p.id, householdId: h.id })}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs mb-0.5 transition-colors
                        ${activeView === 'project' && activeProjectId === p.id
                          ? 'bg-sage-100 text-sage-800 font-medium'
                          : 'text-sage-500 hover:bg-sage-50'}`}
                    >
                      <span className="text-sage-400">📋</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Add household */}
        {isAdmin() && !showAddHousehold && (
          <button
            onClick={() => setShowAddHousehold(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sage-400 hover:text-sage-600 hover:bg-sage-50 transition-colors mt-0.5"
          >
            <Plus size={14} />
            <span>Add household</span>
          </button>
        )}

        {showAddHousehold && (
          <form onSubmit={handleAddHousehold} className="mt-1 px-1">
            <input
              autoFocus
              value={addHouseholdName}
              onChange={e => setAddHouseholdName(e.target.value)}
              placeholder="Household name…"
              className="w-full text-xs border border-sage-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sage-300 mb-1"
            />
            {addHouseholdError && (
              <p className="text-xs text-red-500 mb-1">{addHouseholdError}</p>
            )}
            <div className="flex gap-1">
              <button type="submit" className="flex-1 text-xs py-1 bg-sage-600 text-white rounded-lg font-semibold hover:bg-sage-700">
                Add
              </button>
              <button type="button" onClick={() => { setShowAddHousehold(false); setAddHouseholdError('') }} className="px-2 text-xs text-sage-400 hover:text-sage-600">
                ✕
              </button>
            </div>
          </form>
        )}

        {/* ── Bottom links ─────────────────────────── */}
        <div className="mt-4">
          <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-1">More</p>
          <button
            onClick={() => navigate('team')}
            className={navClass(activeView === 'team')}
          >
            <Users size={16} />
            <span>Team</span>
          </button>
          <button
            onClick={() => navigate('activity')}
            className={navClass(activeView === 'activity')}
          >
            <Activity size={16} />
            <span>Activity</span>
          </button>
        </div>
      </nav>

      {/* Signed-in user — click to go to Profile */}
      <div className="px-3 pb-5 pt-3 border-t border-sage-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('profile')}
            className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg min-w-0 transition-colors
              ${activeView === 'profile' ? 'bg-sage-100' : 'hover:bg-sage-50'}`}
          >
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <span className="text-xl shrink-0">{currentUser?.avatar ?? '🧑'}</span>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-sage-700 leading-tight truncate">
                {currentUser?.name ?? currentUser?.email}
              </p>
              <p className="text-xs text-sage-400 capitalize">{currentUser?.role}</p>
            </div>
          </button>
          <button
            onClick={signOut}
            title="Sign out"
            className="text-sage-300 hover:text-sage-600 transition-colors px-1"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
