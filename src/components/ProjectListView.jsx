import React, { useState, useEffect } from 'react'
import { Check, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'

export const DOMAIN_CONFIG = {
  housing:           { label: 'Housing',           icon: '🏠', color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  clinical:          { label: 'Clinical',          icon: '🏥', color: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  behavioral_health: { label: 'Behavioral Health', icon: '🧠', color: 'bg-teal-500',   text: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  justice:           { label: 'Justice',           icon: '⚖️', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  care_coordination: { label: 'Care Coordination', icon: '🤝', color: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  benefits:          { label: 'Benefits',          icon: '📋', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
}

const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-clay-50 text-clay-600 border-clay-200',
  low:    'bg-sage-50 text-sage-500 border-sage-200',
}

export default function ProjectListView({ domain, navigate }) {
  const { allUsers } = useAuth()
  const { toggleDone } = useTasks()

  const [domainTasks, setDomainTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [residentFilter, setResidentFilter] = useState(null)

  const cfg = DOMAIN_CONFIG[domain] ?? DOMAIN_CONFIG.housing

  useEffect(() => {
    setResidentFilter(null)
    setDomainTasks([])
    setLoadingTasks(true)

    supabase
      .from('tasks')
      .select(`
        id, title, status, priority, due_date, assigned_to, created_by, archived,
        project:projects!inner(
          id, project_type, resident_id,
          resident:residents(
            legal_name, preferred_name,
            household:households(name)
          )
        )
      `)
      .eq('projects.project_type', domain)
      .eq('archived', false)
      .then(({ data, error }) => {
        if (error) {
          console.error('[ProjectListView] fetch error:', error.message)
          setDomainTasks([])
        } else {
          setDomainTasks(data ?? [])
        }
        setLoadingTasks(false)
      })
  }, [domain])

  // Unique residents from fetched tasks
  const residentMap = {}
  domainTasks.forEach(t => {
    const r = t.project?.resident
    const rid = t.project?.resident_id
    if (r && rid && !residentMap[rid]) {
      residentMap[rid] = { id: rid, legalName: r.legal_name, preferredName: r.preferred_name }
    }
  })
  const filterResidents = Object.values(residentMap)

  const visibleTasks = residentFilter
    ? domainTasks.filter(t => t.project?.resident_id === residentFilter)
    : domainTasks

  const openCount = visibleTasks.filter(t => t.status !== 'done').length
  const doneCount = visibleTasks.filter(t => t.status === 'done').length

  function getAssignee(task) {
    return allUsers.find(u => u.id === task.assigned_to)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-sage-50 z-10 px-4 md:px-8 pt-6 pb-4 border-b border-sage-100">
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center text-lg`}>
            {cfg.icon}
          </div>
          <h2 className="font-display text-2xl text-sage-800">{cfg.label}</h2>
        </div>
        <p className="text-xs text-sage-400">
          {loadingTasks ? 'Loading…' : `${openCount} open · ${doneCount} done`}
        </p>

        {/* Resident filter chips */}
        {filterResidents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setResidentFilter(null)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors
                ${!residentFilter ? `${cfg.bg} ${cfg.border} ${cfg.text} font-medium` : 'border-sage-200 text-sage-500 hover:bg-sage-50'}`}
            >
              All residents
            </button>
            {filterResidents.map(r => (
              <button
                key={r.id}
                onClick={() => setResidentFilter(residentFilter === r.id ? null : r.id)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors
                  ${residentFilter === r.id ? `${cfg.bg} ${cfg.border} ${cfg.text} font-medium` : 'border-sage-200 text-sage-500 hover:bg-sage-50'}`}
              >
                {r.preferredName || r.legalName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="px-4 md:px-8 py-5">
        {loadingTasks ? (
          <p className="text-sm text-sage-300 text-center py-12">Loading tasks…</p>
        ) : visibleTasks.length === 0 ? (
          <div className="text-center py-20 text-sage-300">
            <p className="text-4xl mb-3">{cfg.icon}</p>
            <p className="text-sm">No tasks in {cfg.label} yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl">
            {visibleTasks.map(task => {
              const resident = task.project?.resident
              const householdName = resident?.household?.name
              const assignee = getAssignee(task)
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-sage-100 shadow-sm"
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleDone(task.id)}
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                      ${task.status === 'done' ? 'bg-sage-400 border-sage-400' : 'border-sage-300 hover:border-sage-500'}`}
                  >
                    {task.status === 'done' && <Check size={11} className="text-white" />}
                  </button>

                  {/* Title */}
                  <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-sage-300' : 'text-sage-800'}`}>
                    {task.title}
                  </span>

                  {/* Resident + Household context */}
                  <div className="hidden md:flex flex-col items-end min-w-0 max-w-44">
                    {resident && (
                      <span className="text-xs text-sage-600 truncate font-medium">
                        {resident.preferred_name || resident.legal_name}
                      </span>
                    )}
                    {householdName && (
                      <span className="text-xs text-sage-400 truncate">{householdName}</span>
                    )}
                  </div>

                  {/* Assignee */}
                  {assignee && (
                    <span title={assignee.name} className="text-base shrink-0">{assignee.avatar}</span>
                  )}

                  {/* Priority */}
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                  </span>

                  {/* Due date */}
                  {task.due_date && (
                    <span className="text-xs text-sage-400 flex items-center gap-1 shrink-0">
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
    </div>
  )
}
