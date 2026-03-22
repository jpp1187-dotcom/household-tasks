import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TaskProvider, useTasks } from './contexts/TaskContext'
import Sidebar from './components/Sidebar'
import TaskList from './components/TaskList'
import AddListModal from './components/AddListModal'
import LoginPage from './components/LoginPage'

function AppMain() {
  const { lists } = useTasks()
  const [activeListId, setActiveListId] = useState(null)
  const [showAddList, setShowAddList] = useState(false)

  // Default to first list once lists load
  useEffect(() => {
    if (!activeListId && lists.length > 0) {
      setActiveListId(lists[0].id)
    }
  }, [lists])

  return (
    <div className="flex h-screen overflow-hidden bg-sage-50">
      <Sidebar
        activeListId={activeListId}
        onSelectList={setActiveListId}
        onAddList={() => setShowAddList(true)}
      />
      <TaskList listId={activeListId} />

      {showAddList && (
        <AddListModal
          onClose={() => setShowAddList(false)}
          onCreated={id => { setActiveListId(id); setShowAddList(false) }}
        />
      )}
    </div>
  )
}

function AppShell() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-sage-50">
        <p className="text-sage-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (!currentUser) {
    return <LoginPage />
  }

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
