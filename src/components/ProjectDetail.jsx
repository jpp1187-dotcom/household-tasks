import React, { useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'
import TaskCard from './TaskCard'
import AddTaskModal from './AddTaskModal'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ProjectDetail({ projectId, onBack, allUsers }) {
  const { canEdit } = useAuth()
  const { projects, households, activity, updateProject } = useHouseholds()
  const { tasks } = useTasks()
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')

  const project = projects.find(p => p.id === projectId)
  const household = project ? households.find(h => h.id === project.householdId) : null

  let pTasks = tasks.filter(t => t.projectId === projectId)
  if (filter === 'todo') pTasks = pTasks.filter(t => t.status !== 'done')
  if (filter === 'done') pTasks = pTasks.filter(t => t.status === 'done')

  // Sort: high priority first, done last
  pTasks = [...pTasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (b.status === 'done' && a.status !== 'done') return -1
    const p = { high: 0, medium: 1, low: 2 }
    return p[a.priority] - p[b.priority]
  })

  const projectTaskIds = new Set(tasks.filter(t => t.projectId === projectId).map(t => t.id))
  const recentActivity = activity
    .filter(a => a.entityId === projectId || projectTaskIds.has(a.entityId))
    .slice(0, 20)

  const allPTasks = tasks.filter(t => t.projectId === projectId)
  const done = allPTasks.filter(t => t.status === 'done').length
  const pct = allPTasks.length > 0 ? Math.round((done / allPTasks.length) * 100) : 0

  if (!project) return <div className="p-8 text-sage-400">Project not found.</div>

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-sage-400 hover:text-sage-600 mb-4"
        >
          <ArrowLeft size={14} />
          {household?.name ?? 'Back'}
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl text-sage-800">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-sage-500 mt-1">{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <div className="h-1.5 w-36 bg-sage-100 rounded-full overflow-hidden">
                <div className="h-full bg-sage-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-sage-400">{done}/{allPTasks.length} done</span>
              {project.dueDate && (
                <span className="text-xs text-sage-400">· Due {project.dueDate}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={project.status}
              onChange={e => updateProject(projectId, { status: e.target.value })}
              className="text-xs border border-sage-200 rounded-lg px-2 py-1.5 text-sage-600 bg-white"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
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
        </div>

        {/* Filters */}
        <div className="flex gap-1 mb-4">
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

        {/* Tasks */}
        <div className="space-y-2 max-w-2xl">
          {pTasks.length === 0 ? (
            <div className="text-center py-12 text-sage-300">
              <p className="text-sm">No tasks here.</p>
              {canEdit() && (
                <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-sage-500 underline">
                  Add a task
                </button>
              )}
            </div>
          ) : (
            pTasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>

      {/* Activity sidebar */}
      <div className="w-64 shrink-0 border-l border-sage-100 bg-white overflow-y-auto px-5 py-8">
        <h3 className="text-xs font-semibold text-sage-400 uppercase tracking-widest mb-4">
          Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <p className="text-xs text-sage-300">No activity yet.</p>
        ) : (
          <div className="space-y-4">
            {recentActivity.map(a => {
              const user = allUsers?.find(u => u.id === a.userId)
              return (
                <div key={a.id} className="text-xs">
                  <span className="font-medium text-sage-700">{user?.name ?? 'Someone'}</span>
                  {' '}
                  <span className="text-sage-500">{a.action}</span>
                  {a.entityName && (
                    <>
                      {' '}
                      <span className="font-medium text-sage-700">{a.entityName}</span>
                    </>
                  )}
                  <p className="text-sage-400 mt-0.5">{timeAgo(a.createdAt)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AddTaskModal projectId={projectId} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
