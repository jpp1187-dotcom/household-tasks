import React, { useState } from 'react'
import { Check, AlertCircle, Clock, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { useHouseholds } from '../contexts/HouseholdContext'

const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-clay-50 text-clay-600 border-clay-200',
  low:    'bg-sage-50 text-sage-500 border-sage-200',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function isOverdue(dueDate) {
  return dueDate && dueDate < today()
}

function isDueThisWeek(dueDate) {
  if (!dueDate) return false
  const t = today()
  return dueDate >= t && dueDate <= addDays(t, 7)
}

function TaskRow({ task, context, overdue }) {
  const { toggleDone } = useTasks()

  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border shadow-sm transition-all
      ${overdue ? 'border-l-4 border-l-red-400 border-r-sage-100 border-t-sage-100 border-b-sage-100' : 'border-sage-100'}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => toggleDone(task.id)}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${task.status === 'done'
            ? 'bg-sage-400 border-sage-400'
            : overdue ? 'border-red-300 hover:border-red-500' : 'border-sage-300 hover:border-sage-500'}`}
      >
        {task.status === 'done' && <Check size={11} className="text-white" />}
      </button>

      {/* Title */}
      <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-sage-300' : 'text-sage-800'}`}>
        {task.title}
      </span>

      {/* Context badge */}
      {context && (
        <span className="hidden sm:block text-xs px-2 py-0.5 bg-sage-50 text-sage-500 rounded-full truncate max-w-32">
          {context}
        </span>
      )}

      {/* Priority */}
      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
        {task.priority}
      </span>

      {/* Due date */}
      {task.dueDate && (
        <span className={`text-xs shrink-0 flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-sage-400'}`}>
          <Calendar size={11} />
          {task.dueDate}
        </span>
      )}
    </div>
  )
}

function Section({ icon: Icon, label, color, tasks, getContext }) {
  if (tasks.length === 0) return null
  return (
    <div className="mb-6">
      <div className={`flex items-center gap-2 mb-3 ${color}`}>
        <Icon size={15} />
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs bg-white border border-current rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map(t => (
          <TaskRow key={t.id} task={t} context={getContext(t)} overdue={label === 'Overdue'} />
        ))}
      </div>
    </div>
  )
}

export default function MyTasks() {
  const { currentUser } = useAuth()
  const { tasks } = useTasks()
  const { projects, residents, households } = useHouseholds()
  const [showDone, setShowDone] = useState(false)

  // My tasks: assigned to me OR created by me, not archived
  const mine = tasks.filter(t =>
    !t.archived &&
    (t.assignedTo === currentUser?.id || t.createdBy === currentUser?.id)
  )

  const active = mine.filter(t => t.status !== 'done')
  const done   = mine.filter(t => t.status === 'done')

  const overdue     = active.filter(t => isOverdue(t.dueDate))
  const thisWeek    = active.filter(t => isDueThisWeek(t.dueDate))
  const upcoming    = active.filter(t => !isOverdue(t.dueDate) && !isDueThisWeek(t.dueDate))

  function getContext(task) {
    if (task.projectId) {
      const project = projects.find(p => p.id === task.projectId)
      if (!project) return null
      if (project.residentId) {
        const resident = residents.find(r => r.id === project.residentId)
        return resident ? `${resident.legalName} · ${project.projectType || project.name}` : project.name
      }
      const household = households.find(h => h.id === project.householdId)
      return household ? `${household.name} · ${project.name}` : project.name
    }
    if (task.listId) return 'Personal'
    return null
  }

  const openCount = active.length
  const doneCount = done.length
  const total = mine.length

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-sage-50 z-10 px-4 md:px-8 pt-6 pb-4 border-b border-sage-100">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-display text-2xl text-sage-800">My Tasks</h2>
            <p className="text-xs text-sage-400 mt-1">{doneCount} of {total} complete</p>
            <div className="mt-2 h-1.5 w-48 bg-sage-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage-500 rounded-full transition-all duration-500"
                style={{ width: total > 0 ? `${Math.round((doneCount / total) * 100)}%` : '0%' }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-sage-700">{openCount}</p>
            <p className="text-xs text-sage-400">open</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-5 max-w-2xl">
        {active.length === 0 && (
          <div className="text-center py-16 text-sage-300">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-sm">All clear — no open tasks assigned to you.</p>
          </div>
        )}

        <Section
          icon={AlertCircle}
          label="Overdue"
          color="text-red-500"
          tasks={overdue}
          getContext={getContext}
        />
        <Section
          icon={Clock}
          label="Due This Week"
          color="text-clay-600"
          tasks={thisWeek}
          getContext={getContext}
        />
        <Section
          icon={Calendar}
          label="Upcoming"
          color="text-sage-500"
          tasks={upcoming}
          getContext={getContext}
        />

        {/* Completed toggle */}
        {done.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowDone(v => !v)}
              className="text-xs text-sage-400 hover:text-sage-600 transition-colors mb-3"
            >
              {showDone ? '▾' : '▸'} {done.length} completed
            </button>
            {showDone && (
              <div className="space-y-2 opacity-60">
                {done.map(t => (
                  <TaskRow key={t.id} task={t} context={getContext(t)} overdue={false} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
