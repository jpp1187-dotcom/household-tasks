import React, { useState, useEffect, useRef } from 'react'
import { Menu, Plus, Bell } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TaskProvider, useTasks } from './contexts/TaskContext'
import { HouseholdProvider, useHouseholds } from './contexts/HouseholdContext'
import Sidebar from './components/Sidebar'
import HomePage from './components/HomePage'
import MyTasks from './components/MyTasks'
import HouseholdList from './components/HouseholdList'
import HouseholdDetail from './components/HouseholdDetail'
import ResidentProfile from './components/ResidentProfile'
import ResidentListPage from './components/ResidentListPage'
import ActivityFeed from './components/ActivityFeed'
import ProfilePage from './components/ProfilePage'
import UserDirectory from './components/UserDirectory'
import AddListModal from './components/AddListModal'
import CalendarPage from './components/CalendarPage'
import TeamsPage from './components/TeamsPage'
import MessagesPage from './components/MessagesPage'
import GlobalSearch from './components/GlobalSearch'
import QuickTaskModal from './components/QuickTaskModal'
import DomainListPage from './components/DomainListPage'
import LoginPage from './components/LoginPage'
import { supabase } from './lib/supabase'
import { DOMAIN_CONFIG } from './lib/domains'

const GORMY = 'https://dhwcawykduzxtohollmx.supabase.co/storage/v1/object/public/avatars/gormy.png'

