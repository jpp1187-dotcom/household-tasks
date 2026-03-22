import React, { useState } from 'react'
import { Plus, MoreVertical, Archive, Trash2, RotateCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'

function ConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-display text-lg text-sage-800 mb-2">Delete household?</h3>
        <p className="text-sm text-sage-600 mb-1">"{name}"</p>
        <p className="text-sm text-sage-400 mb-6">
          This cannot be undone. All associated residents, projects, and tasks will be deleted.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm border border-sage-200 rounded-xl text-sage-600 hover:bg-sage-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function HouseholdMenu({ household, onArchive, onRestore, onDelete, isAdmin }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="p-1 text-sage-300 hover:text-sage-600 rounded transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 bg-white border border-sage-200 rounded-xl shadow-lg py-1 min-w-40">
          {household.archived ? (
            <button
              onClick={() => { onRestore(); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-sage-700 hover:bg-sage-50 flex items-center gap-2"
            >
              <RotateCcw size={13} /> Restore
            </button>
          ) : (
            <button
              onClick={() => { onArchive(); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-sage-700 hover:bg-sage-50 flex items-center gap-2"
            >
              <Archive size={13} /> Archive
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => { onDelete(); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function HouseholdList({ onSelectHousehold }) {
  const { isAdmin } = useAuth()
  const { households, projects, archiveHousehold, restoreHousehold, deleteHousehold, addHousehold } = useHouseholds()
  const { tasks } = useTasks()
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // household id

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await addHousehold({ name: newName.trim(), address: newAddress.trim() })
    setNewName('')
    setNewAddress('')
    setShowForm(false)
  }

  const active   = households.filter(h => !h.archived)
  const archived = households.filter(h => h.archived)
  const visible  = showArchived ? households : active

  const confirmH = confirmDelete ? households.find(h => h.id === confirmDelete) : null

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Households</h2>
          <p className="text-xs text-sage-400 mt-1">
            {active.length} household{active.length !== 1 ? 's' : ''}
            {archived.length > 0 && `, ${archived.length} archived`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {archived.length > 0 && isAdmin() && (
            <button
              onClick={() => setShowArchived(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                ${showArchived ? 'bg-sage-100 border-sage-300 text-sage-700' : 'border-sage-200 text-sage-400 hover:bg-sage-50'}`}
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </button>
          )}
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
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border-2 border-sage-200 rounded-xl p-4 mb-6 max-w-md space-y-2">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Household name…"
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
          <input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Address (optional)"
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
          <div className="flex gap-2 pt-1">
            <button type="submit" className="px-4 py-1.5 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-sage-400 hover:text-sage-600">Cancel</button>
          </div>
        </form>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-24 text-sage-300">
          <p className="text-4xl mb-3">🏘️</p>
          <p className="text-sm">No households yet.</p>
          {isAdmin() && <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-sage-500 underline">Create your first household</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
          {visible.map(h => {
            const hProjects = projects.filter(p => p.householdId === h.id)
            const hIds = new Set(hProjects.map(p => p.id))
            const hTasks = tasks.filter(t => hIds.has(t.projectId))
            const openCount = hTasks.filter(t => t.status !== 'done').length

            return (
              <div key={h.id} className={`relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow
                ${h.archived ? 'opacity-60 border-sage-200' : 'border-sage-100'}`}
              >
                {/* Three-dot menu */}
                <div className="absolute top-4 right-4 z-10">
                  <HouseholdMenu
                    household={h}
                    onArchive={() => archiveHousehold(h.id)}
                    onRestore={() => restoreHousehold(h.id)}
                    onDelete={() => setConfirmDelete(h.id)}
                    isAdmin={isAdmin()}
                  />
                </div>

                <button
                  onClick={() => !h.archived && onSelectHousehold(h.id)}
                  className="w-full text-left p-5 pr-12"
                >
                  {h.archived && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-sage-100 text-sage-500 rounded-full mb-2">
                      <Archive size={10} /> Archived
                    </span>
                  )}
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
                      {hProjects.length > 3 && <p className="text-xs text-sage-400">+{hProjects.length - 3} more</p>}
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {confirmH && (
        <ConfirmModal
          name={confirmH.name}
          onConfirm={() => { deleteHousehold(confirmH.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
