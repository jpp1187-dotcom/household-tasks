import React, { useState, useEffect, useCallback } from 'react'
import { Check, AlertCircle, Clock, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'

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

function getTaskContext(task) {
  if (task.project) {
    const r = task.project.resident
    if (r) {
      const name = r.preferred_name || r.legal_name
      const type = (task.project.project_type ?? '').replace(/_/g, ' ')
      return `${name} · ${type}`
    }
    return task.project.project_type ?? 'Project'
  }
  return 'Personal task'
}

function TaskRow({ task, overdue, onToggle }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border shadow-sm transition-all
      ${overdue ? 'border-l-4 border-l-red-400 border-r-sage-100 border-t-sage-100 border-b-sage-100' : 'border-sage-100'}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, task.status)}
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
      <span className="hidden sm:block text-xs px-2 py-0.5 bg-sage-50 text-sage-500 rounded-full truncate max-w-36">
        {getTaskContext(task)}
      </span>

      {/* Priority */}
      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
        {task.priority}
      </span>

      {/* Due date */}
      {task.due_date && (
        <span className={`text-xs shrink-0 flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-sage-400'}`}>
          <Calendar size={11} />
          {task.due_date}
        </span>
      )}
    </div>
  )
}

function Section({ icon: Icon, label, color, tasks, onToggle }) {
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
          <TaskRow key={t.id} task={t} overdue={label === 'Overdue'} onToggle={onToggle} />
        ))}
      </div>
    </div>
  )
}

export default function MyTasks() {
  const { currentUser } = useAuth()
  const { updateTask } = useTasks()  // for toggling done (writes back to context + DB)

  const [tasks, setTasks] = useState([])
  const [doneTasks, setDoneTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [loadingDone, setLoadingDone] = useState(false)

  const fetchMyTasks = useCallback(async () => {
    if (!currentUser?.id) return
    setLoading(true)

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id, title, status, priority, due_date, assigned_to, created_by, archived,
        project:projects(
          project_type, resident_id,
          resident:residents(legal_name, preferred_name)
        )
      `)
      .or(`assigned_to.eq.${currentUser.id},created_by.eq.${currentUser.id}`)
      .eq('archived', false)
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('[MyTasks] fetch error:', error.message)
    } else {
      setTasks(data ?? [])
    }
    setLoading(false)
  }, [currentUser?.id])

  useEffect(() => {
    fetchMyTasks()
  }, [fetchMyTasks])

  async function loadDoneTasks() {
    if (!currentUser?.id) return
    setLoadingDone(true)
    const { data } = await supabase
      .from('tasks')
      .select(`
        id, title, status, priority, due_date, assigned_to, created_by, archived,
        project:projects(
          project_type, resident_id,
          resident:residents(legal_name, preferred_name)
        )
      `)
      .or(`assigned_to.eq.${currentUser.id},created_by.eq.${currentUser.id}`)
      .eq('archived', false)
      .eq('status', 'done')
      .order('due_date', { ascending: false, nullsFirst: true })
    setDoneTasks(data ?? [])
    setLoadingDone(false)
  }

  async function handleToggle(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done'
    await updateTask(taskId, { status: newStatus })
    // Re-fetch to keep both lists fresh
    await fetchMyTasks()
    if (showDone) await loadDoneTasks()
  }

  const overdue  = tasks.filter(t => isOverdue(t.due_date))
  const thisWeek = tasks.filter(t => isDueThisWeek(t.due_date))
  const upcoming = tasks.filter(t => !isOverdue(t.due_date) && !isDueThisWeek(t.due_date))

  const openCount = tasks.length

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-sage-50 z-10 px-4 md:px-8 pt-6 pb-4 border-b border-sage-100">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-display text-2xl text-sage-800">My Tasks</h2>
            <p className="text-xs text-sage-400 mt-1">{openCount} open task{openCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-sage-700">{openCount}</p>
            <p className="text-xs text-sage-400">open</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-5 max-w-2xl">
        {loading ? (
          <p className="text-center text-sm text-sage-300 py-16">Loading…</p>
        ) : tasks.length === 0 && !showDone ? (
          <div className="text-center py-16 text-sage-300">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-sm">All clear — no open tasks assigned to you.</p>
          </div>
        ) : (
          <>
            <Section icon={AlertCircle} label="Overdue"       color="text-red-500"   tasks={overdue}  onToggle={handleToggle} />
            <Section icon={Clock}       label="Due This Week" color="text-clay-600"  tasks={thisWeek} onToggle={handleToggle} />
            <Section icon={Calendar}    label="Upcoming"      color="text-sage-500"  tasks={upcoming} onToggle={handleToggle} />
          </>
        )}

        {/* Completed toggle */}
        <div className="mt-2">
          <button
            onClick={async () => {
              const next = !showDone
              setShowDone(next)
              if (next && doneTasks.length === 0) await loadDoneTasks()
            }}
            className="text-xs text-sage-400 hover:text-sage-600 transition-colors mb-3"
          >
            {showDone ? '▾' : '▸'} Show completed
          </button>
          {showDone && (
            loadingDone ? (
              <p className="text-xs text-sage-300 py-2">Loading…</p>
            ) : (
              <div className="space-y-2 opacity-60">
                {doneTasks.map(t => (
                  <TaskRow key={t.id} task={t} overdue={false} onToggle={handleToggle} />
                ))}
                {doneTasks.length === 0 && (
                  <p className="text-xs text-sage-300 py-2">No completed tasks.</p>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
