import React, { useState, useEffect, useCallback } from 'react'
import { Check, Calendar, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { DOMAIN_CONFIG } from '../lib/domains'
import QuickTaskModal from './QuickTaskModal'

const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-clay-50 text-clay-600 border-clay-200',
  low:    'bg-sage-50 text-sage-500 border-sage-200',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function DomainListPage({ domain }) {
  const { allUsers } = useAuth()
  const { updateTask } = useTasks()
  const cfg = DOMAIN_CONFIG[domain] ?? DOMAIN_CONFIG.housing

  const [domainTasks, setDomainTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [residentFilter, setResidentFilter] = useState(null)
  const [showAddTask, setShowAddTask] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id, title, status, priority, due_date, assigned_to, created_by, archived, domain_tag,
        resident:residents(id, legal_name, preferred_name),
        household:households(id, name)
      `)
      .eq('domain_tag', domain)
      .eq('archived', false)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('[DomainListPage] fetch error:', error.message)
      setDomainTasks([])
    } else {
      setDomainTasks(data ?? [])
    }
    setLoading(false)
  }, [domain])

  useEffect(() => {
    setResidentFilter(null)
    fetchTasks()
  }, [fetchTasks])

  // Build unique residents from results
  const residentMap = {}
  domainTasks.forEach(t => {
    if (t.resident?.id && !residentMap[t.resident.id]) {
      residentMap[t.resident.id] = {
        id: t.resident.id,
        name: t.resident.preferred_name || t.resident.legal_name,
      }
    }
  })
  const filterResidents = Object.values(residentMap)

  const visibleTasks = residentFilter
    ? domainTasks.filter(t => t.resident?.id === residentFilter)
    : domainTasks

  const openCount = visibleTasks.filter(t => t.status !== 'done').length
  const doneCount = visibleTasks.filter(t => t.status === 'done').length

  async function handleToggle(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done'
    await updateTask(taskId, { status: newStatus })
    // Optimistic update
    setDomainTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ))
  }

  function getAssignee(task) {
    return allUsers.find(u => u.id === task.assigned_to)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-sage-50 z-10 px-4 md:px-8 pt-6 pb-4 border-b border-sage-100">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center text-lg`}>
              {cfg.icon}
            </div>
            <h2 className="font-display text-2xl text-sage-800">{cfg.label}</h2>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
        <p className="text-xs text-sage-400">
          {loading ? 'Loading…' : `${openCount} open · ${doneCount} done`}
        </p>

        {/* Resident filter chips */}
        {filterResidents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setResidentFilter(null)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors
                ${!residentFilter
                  ? `${cfg.bg} ${cfg.border} ${cfg.text} font-medium`
                  : 'border-sage-200 text-sage-500 hover:bg-sage-50'}`}
            >
              All residents
            </button>
            {filterResidents.map(r => (
              <button
                key={r.id}
                onClick={() => setResidentFilter(residentFilter === r.id ? null : r.id)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors
                  ${residentFilter === r.id
                    ? `${cfg.bg} ${cfg.border} ${cfg.text} font-medium`
                    : 'border-sage-200 text-sage-500 hover:bg-sage-50'}`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="px-4 md:px-8 py-5">
        {loading ? (
          <p className="text-sm text-sage-300 text-center py-12">Loading tasks…</p>
        ) : visibleTasks.length === 0 ? (
          <div className="text-center py-20 text-sage-300">
            <p className="text-4xl mb-3">{cfg.icon}</p>
            <p className="text-sm">No tasks in {cfg.label} yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl">
            {visibleTasks.map(task => {
              const assignee = getAssignee(task)
              const isOverdue = task.due_date && task.due_date < today() && task.status !== 'done'
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border shadow-sm
                    ${isOverdue ? 'border-l-4 border-l-red-400 border-r-sage-100 border-t-sage-100 border-b-sage-100' : 'border-sage-100'}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggle(task.id, task.status)}
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                      ${task.status === 'done'
                        ? 'bg-sage-400 border-sage-400'
                        : isOverdue ? 'border-red-300 hover:border-red-500' : 'border-sage-300 hover:border-sage-500'}`}
                  >
                    {task.status === 'done' && <Check size={11} className="text-white" />}
                  </button>

                  {/* Title + subtitle */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.status === 'done' ? 'line-through text-sage-300' : 'text-sage-800'}`}>
                      {task.title}
                    </p>
                    {(task.resident || task.household) && (
                      <p className="text-xs text-sage-400 truncate mt-0.5">
                        {task.resident ? (task.resident.preferred_name || task.resident.legal_name) : ''}
                        {task.resident && task.household ? ' · ' : ''}
                        {task.household?.name ?? ''}
                      </p>
                    )}
                  </div>

                  {/* Assignee avatar */}
                  {assignee && (
                    <span title={assignee.name} className="text-base shrink-0">{assignee.avatar ?? '🧑'}</span>
                  )}

                  {/* Priority */}
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                  </span>

                  {/* Due date */}
                  {task.due_date && (
                    <span className={`text-xs flex items-center gap-1 shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-sage-400'}`}>
                      <Calendar size={11} />
                      {task.due_date}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAddTask && (
        <QuickTaskModal
          prefillDomain={domain}
          onClose={() => { setShowAddTask(false); fetchTasks() }}
        />
      )}
    </div>
  )
}
