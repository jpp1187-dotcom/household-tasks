import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'

export default function HouseholdList({ onSelectHousehold }) {
  const { isAdmin } = useAuth()
  const { households, projects, addHousehold } = useHouseholds()
  const { tasks } = useTasks()
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await addHousehold({ name: newName.trim(), address: newAddress.trim() })
    setNewName('')
    setNewAddress('')
    setShowForm(false)
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Households</h2>
          <p className="text-xs text-sage-400 mt-1">
            {households.length} household{households.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin() && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Household
          </button>
        )}
      </div>

      {/* Inline add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white border-2 border-sage-200 rounded-xl p-4 mb-6 max-w-md space-y-2"
        >
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Household name…"
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          <input
            value={newAddress}
            onChange={e => setNewAddress(e.target.value)}
            placeholder="Address (optional)"
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          <div className="flex gap-2 pt-1">
            <button type="submit" className="px-4 py-1.5 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-sage-400 hover:text-sage-600">
              Cancel
            </button>
          </div>
        </form>
      )}

      {households.length === 0 ? (
        <div className="text-center py-24 text-sage-300">
          <p className="text-4xl mb-3">🏘️</p>
          <p className="text-sm">No households yet.</p>
          {isAdmin() && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-sage-500 underline">
              Create your first household
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
          {households.map(h => {
            const hProjects = projects.filter(p => p.householdId === h.id)
            const hIds = new Set(hProjects.map(p => p.id))
            const hTasks = tasks.filter(t => hIds.has(t.projectId))
            const openCount = hTasks.filter(t => t.status !== 'done').length

            return (
              <button
                key={h.id}
                onClick={() => onSelectHousehold(h.id)}
                className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-sage-800 truncate">{h.name}</h3>
                    {h.address && <p className="text-xs text-sage-400 mt-0.5 truncate">{h.address}</p>}
                  </div>
                  <span className="text-2xl shrink-0">🏠</span>
                </div>

                {h.description && (
                  <p className="text-xs text-sage-500 mb-3 line-clamp-2">{h.description}</p>
                )}

                <div className="flex gap-3 text-xs text-sage-400 mb-4">
                  <span>{hProjects.length} project{hProjects.length !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{openCount} open task{openCount !== 1 ? 's' : ''}</span>
                </div>

                {/* Project mini-progress bars */}
                {hProjects.length > 0 && (
                  <div className="space-y-1.5">
                    {hProjects.slice(0, 3).map(p => {
                      const pt = tasks.filter(t => t.projectId === p.id)
                      const pct = pt.length > 0
                        ? Math.round((pt.filter(t => t.status === 'done').length / pt.length) * 100)
                        : 0
                      return (
                        <div key={p.id}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-sage-600 truncate">{p.name}</span>
                            <span className="text-xs text-sage-400 ml-2 shrink-0">{pct}%</span>
                          </div>
                          <div className="h-1 bg-sage-100 rounded-full overflow-hidden">
                            <div className="h-full bg-sage-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                    {hProjects.length > 3 && (
                      <p className="text-xs text-sage-400">+{hProjects.length - 3} more</p>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
