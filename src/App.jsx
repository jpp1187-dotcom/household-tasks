import React, { useState, useEffect, useRef } from 'react'
import { Menu, Plus, Bell, Home } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TaskProvider, useTasks } from './contexts/TaskContext'
import Sidebar from './components/Sidebar'
import HomePage from './components/HomePage'
import MyTasks from './components/MyTasks'
import CalendarPage from './components/CalendarPage'
import MessagesPage from './components/MessagesPage'
import ProfilePage from './components/ProfilePage'
import GlobalSearch from './components/GlobalSearch'
import QuickTaskModal from './components/QuickTaskModal'
import NewListModal from './components/NewListModal'
import ListPage from './components/ListPage'
import SharedNotesPage from './components/SharedNotesPage'
import FinancesPage from './components/FinancesPage'
import PuzzlesPage from './components/PuzzlesPage'
import LoginPage from './components/LoginPage'
import { supabase } from './lib/supabase'

const GORMY = 'https://dhwcawykduzxtohollmx.supabase.co/storage/v1/object/public/avatars/gormy.png'

// ── Bell notification component ───────────────────────────────────────────────
function BellIcon({ onNavigate }) {
  const { currentUser } = useAuth()
  const [unread, setUnread] = useState(0)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!currentUser?.id) return

    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', currentUser.id)
      .eq('read', false)
      .then(({ count }) => setUnread(count ?? 0))
      .catch(() => {})

    channelRef.current = supabase.channel('bell-messages-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `recipient_id=eq.${currentUser.id}`,
      }, () => {
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', currentUser.id)
          .eq('read', false)
          .then(({ count }) => setUnread(count ?? 0))
          .catch(() => {})
      })
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [currentUser?.id])

  return (
    <button
      onClick={() => onNavigate('messages')}
      className="relative p-2 text-sage-400 hover:text-sage-700 transition-colors shrink-0"
      title="Messages"
    >
      <Bell size={20} />
      {unread > 0 && (
        <span
          className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center"
          style={{ minWidth: 16, height: 16, fontSize: 10, padding: '0 3px' }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}

// ── User avatar button ────────────────────────────────────────────────────────
function UserAvatarBtn({ onNavigate }) {
  const { currentUser } = useAuth()
  const name = currentUser?.name ?? currentUser?.email ?? '?'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <button
      onClick={() => onNavigate('profile')}
      title="Profile"
      className="shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-sage-100 hover:border-sage-300 transition-colors"
    >
      {currentUser?.avatar_url ? (
        <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-xs font-semibold text-white"
          style={{ backgroundColor: `hsl(${hue}, 45%, 48%)`, fontSize: 11 }}
        >
          {initials}
        </div>
      )}
    </button>
  )
}

// ── Dashboard header (full-screen mode, no sidebar) ───────────────────────────
function DashboardHeader({ navigate, onNewList, onNewTask }) {
  return (
    <>
      {/* Main bar */}
      <div className="shrink-0 bg-white border-b border-sage-100 h-14 flex items-center gap-3 px-4 md:px-6">
        <img src={GORMY} alt="GormBase" className="h-7 w-auto shrink-0" />
        <span className="font-display text-lg text-sage-800 shrink-0 hidden sm:block">GormBase</span>
        <div className="flex-1 hidden md:flex justify-center">
          <div className="w-full max-w-md">
            <GlobalSearch navigate={navigate} />
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={onNewList}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sage-700 border border-sage-200 rounded-lg hover:bg-sage-50 transition-colors shrink-0"
          >
            <Plus size={13} /> List
          </button>
          <button
            onClick={onNewTask}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors shrink-0"
          >
            <Plus size={13} /> Task
          </button>
          <BellIcon onNavigate={navigate} />
          <UserAvatarBtn onNavigate={navigate} />
        </div>
      </div>
      {/* Mobile search bar */}
      <div className="md:hidden px-4 py-2 bg-white border-b border-sage-50">
        <GlobalSearch navigate={navigate} />
      </div>
    </>
  )
}

// ── Inner app ─────────────────────────────────────────────────────────────────
function AppMain() {
  const { lists } = useTasks()

  const [activeView,   setActiveView]   = useState('home')
  const [activeListId, setActiveListId] = useState(null)
  const [showQuickTask, setShowQuickTask] = useState(false)
  const [showNewList,   setShowNewList]   = useState(false)
  const [sidebarOpen,   setSidebarOpen]   = useState(false)

  function navigate(view, params = {}) {
    setActiveView(view)
    if (params.listId !== undefined) setActiveListId(params.listId)
    setSidebarOpen(false)
  }

  const activeList = lists.find(l => l.id === activeListId)
  const isDashboard = activeView === 'home' || activeView === 'dashboard'

  function pageTitle() {
    switch (activeView) {
      case 'my-tasks':     return 'My Tasks'
      case 'calendar':     return 'Calendar'
      case 'messages':     return 'Messages'
      case 'list':         return activeList ? `${activeList.icon} ${activeList.name}` : 'List'
      case 'shared-notes': return 'Shared Notes'
      case 'finances':     return 'Finances'
      case 'puzzles':      return 'Puzzles'
      case 'profile':      return 'Profile'
      default:             return 'GormBase'
    }
  }

  function renderMain() {
    switch (activeView) {
      case 'home':
      case 'dashboard':
        return <HomePage navigate={navigate} />
      case 'my-tasks':
        return <MyTasks />
      case 'calendar':
        return <CalendarPage />
      case 'messages':
        return <MessagesPage />
      case 'list':
        return activeList
          ? <ListPage listId={activeListId} listName={activeList.name} listIcon={activeList.icon} listColor={activeList.color ?? '#4a7c4a'} key={activeListId} />
          : <HomePage navigate={navigate} />
      case 'shared-notes':
        return <SharedNotesPage />
      case 'finances':
        return <FinancesPage />
      case 'puzzles':
        return <PuzzlesPage />
      case 'profile':
        return <ProfilePage />
      default:
        return <HomePage navigate={navigate} />
    }
  }

  const modals = (
    <>
      {showQuickTask && <QuickTaskModal onClose={() => setShowQuickTask(false)} />}
      {showNewList   && <NewListModal   onClose={() => setShowNewList(false)} navigate={navigate} />}
    </>
  )

  // ── Dashboard: full-screen, no sidebar ──────────────────────────────────────
  if (isDashboard) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-sage-50">
        <DashboardHeader
          navigate={navigate}
          onNewList={() => setShowNewList(true)}
          onNewTask={() => setShowQuickTask(true)}
        />
        <div className="flex-1 overflow-hidden">
          <HomePage navigate={navigate} />
        </div>
        {modals}
      </div>
    )
  }

  // ── App layout: sidebar + top bar + content ──────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-sage-50">

      {/* ── Mobile top navbar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-sage-100 flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-sage-500 hover:text-sage-800 transition-colors p-1 -ml-1"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <button
          onClick={() => navigate('home')}
          className="text-sage-400 hover:text-sage-700 transition-colors shrink-0"
          title="Dashboard"
        >
          <Home size={16} />
        </button>
        <span className="font-display text-base text-sage-800 flex-1 truncate">{pageTitle()}</span>
        <BellIcon onNavigate={navigate} />
        <button
          onClick={() => setShowQuickTask(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors shrink-0"
        >
          <Plus size={14} />
          Task
        </button>
      </div>

      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          activeView={activeView}
          activeListId={activeListId}
          navigate={navigate}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pt-14 md:pt-0">
        {/* Desktop top bar */}
        <div className="hidden md:flex items-center gap-3 px-6 h-14 border-b border-sage-100 bg-white shrink-0">
          <button
            onClick={() => navigate('home')}
            className="text-sage-400 hover:text-sage-700 transition-colors shrink-0"
            title="Dashboard"
          >
            <Home size={18} />
          </button>
          <span className="text-sm font-medium text-sage-800 flex-1 truncate">{pageTitle()}</span>
          <BellIcon onNavigate={navigate} />
          <button
            onClick={() => setShowNewList(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sage-700 border border-sage-200 rounded-xl hover:bg-sage-50 transition-colors shrink-0"
          >
            <Plus size={16} />
            List
          </button>
          <button
            onClick={() => setShowQuickTask(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-sm shrink-0"
          >
            <Plus size={16} />
            New Task
          </button>
        </div>
        {renderMain()}
      </div>

      {modals}
    </div>
  )
}

// ── Auth gate ──────────────────────────────────────────────────────────────────
function AppShell() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-sage-50">
        <p className="text-sage-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (!currentUser) return <LoginPage />

  return (
    <TaskProvider>
      <AppMain />
    </TaskProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
