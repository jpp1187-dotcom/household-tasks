import React, { useState, useEffect } from 'react'
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
import ActivityFeed from './components/ActivityFeed'
import ProfilePage from './components/ProfilePage'
import UserDirectory from './components/UserDirectory'
import AddListModal from './components/AddListModal'
import LoginPage from './components/LoginPage'

// ── Inner app — has access to all contexts ────────────────────────────────────
function AppMain() {
  const { allUsers } = useAuth()
  const { lists } = useTasks()
  const { dbError } = useHouseholds()

  const [activeView,        setActiveView]        = useState('dashboard')
  const [activeListId,      setActiveListId]      = useState(null)
  const [activeHouseholdId, setActiveHouseholdId] = useState(null)
  const [activeProjectId,   setActiveProjectId]   = useState(null)
  const [showAddList,       setShowAddList]       = useState(false)

  // Default quick-list selection once lists load
  useEffect(() => {
    if (!activeListId && lists.length > 0) {
      setActiveListId(lists[0].id)
    }
  }, [lists])

  function navigate(view, params = {}) {
    setActiveView(view)
    if (params.listId      !== undefined) setActiveListId(params.listId)
    if (params.householdId !== undefined) setActiveHouseholdId(params.householdId)
    if (params.projectId   !== undefined) setActiveProjectId(params.projectId)
  }

  function renderMain() {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />
      case 'my-tasks':
        return <MyTasks />
      case 'quick-list':
        return <TaskList listId={activeListId} />
      case 'household':
        return (
          <HouseholdDetail
            householdId={activeHouseholdId}
            onBack={() => navigate('household-list')}
            onSelectProject={id => navigate('project', { projectId: id })}
          />
        )
      case 'household-list':
        return (
          <HouseholdList
            onSelectHousehold={id => navigate('household', { householdId: id })}
          />
        )
      case 'project':
        return (
          <ProjectDetail
            projectId={activeProjectId}
            allUsers={allUsers}
            onBack={() => navigate('household', { householdId: activeHouseholdId })}
          />
        )
      case 'activity':
        return <ActivityFeed />
      case 'profile':
        return <ProfilePage />
      case 'team':
        return <UserDirectory />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-sage-50">
      {dbError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-clay-50 border-b border-clay-200 px-6 py-2 text-xs text-clay-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>{dbError}</span>
        </div>
      )}
      <Sidebar
        activeView={activeView}
        activeListId={activeListId}
        activeHouseholdId={activeHouseholdId}
        activeProjectId={activeProjectId}
        navigate={navigate}
        onAddList={() => setShowAddList(true)}
      />

      {renderMain()}

      {showAddList && (
        <AddListModal
          onClose={() => setShowAddList(false)}
          onCreated={id => {
            setActiveListId(id)
            setActiveView('quick-list')
            setShowAddList(false)
          }}
        />
      )}
    </div>
  )
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
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
