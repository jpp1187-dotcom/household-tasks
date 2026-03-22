import React from 'react'
import { Plus, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'

export default function Sidebar({ activeListId, onSelectList, onAddList }) {
  const { currentUser, signOut, isAdmin } = useAuth()
  const { lists, tasks } = useTasks()

  function countOpen(listId) {
    return tasks.filter(t => t.listId === listId && t.status !== 'done').length
  }

  return (
    <aside className="w-64 bg-white border-r border-sage-100 flex flex-col h-full shrink-0">
      {/* App title */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="font-display text-2xl text-sage-800 leading-tight">Homebase</h1>
        <p className="text-xs text-sage-400 mt-0.5">Your household, organized.</p>
      </div>

      {/* Lists */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-sage-400 uppercase tracking-widest mb-2">Lists</p>
        {lists.map(list => {
          const open = countOpen(list.id)
          return (
            <button
              key={list.id}
              onClick={() => onSelectList(list.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors
                ${activeListId === list.id
                  ? 'bg-sage-100 text-sage-800'
                  : 'text-sage-600 hover:bg-sage-50'}`}
            >
              <span className="text-base">{list.icon}</span>
              <span className="flex-1 text-left">{list.name}</span>
              {open > 0 && (
                <span className="text-xs bg-sage-200 text-sage-700 rounded-full px-1.5 py-0.5">{open}</span>
              )}
            </button>
          )
        })}

        {/* Add new list — admin only */}
        {isAdmin() && (
          <button
            onClick={onAddList}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sage-400 hover:text-sage-600 hover:bg-sage-50 transition-colors mt-1"
          >
            <Plus size={15} />
            <span>New list</span>
          </button>
        )}
      </nav>

      {/* Signed-in user + sign out */}
      <div className="px-3 pb-6 pt-4 border-t border-sage-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="text-base">{currentUser?.avatar ?? '🧑'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sage-700 leading-tight truncate">{currentUser?.name ?? currentUser?.email}</p>
            <p className="text-xs text-sage-400 capitalize">{currentUser?.role}</p>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="text-sage-300 hover:text-sage-600 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
