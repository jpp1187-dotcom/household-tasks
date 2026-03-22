import React, { useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'

export default function HouseholdDetail({ householdId, onBack, onSelectProject }) {
  const { isAdmin } = useAuth()
  const { households, projects, addProject } = useHouseholds()
  const { tasks } = useTasks()
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')

  const household = households.find(h => h.id === householdId)
  const hProjects = projects.filter(p => p.householdId === householdId)

  async function handleAddProject(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await addProject({ householdId, name: newName.trim() })
    setNewName('')
    setShowForm(false)
  }

  if (!household) return <div className="p-8 text-sage-400">Household not found.</div>

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-sage-400 hover:text-sage-600 mb-4"
      >
        <ArrowLeft size={14} /> All Households
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl text-sage-800">{household.name}</h2>
          {household.address && <p className="text-xs text-sage-400 mt-0.5">{household.address}</p>}
          {household.description && <p className="text-sm text-sage-500 mt-1">{household.description}</p>}
        </div>
        {isAdmin() && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Project
          </button>
        )}
      </div>

      {/* Inline add-project form */}
      {showForm && (
        <form
          onSubmit={handleAddProject}
          className="bg-white border-2 border-sage-200 rounded-xl p-4 mb-4 max-w-md flex gap-2"
        >
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Project name…"
            className="flex-1 text-sm border border-sage-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          <button type="submit" className="px-4 py-2 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700">
            Add
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-sage-400 hover:text-sage-600">
            ✕
          </button>
        </form>
      )}

      {/* Projects grid */}
      {hProjects.length === 0 ? (
        <div className="text-center py-20 text-sage-300">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">No projects yet.</p>
          {isAdmin() && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-sage-500 underline">
              Add the first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {hProjects.map(p => {
            const pt = tasks.filter(t => t.projectId === p.id)
            const done = pt.filter(t => t.status === 'done').length
            const open = pt.filter(t => t.status !== 'done').length
            const pct = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0

            return (
              <button
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sage-800 flex-1 pr-2">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0
                    ${p.status === 'active'    ? 'bg-sage-100 text-sage-600' :
                      p.status === 'completed' ? 'bg-green-50 text-green-600' :
                                                 'bg-gray-100 text-gray-500'}`}
                  >
                    {p.status}
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-sage-500 mb-3 line-clamp-2">{p.description}</p>
                )}

                <div className="flex gap-3 text-xs text-sage-400 mb-3">
                  <span>{open} open</span>
                  <span>·</span>
                  <span>{done} done</span>
                  {p.dueDate && <span>· Due {p.dueDate}</span>}
                </div>

                <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sage-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-sage-400 mt-1.5">{pct}% complete</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
