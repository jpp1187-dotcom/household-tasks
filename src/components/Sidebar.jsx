import React, { useState } from 'react'
import {
  Home, CheckSquare, Calendar, MessageSquare,
  LogOut, X, Plus,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'

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
  activeView, activeListId,
  navigate, onClose,
  unreadCount = 0,
}) {
  const { currentUser, signOut } = useAuth()
  const { lists, addList } = useTasks()

  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListIcon, setNewListIcon] = useState('📋')
  const [savingList,  setSavingList]  = useState(false)

  const activeLists = lists.filter(l => !l.archived)

  async function handleCreateList(e) {
    e?.preventDefault()
    if (!newListName.trim() || savingList) return
    setSavingList(true)
    try {
      const created = await addList({ name: newListName.trim(), icon: newListIcon })
      setNewListName('')
      setNewListIcon('📋')
      setShowNewList(false)
      if (created?.id) navigate('list', { listId: created.id })
    } finally {
      setSavingList(false)
    }
  }

  function navClass(active) {
    return `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors
      ${active ? 'bg-sage-100 text-sage-800' : 'text-sage-600 hover:bg-sage-50'}`
  }

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
          <button onClick={onClose} className="md:hidden text-sage-400 hover:text-sage-600 transition-colors -mr-1">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 overflow-y-auto pb-2">

        {/* ── General ────────────────────────────── */}
        <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-1 mt-2">General</p>

        <button onClick={() => navigate('home')} className={navClass(activeView === 'home' || activeView === 'dashboard')}>
          <Home size={16} />
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

        <button onClick={() => navigate('messages')} className={navClass(activeView === 'messages')}>
          <MessageSquare size={16} />
          <span className="flex-1 text-left">Messages</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* ── Lists ────────────────────────────── */}
        <div className="flex items-center justify-between px-3 mb-1 mt-4">
          <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest">Lists</p>
          <button
            onClick={() => setShowNewList(v => !v)}
            className="text-sage-400 hover:text-sage-600 transition-colors"
            title="New list"
          >
            <Plus size={13} />
          </button>
        </div>

        {activeLists.map(list => (
          <button
            key={list.id}
            onClick={() => navigate('list', { listId: list.id })}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors
              ${activeView === 'list' && activeListId === list.id
                ? 'bg-sage-100 text-sage-800 font-medium'
                : 'text-sage-500 hover:bg-sage-50'}`}
          >
            <span className="text-sm leading-none">{list.icon}</span>
            <span className="truncate">{list.name}</span>
          </button>
        ))}

        {/* New list inline form */}
        {showNewList && (
          <form onSubmit={handleCreateList} className="px-1 mb-2 mt-1">
            <div className="flex gap-1.5 items-center mb-1.5">
              <input
                value={newListIcon}
                onChange={e => setNewListIcon(e.target.value)}
                className="w-10 text-center border border-sage-200 rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
                maxLength={2}
                placeholder="📋"
              />
              <input
                autoFocus
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="List name…"
                className="flex-1 border border-sage-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sage-300"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={!newListName.trim() || savingList}
                className="px-3 py-1 text-xs font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-40"
              >
                {savingList ? 'Adding…' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewList(false); setNewListName(''); setNewListIcon('📋') }}
                className="text-xs text-sage-400 hover:text-sage-600 px-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ── More ────────────────────────────── */}
        <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-1 mt-4">More</p>

        <button onClick={() => navigate('puzzles')} className={navClass(activeView === 'puzzles')}>
          <span className="text-base leading-none w-4 text-center">🧩</span>
          <span>Puzzles</span>
        </button>

        <button onClick={() => navigate('shared-notes')} className={navClass(activeView === 'shared-notes')}>
          <span className="text-base leading-none w-4 text-center">📝</span>
          <span>Shared Notes</span>
        </button>

        <button onClick={() => navigate('finances')} className={navClass(activeView === 'finances')}>
          <span className="text-base leading-none w-4 text-center">💰</span>
          <span>Finances</span>
        </button>

      </nav>

      {/* ── Bottom: user profile + sign out ────────────── */}
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
