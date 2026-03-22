import React, { useState } from 'react'
import { Plus, Filter } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import TaskCard from './TaskCard'
import AddTaskModal from './AddTaskModal'

export default function TaskList({ listId }) {
  const { canEdit } = useAuth()
  const { tasks, lists } = useTasks()
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all') // all | mine | todo | done

  const { currentUser } = useAuth()
  const list = lists.find(l => l.id === listId)

  // Filter tasks for this list
  let visible = tasks.filter(t => t.listId === listId)
  if (filter === 'mine')  visible = visible.filter(t => t.assignedTo === currentUser.id)
  if (filter === 'todo')  visible = visible.filter(t => t.status !== 'done')
  if (filter === 'done')  visible = visible.filter(t => t.status === 'done')

  // Sort: high priority first, done last
  visible = [...visible].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (b.status === 'done' && a.status !== 'done') return -1
    const p = { high: 0, medium: 1, low: 2 }
    return p[a.priority] - p[b.priority]
  })

  const doneCount = tasks.filter(t => t.listId === listId && t.status === 'done').length
  const totalCount = tasks.filter(t => t.listId === listId).length
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  if (!list) return <div className="p-8 text-sage-400">Select a list</div>

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-sage-50 z-10 px-8 pt-8 pb-4 border-b border-sage-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{list.icon}</span>
              <h2 className="font-display text-2xl text-sage-800">{list.name}</h2>
            </div>
            <p className="text-xs text-sage-400 mt-1 ml-0.5">
              {doneCount} of {totalCount} tasks complete
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-48 bg-sage-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {canEdit() && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Task
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1 mt-4">
          {['all', 'mine', 'todo', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-lg font-medium capitalize transition-colors
                ${filter === f
                  ? 'bg-sage-600 text-white'
                  : 'text-sage-500 hover:bg-sage-100'}`}
            >
              {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : f === 'todo' ? 'To Do' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      {/* Task cards */}
      <div className="px-8 py-4 space-y-2 max-w-2xl">
        {visible.length === 0 ? (
          <div className="text-center py-16 text-sage-300">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-sm">Nothing here yet.</p>
            {canEdit() && (
              <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-sage-500 underline">
                Add a task
              </button>
            )}
          </div>
        ) : (
          visible.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </div>

      {showModal && (
        <AddTaskModal listId={listId} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
