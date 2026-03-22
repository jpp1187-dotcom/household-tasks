import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'

export default function AddTaskModal({ listId, onClose }) {
  const { currentUser, allUsers } = useAuth()
  const { addTask } = useTasks()

  const [form, setForm] = useState({
    title: '',
    assignedTo: currentUser.id,
    priority: 'medium',
    dueDate: '',
    notes: '',
  })

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    addTask({
      ...form,
      listId,
      createdBy: currentUser.id,
      dueDate: form.dueDate || null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-sage-100">
          <h2 className="font-display text-lg text-sage-800">New Task</h2>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Task</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="What needs doing?"
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
          </div>

          {/* Assign + Priority row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-sage-500 mb-1">Assign to</label>
              <select
                value={form.assignedTo}
                onChange={e => set('assignedTo', e.target.value)}
                className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-700 bg-white"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.avatar} {u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-sage-500 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-700 bg-white"
              >
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Due date (optional)</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => set('dueDate', e.target.value)}
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-700"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any extra details..."
              rows={2}
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-700 placeholder-sage-300 resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-sage-500 hover:text-sage-700">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors">
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
