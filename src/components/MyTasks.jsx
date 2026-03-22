import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import TaskCard from './TaskCard'

export default function MyTasks() {
  const { currentUser } = useAuth()
  const { tasks } = useTasks()
  const [filter, setFilter] = useState('todo')

  let mine = tasks.filter(t => t.assignedTo === currentUser?.id)
  if (filter === 'todo') mine = mine.filter(t => t.status !== 'done')
  if (filter === 'done') mine = mine.filter(t => t.status === 'done')

  mine = [...mine].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (b.status === 'done' && a.status !== 'done') return -1
    const p = { high: 0, medium: 1, low: 2 }
    return p[a.priority] - p[b.priority]
  })

  const allMine = tasks.filter(t => t.assignedTo === currentUser?.id)
  const doneCount = allMine.filter(t => t.status === 'done').length
  const openCount = allMine.filter(t => t.status !== 'done').length

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-sage-50 z-10 px-8 pt-8 pb-4 border-b border-sage-100">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-display text-2xl text-sage-800">My Tasks</h2>
            <p className="text-xs text-sage-400 mt-1">
              {doneCount} of {allMine.length} complete
            </p>
            <div className="mt-2 h-1.5 w-48 bg-sage-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage-500 rounded-full transition-all duration-500"
                style={{ width: allMine.length > 0 ? `${Math.round((doneCount / allMine.length) * 100)}%` : '0%' }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-sage-700">{openCount}</p>
            <p className="text-xs text-sage-400">open</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 mt-4">
          {['all', 'todo', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-lg font-medium capitalize transition-colors
                ${filter === f ? 'bg-sage-600 text-white' : 'text-sage-500 hover:bg-sage-100'}`}
            >
              {f === 'all' ? 'All' : f === 'todo' ? 'To Do' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="px-8 py-4 space-y-2 max-w-2xl">
        {mine.length === 0 ? (
          <div className="text-center py-16 text-sage-300">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-sm">
              {filter === 'done' ? 'No completed tasks yet.' : 'All clear — nothing assigned to you.'}
            </p>
          </div>
        ) : (
          mine.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  )
}
