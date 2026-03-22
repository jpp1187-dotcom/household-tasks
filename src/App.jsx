import React, { useState, useEffect } from 'react'
import { Menu, Plus } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TaskProvider, useTasks } from './contexts/TaskContext'
import { HouseholdProvider, useHouseholds } from './contexts/HouseholdContext'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import MyTasks from './components/MyTasks'
import TaskList from './components/TaskList'
import HouseholdList from './components/HouseholdList'
import HouseholdDetail from './components/HouseholdDetail'
import ProjectDetail from './components/ProjectDetail'
import ResidentProfile from './components/ResidentProfile'
import ResidentListPage from './components/ResidentListPage'
import ProjectListPage from './components/ProjectListPage'
import ActivityFeed from './components/ActivityFeed'
import ProfilePage from './components/ProfilePage'
import UserDirectory from './components/UserDirectory'
import AddListModal from './components/AddListModal'
import ProjectListView from './components/ProjectListView'
import CalendarPage from './components/CalendarPage'
import TeamsPage from './components/TeamsPage'
import MessagesPage from './components/MessagesPage'
import GlobalSearch from './components/GlobalSearch'
import QuickTaskModal from './components/QuickTaskModal'
import LoginPage from './components/LoginPage'

const GORMY = 'https://dhwcawykduzxtohollmx.supabase.co/storage/v1/object/public/avatars/gormy.png'

// ── Inner app — has access to all contexts ────────────────────────────────────
function AppMain() {
  const { allUsers } = useAuth()
  const { lists } = useTasks()
  const { projects, households, dbError } = useHouseholds()

  const [activeView,         setActiveView]         = useState('dashboard')
  const [activeListId,       setActiveListId]       = useState(null)
  const [activeHouseholdId,  setActiveHouseholdId]  = useState(null)
  const [activeProjectId,    setActiveProjectId]    = useState(null)
  const [activeResidentId,   setActiveResidentId]   = useState(null)
  const [activeHouseholdTab, setActiveHouseholdTab] = useState('details')
  const [activeDomain,       setActiveDomain]       = useState('housing')
  const [showAddList,        setShowAddList]        = useState(false)
  const [showQuickTask,      setShowQuickTask]      = useState(false)
  const [sidebarOpen,        setSidebarOpen]        = useState(false)

  // Default personal list selection once lists load
  useEffect(() => {
    if (!activeListId && lists.length > 0) setActiveListId(lists[0].id)
  }, [lists])

  function navigate(view, params = {}) {
    setActiveView(view)
    if (params.listId      !== undefined) setActiveListId(params.listId)
    if (params.householdId !== undefined) setActiveHouseholdId(params.householdId)
    if (params.projectId   !== undefined) setActiveProjectId(params.projectId)
    if (params.residentId  !== undefined) setActiveResidentId(params.residentId)
    if (params.domain      !== undefined) setActiveDomain(params.domain)
    if (params.tab         !== undefined) setActiveHouseholdTab(params.tab)
    else if (view === 'household')        setActiveHouseholdTab('details')
    setSidebarOpen(false)
  }

  function pageTitle() {
    switch (activeView) {
      case 'dashboard':        return 'Dashboard'
      case 'my-tasks':         return 'My Tasks'
      case 'calendar':         return 'Calendar'
      case 'personal-list':    return lists.find(l => l.id === activeListId)?.name ?? 'List'
      case 'project-list':     return activeDomain
          ? activeDomain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : 'Project Lists'
      case 'household':        return households.find(h => h.id === activeHouseholdId)?.name ?? 'Household'
      case 'household-list':   return 'Households'
      case 'resident-list':    return 'Residents'
      case 'project-list-all': return 'Projects'
      case 'project':          return projects.find(p => p.id === activeProjectId)?.name ?? 'Project'
      case 'resident':         return 'Resident'
      case 'activity':         return 'Activity'
      case 'profile':          return 'Profile'
      case 'team':             return 'Team'
      case 'teams':            return 'Teams'
      case 'messages':         return 'Messages'
      default:                 return 'GormBase'
    }
  }

  function renderMain() {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard navigate={navigate} />
      case 'my-tasks':
        return <MyTasks />
      case 'calendar':
        return <CalendarPage />
      case 'personal-list':
        return <TaskList listId={activeListId} />
      case 'project-list':
        return <ProjectListView domain={activeDomain} navigate={navigate} />
      case 'household':
        return (
          <HouseholdDetail
            householdId={activeHouseholdId}
            initialTab={activeHouseholdTab}
            onBack={() => navigate('household-list')}
            onSelectProject={id => navigate('project', { projectId: id, householdId: activeHouseholdId })}
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
      case 'project-list-all':
        return <ProjectListPage navigate={navigate} />
      case 'project': {
        const project = projects.find(p => p.id === activeProjectId)
        return (
          <ProjectDetail
            projectId={activeProjectId}
            allUsers={allUsers}
            onBack={() => {
              if (project?.residentId) {
                navigate('resident', { residentId: project.residentId, householdId: activeHouseholdId })
              } else {
                navigate('household', { householdId: activeHouseholdId, tab: 'projects' })
              }
            }}
          />
        )
      }
      case 'resident':
        return (
          <ResidentProfile
            residentId={activeResidentId}
            onBack={() => navigate('household', { householdId: activeHouseholdId, tab: 'residents' })}
            onSelectProject={id => navigate('project', { projectId: id, householdId: activeHouseholdId })}
          />
        )
      case 'activity':  return <ActivityFeed />
      case 'profile':   return <ProfilePage />
      case 'team':      return <UserDirectory />
      case 'teams':     return <TeamsPage />
      case 'messages':  return <MessagesPage />
      default:          return <Dashboard navigate={navigate} />
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
          activeListId={activeListId}
          activeHouseholdId={activeHouseholdId}
          activeProjectId={activeProjectId}
          activeResidentId={activeResidentId}
          activeDomain={activeDomain}
          navigate={navigate}
          onAddList={() => setShowAddList(true)}
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
          onCreated={id => {
            setActiveListId(id)
            setActiveView('personal-list')
            setShowAddList(false)
          }}
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