// ── All-tasks page ─────────────────────────────────────────────────────────────
function AllTasksPage() {
  const { tasks, toggleDone } = useTasks()
  const open = tasks.filter(t => t.status !== 'done' && !t.archived)
  const byDomain = {}
  open.forEach(t => {
    const key = t.domainTag || 'none'
    if (!byDomain[key]) byDomain[key] = []
    byDomain[key].push(t)
  })

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 bg-sage-50 z-10 px-4 md:px-8 pt-6 pb-4 border-b border-sage-100">
        <h2 className="font-display text-2xl text-sage-800">All Tasks</h2>
        <p className="text-xs text-sage-400 mt-1">{open.length} open task{open.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="px-4 md:px-8 py-5 max-w-2xl">
        {open.length === 0 ? (
          <div className="text-center py-16 text-sage-300">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-sm">No open tasks.</p>
          </div>
        ) : (
          Object.entries(byDomain).map(([key, domTasks]) => {
            const cfg = key !== 'none' ? DOMAIN_CONFIG[key] : null
            return (
              <div key={key} className="mb-6">
                <p className="text-xs font-semibold text-sage-500 mb-2 flex items-center gap-1.5">
                  {cfg ? <><span>{cfg.icon}</span><span>{cfg.label}</span></> : <span>No domain</span>}
                  <span className="text-sage-400">({domTasks.length})</span>
                </p>
                <div className="space-y-2">
                  {domTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-sage-100 shadow-sm">
                      <button
                        onClick={() => toggleDone(t.id)}
                        className="shrink-0 w-5 h-5 rounded-full border-2 border-sage-300 hover:border-sage-500 flex items-center justify-center transition-colors"
                      />
                      <span className="flex-1 text-sm text-sage-800">{t.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0
                        ${t.priority === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                          t.priority === 'medium' ? 'bg-clay-50 text-clay-600 border-clay-200' :
                          'bg-sage-50 text-sage-500 border-sage-200'}`}>
                        {t.priority}
                      </span>
                      {t.dueDate && (
                        <span className="text-xs text-sage-400 shrink-0">{t.dueDate}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Bell notification component ───────────────────────────────────────────────
function BellIcon({ onNavigate }) {
  const { currentUser } = useAuth()
  const [unread, setUnread] = useState(0)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!currentUser?.id) return

    // Initial count
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', currentUser.id)
      .eq('read', false)
      .then(({ count }) => setUnread(count ?? 0))
      .catch(() => {})

    // Realtime subscription
    channelRef.current = supabase.channel('bell-messages-rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
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

// ── Inner app — has access to all contexts ────────────────────────────────────
function AppMain() {
  const { households, dbError } = useHouseholds()

  const [activeView,         setActiveView]         = useState('home')
  const [activeHouseholdId,  setActiveHouseholdId]  = useState(null)
  const [activeResidentId,   setActiveResidentId]   = useState(null)
  const [activeHouseholdTab, setActiveHouseholdTab] = useState('details')
  const [activeDomain,       setActiveDomain]       = useState(null)
  const [showAddList,        setShowAddList]        = useState(false)
  const [showQuickTask,      setShowQuickTask]      = useState(false)
  const [sidebarOpen,        setSidebarOpen]        = useState(false)

  function navigate(view, params = {}) {
    setActiveView(view)
    if (params.householdId !== undefined) setActiveHouseholdId(params.householdId)
    if (params.residentId  !== undefined) setActiveResidentId(params.residentId)
    if (params.domain      !== undefined) setActiveDomain(params.domain)
    if (params.tab         !== undefined) setActiveHouseholdTab(params.tab)
    else if (view === 'household')        setActiveHouseholdTab('details')
    setSidebarOpen(false)
  }

  function pageTitle() {
    switch (activeView) {
      case 'home':           return 'Home'
      case 'my-tasks':       return 'My Tasks'
      case 'all-tasks':      return 'All Tasks'
      case 'calendar':       return 'Calendar'
      case 'domain-list':    return activeDomain
          ? (DOMAIN_CONFIG[activeDomain]?.label ?? activeDomain)
          : 'Domain'
      case 'household':      return households.find(h => h.id === activeHouseholdId)?.name ?? 'Household'
      case 'household-list': return 'Households'
      case 'resident-list':  return 'Residents'
      case 'resident':       return 'Resident'
      case 'activity':       return 'Activity'
      case 'profile':        return 'Profile'
      case 'teams':          return 'Teams'
      case 'messages':       return 'Messages'
      default:               return 'GormBase'
    }
  }

  function renderMain() {
    switch (activeView) {
      case 'home':
      case 'dashboard':
        return <HomePage navigate={navigate} />
      case 'my-tasks':
        return <MyTasks />
      case 'all-tasks':
        return <AllTasksPage />
      case 'calendar':
        return <CalendarPage />
      case 'domain-list':
        return <DomainListPage domain={activeDomain ?? 'housing'} key={activeDomain} />
      case 'household':
        return (
          <HouseholdDetail
            householdId={activeHouseholdId}
            initialTab={activeHouseholdTab}
            onBack={() => navigate('household-list')}
            onSelectResident={id => navigate('resident', { residentId: id, householdId: activeHouseholdId })}
          />
        )
      case 'household-list':
        return <HouseholdList onSelectHousehold={id => navigate('household', { householdId: id })} />
      case 'resident-list':
        return (
          <ResidentListPage
            onSelectResident={(residentId, householdId) => navigate('resident', { residentId, householdId })}
          />
        )
      case 'resident':
        return (
          <ResidentProfile
            residentId={activeResidentId}
            onBack={() => navigate('household', { householdId: activeHouseholdId, tab: 'residents' })}
          />
        )
      case 'activity':  return <ActivityFeed />
      case 'profile':   return <ProfilePage />
      case 'team':      return <UserDirectory />
      case 'teams':     return <TeamsPage />
      case 'messages':  return <MessagesPage />
      default:          return <HomePage navigate={navigate} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-sage-50">
      {/* DB error banner */}
      {dbError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-clay-50 border-b border-clay-200 px-6 py-2 text-xs text-clay-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>{dbError}</span>
        </div>
      )}

      {/* ── Mobile top navbar ──────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-sage-100 flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-sage-500 hover:text-sage-800 transition-colors p-1 -ml-1"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <img src={GORMY} alt="" className="h-6 w-auto" />
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

      {/* ── Mobile sidebar backdrop ─────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────── */}
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
          activeDomain={activeDomain}
          navigate={navigate}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* ── Main content ────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pt-14 md:pt-0">
        {/* Desktop top bar */}
        <div className="hidden md:flex items-center gap-3 px-6 h-14 border-b border-sage-100 bg-white shrink-0">
          <div className="flex-1">
            <GlobalSearch navigate={navigate} />
          </div>
          <BellIcon onNavigate={navigate} />
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

      {showAddList && (
        <AddListModal
          onClose={() => setShowAddList(false)}
          onCreated={() => setShowAddList(false)}
        />
      )}

      {showQuickTask && (
        <QuickTaskModal onClose={() => setShowQuickTask(false)} />
      )}
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
      <HouseholdProvider>
        <AppMain />
      </HouseholdProvider>
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
