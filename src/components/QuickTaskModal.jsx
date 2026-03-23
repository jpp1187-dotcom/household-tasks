import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'

export default function QuickTaskModal({ onClose, prefillListId = null }) {
  const { currentUser, allUsers } = useAuth()
  const { addTask, lists } = useTasks()

  const activeLists = lists.filter(l => !l.archived)

  const [title,     setTitle]     = useState('')
  const [listId,    setListId]    = useState(prefillListId ?? activeLists[0]?.id ?? '')
  const [listError, setListError] = useState(false)
  const [assignedTo, setAssignedTo] = useState(currentUser?.id ?? '')
  const [priority,  setPriority]  = useState('medium')
  const [dueDate,   setDueDate]   = useState('')
  const [saving,    setSaving]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    if (!listId) { setListError(true); return }
    setSaving(true)
    try {
      await addTask({
        title:     title.trim(),
        listId,
        assignedTo: assignedTo || null,
        createdBy:  currentUser?.id,
        priority,
        dueDate:   dueDate || null,
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
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs doing?"
              className={inputCls}
            />
          </div>

          {/* List (required) */}
          <div>
            <label className={labelCls}>List *</label>
            <select
              value={listId}
              onChange={e => { setListId(e.target.value); setListError(false) }}
              className={`${inputCls} ${listError ? 'border-red-400 ring-1 ring-red-300' : ''}`}
            >
              <option value="">— Select a list —</option>
              {activeLists.map(l => (
                <option key={l.id} value={l.id}>{l.icon} {l.name}</option>
              ))}
            </select>
            {listError && <p className="text-xs text-red-500 mt-1">Please select a list.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Assigned to */}
            <div>
              <label className={labelCls}>Assign to</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={inputCls}>
                <option value="">— Anyone —</option>
                {(allUsers ?? []).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
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
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Adding…' : '+ Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
