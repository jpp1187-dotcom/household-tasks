import React, { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { useHouseholds } from '../contexts/HouseholdContext'

export default function QuickTaskModal({ onClose, prefillResident = null, prefillHousehold = null, prefillListId = null }) {
  const { currentUser, allUsers } = useAuth()
  const { addTask, lists } = useTasks()
  const { residents, households } = useHouseholds()

  const activeLists = lists.filter(l => !l.archived)

  const [title, setTitle]                       = useState('')
  const [listId, setListId]                     = useState(prefillListId ?? activeLists[0]?.id ?? '')
  const [listError, setListError]               = useState(false)
  const [residentSearch, setResidentSearch]     = useState(
    prefillResident ? (prefillResident.preferredName || prefillResident.legalName) : ''
  )
  const [selectedResident, setSelectedResident] = useState(prefillResident)
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(
    prefillHousehold?.id ?? prefillResident?.householdId ?? ''
  )
  const [assignedTo, setAssignedTo]             = useState(currentUser?.id ?? '')
  const [priority, setPriority]                 = useState('medium')
  const [dueDate, setDueDate]                   = useState('')
  const [saving, setSaving]                     = useState(false)
  const [showResidentList, setShowResidentList] = useState(false)

  const activeResidents  = residents.filter(r => !r.archived)
  const activeHouseholds = households.filter(h => !h.archived)

  const filteredResidents = useMemo(() => {
    if (!residentSearch.trim()) return activeResidents
    const q = residentSearch.toLowerCase()
    return activeResidents.filter(r =>
      r.legalName.toLowerCase().includes(q) ||
      (r.preferredName && r.preferredName.toLowerCase().includes(q))
    )
  }, [activeResidents, residentSearch])

  function selectResident(r) {
    setSelectedResident(r)
    setResidentSearch(r.preferredName || r.legalName)
    setSelectedHouseholdId(r.householdId ?? '')
    setShowResidentList(false)
  }

  function clearResident() {
    setSelectedResident(null)
    setResidentSearch('')
    if (!prefillHousehold) setSelectedHouseholdId('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    if (!listId) { setListError(true); return }
    setSaving(true)
    try {
      await addTask({
        title:       title.trim(),
        listId,
        residentId:  selectedResident?.id ?? null,
        householdId: selectedHouseholdId || null,
        assignedTo:  assignedTo || null,
        createdBy:   currentUser?.id,
        priority,
        dueDate:     dueDate || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 bg-white"
  const labelCls = "block text-xs font-semibold text-sage-500 mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-sage-100">
          <h2 className="font-display text-lg text-sage-800">New Task</h2>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className={labelCls}>Task *</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What needs doing?" className={inputCls} />
          </div>

          {/* List (required) */}
          <div>
            <label className={labelCls}>List *</label>
            <select
              value={listId}
              onChange={e => { setListId(e.target.value); setListError(false) }}
              className={`${inputCls} ${listError ? 'border-red-400 ring-1 ring-red-300' : ''}`}
            >
              {activeLists.map(l => (
                <option key={l.id} value={l.id}>{l.icon} {l.name}</option>
              ))}
            </select>
            {listError && <p className="text-xs text-red-500 mt-1">Please select a list.</p>}
          </div>

          {/* Resident selector */}
          <div className="relative">
            <label className={labelCls}>Resident (optional)</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
              <input
                value={residentSearch}
                onChange={e => {
                  setResidentSearch(e.target.value)
                  setShowResidentList(true)
                  if (!e.target.value) clearResident()
                }}
                onFocus={() => setShowResidentList(true)}
                placeholder="Search resident…"
                className={`${inputCls} pl-8`}
                disabled={!!prefillResident}
              />
            </div>
            {showResidentList && !prefillResident && filteredResidents.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-sage-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto py-1">
                {filteredResidents.slice(0, 8).map(r => (
                  <button key={r.id} type="button"
                    onMouseDown={() => selectResident(r)}
                    className="w-full text-left px-4 py-2 text-sm text-sage-700 hover:bg-sage-50"
                  >
                    {r.preferredName || r.legalName}
                    {r.preferredName && <span className="text-xs text-sage-400 ml-1">({r.legalName})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Household dropdown */}
          <div>
            <label className={labelCls}>Household (optional)</label>
            <select
              value={selectedHouseholdId}
              onChange={e => setSelectedHouseholdId(e.target.value)}
              className={inputCls}
              disabled={!!selectedResident}
            >
              <option value="">— No household —</option>
              {activeHouseholds.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {selectedResident && (
              <p className="text-xs text-sage-400 mt-1">Auto-filled from resident's household.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Assigned to */}
            <div>
              <label className={labelCls}>Assign to</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={inputCls}>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className={labelCls}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className={labelCls}>Due date (optional)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-sage-500 hover:text-sage-700">
              Cancel
            </button>
            <button type="submit" disabled={saving || !title.trim()}
              className="px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors">
              {saving ? 'Adding…' : '+ Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
