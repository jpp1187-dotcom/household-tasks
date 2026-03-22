import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, CheckSquare, List, Activity, Users,
  Plus, ChevronDown, ChevronRight, LogOut, X, Calendar,
  Star, MessageSquare, Search,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { DOMAIN_CONFIG } from './ProjectListView'
import { getFavorites, removeFavorite, addFavorite } from '../lib/favorites'

function SidebarAvatar({ name }) {
  const initials = (name ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const hue = (name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ backgroundColor: `hsl(${hue}, 45%, 48%)` }}
    >
      {initials}
    </div>
  )
}

export default function Sidebar({
  activeView, activeListId, activeHouseholdId, activeProjectId, activeResidentId, activeDomain,
  navigate, onAddList, onClose,
}) {
  const { currentUser, signOut, isAdmin } = useAuth()
  const { lists, tasks } = useTasks()
  const { households, residents } = useHouseholds()

  const [listsOpen, setListsOpen] = useState(true)
  const [projectListsOpen, setProjectListsOpen] = useState(true)
  const [favorites, setFavorites] = useState([])
  const [showPinSearch, setShowPinSearch] = useState(false)
  const [pinSearch, setPinSearch] = useState('')

  // Load favorites on mount / user change
  useEffect(() => {
    if (!currentUser?.id) return
    getFavorites(currentUser.id).then(setFavorites)
  }, [currentUser?.id])

  async function handleUnpin(entityType, entityId) {
    await removeFavorite(currentUser.id, entityType, entityId)
    setFavorites(prev => prev.filter(f => !(f.entity_type === entityType && f.entity_id === entityId)))
  }

  async function handlePin(entityType, entityId) {
    await addFavorite(currentUser.id, entityType, entityId)
    setFavorites(prev => {
      const exists = prev.some(f => f.entity_type === entityType && f.entity_id === entityId)
      if (exists) return prev
      return [...prev, { entity_type: entityType, entity_id: entityId }]
    })
    setShowPinSearch(false)
    setPinSearch('')
  }

  function openTaskCount(listId) {
    return tasks.filter(t => t.listId === listId && t.status !== 'done' && !t.archived).length
  }

  function navClass(active) {
    return `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors
      ${active ? 'bg-sage-100 text-sage-800' : 'text-sage-600 hover:bg-sage-50'}`
  }

  const personalLists = lists.filter(l => !l.householdId && !l.archived)

  // Build favorite items for display
  const favItems = favorites.map(f => {
    if (f.entity_type === 'resident') {
      const r = residents.find(x => x.id === f.entity_id)
      return r ? { ...f, label: r.preferredName || r.legalName, emoji: '👤', householdId: r.householdId } : null
    }
    if (f.entity_type === 'household') {
      const h = households.find(x => x.id === f.entity_id)
      return h ? { ...f, label: h.name, emoji: '🏠' } : null
    }
    return null
  }).filter(Boolean)

  // Pin search results
  const pinQuery = pinSearch.toLowerCase().trim()
  const pinResults = pinQuery ? [
    ...households.filter(h => !h.archived && h.name.toLowerCase().includes(pinQuery))
      .map(h => ({ type: 'household', id: h.id, label: h.name, emoji: '🏠' })),
    ...residents.filter(r => !r.archived && (r.legalName.toLowerCase().includes(pinQuery) || (r.preferredName && r.preferredName.toLowerCase().includes(pinQuery))))
      .map(r => ({ type: 'resident', id: r.id, label: r.preferredName || r.legalName, emoji: '👤' })),
  ].slice(0, 6) : []

  return (
    <aside className="w-64 bg-white border-r border-sage-100 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 pt-7 pb-4 flex items-center gap-2.5">
        <img
          src="https://dhwcawykduzxtohollmx.supabase.co/storage/v1/object/public/avatars/gormy.png"
          alt="GormBase"
          className="h-7 w-auto"
        />
        <div className="flex-1">
          <h1 className="font-display text-xl text-sage-800 leading-tight">GormBase</h1>
          <p className="text-xs text-sage-400 leading-tight">Your household, organized.</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-sage-400 hover:text-sage-600 transition-colors -mr-1" aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 overflow-y-auto pb-2">

        {/* ── General ─────────────────────────────── */}
        <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-1 mt-2">General</p>

        <button onClick={() => navigate('dashboard')} className={navClass(activeView === 'dashboard')}>
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </button>

        <button onClick={() => navigate('my-tasks')} className={navClass(activeView === 'my-tasks')}>
          <CheckSquare size={16} />
          <span>My Tasks</span>
        </button>

        <button onClick={() => navigate('calendar')} className={navClass(activeView === 'calendar')}>
          <Calendar size={16} />
          <span>Calendar</span>
        </button>

        {/* Personal Lists — collapsible */}
        <button
          onClick={() => setListsOpen(v => !v)}
          className={navClass(activeView === 'personal-list')}
        >
          <List size={16} />
          <span className="flex-1 text-left">Personal Lists</span>
          {listsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {listsOpen && (
          <div className="ml-6 mb-1">
            {personalLists.map(list => {
              const open = openTaskCount(list.id)
              return (
                <button
                  key={list.id}
                  onClick={() => navigate('personal-list', { listId: list.id })}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors
                    ${activeView === 'personal-list' && activeListId === list.id
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
              <button onClick={onAddList}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-sage-400 hover:text-sage-600 hover:bg-sage-50 transition-colors">
                <Plus size={13} />
                <span>New list</span>
              </button>
            )}
          </div>
        )}

        {/* ── Favorites ────────────────────────────── */}
        <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-1 mt-4">
          <span className="flex items-center gap-1"><Star size={11} /> Favorites</span>
        </p>

        {favItems.map(f => (
          <div key={`${f.entity_type}-${f.entity_id}`} className="flex items-center gap-1 mb-0.5 group">
            <button
              onClick={() => {
                if (f.entity_type === 'resident') {
                  navigate('resident', { residentId: f.entity_id, householdId: f.householdId })
                } else {
                  navigate('household', { householdId: f.entity_id })
                }
              }}
              className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-sage-600 hover:bg-sage-50 transition-colors"
            >
              <span>{f.emoji}</span>
              <span className="flex-1 truncate">{f.label}</span>
            </button>
            <button
              onClick={() => handleUnpin(f.entity_type, f.entity_id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-sage-300 hover:text-sage-500 transition-all mr-1 shrink-0"
              title="Unpin"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        {/* Pin search */}
        {showPinSearch ? (
          <div className="px-1 mb-2">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
              <input
                autoFocus
                value={pinSearch}
                onChange={e => setPinSearch(e.target.value)}
                placeholder="Search to pin…"
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300"
              />
            </div>
            {pinResults.length > 0 && (
              <div className="mt-1 bg-white border border-sage-200 rounded-lg shadow-sm py-1">
                {pinResults.map(r => (
                  <button key={`${r.type}-${r.id}`} onClick={() => handlePin(r.type, r.id)}
                    className="w-full text-left px-3 py-1.5 text-xs text-sage-700 hover:bg-sage-50 flex items-center gap-2">
                    <span>{r.emoji}</span>
                    <span className="truncate">{r.label}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => { setShowPinSearch(false); setPinSearch('') }}
              className="text-xs text-sage-400 hover:text-sage-600 px-2 mt-1">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setShowPinSearch(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-sage-400 hover:text-sage-600 hover:bg-sage-50 transition-colors mb-1"
          >
            <Plus size={11} />
            <span>Pin a resident or household</span>
          </button>
        )}

        {/* ── Project Lists ────────────────────────── */}
        <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-1 mt-4">Project Lists</p>

        <button
          onClick={() => setProjectListsOpen(v => !v)}
          className="w-full flex items-center gap-3 px-3 py-1 rounded-lg text-sm text-sage-500 hover:bg-sage-50 transition-colors mb-0.5"
        >
          <span className="flex-1 text-left text-xs text-sage-400">By domain</span>
          {projectListsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {projectListsOpen && (
          <div className="ml-2 mb-1">
            {Object.entries(DOMAIN_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => navigate('project-list', { domain: key })}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors
                  ${activeView === 'project-list' && activeDomain === key
                    ? 'bg-sage-100 text-sage-800 font-medium'
                    : 'text-sage-500 hover:bg-sage-50'}`}
              >
                <span className="text-sm leading-none">{cfg.icon}</span>
                <span className="truncate">{cfg.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── More ──────────────────────────────────── */}
        <div className="mt-4">
          <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-1">More</p>
          <button onClick={() => navigate('messages')} className={navClass(activeView === 'messages')}>
            <MessageSquare size={16} />
            <span>Messages</span>
          </button>
          <button onClick={() => navigate('teams')} className={navClass(activeView === 'teams')}>
            <Users size={16} />
            <span>Teams</span>
          </button>
          <button onClick={() => navigate('activity')} className={navClass(activeView === 'activity')}>
            <Activity size={16} />
            <span>Activity</span>
          </button>
        </div>
      </nav>

      {/* ── Bottom: user profile link ────────────── */}
      <div className="px-3 pb-5 pt-3 border-t border-sage-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('profile')}
            className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg min-w-0 transition-colors
              ${activeView === 'profile' ? 'bg-sage-100' : 'hover:bg-sage-50'}`}
          >
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <SidebarAvatar name={currentUser?.name ?? currentUser?.email} />
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-sage-700 leading-tight truncate">
                {currentUser?.name ?? currentUser?.email}
              </p>
              <p className="text-xs text-sage-400 capitalize">{currentUser?.role}</p>
            </div>
          </button>
          <button onClick={signOut} title="Sign out" className="text-sage-300 hover:text-sage-600 transition-colors p-1 shrink-0">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
