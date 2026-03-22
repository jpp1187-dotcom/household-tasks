import React, { useState } from 'react'
import { Check, Trash2, ChevronDown, ChevronUp, Calendar, User, Archive, MoreVertical } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'

const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-clay-50 text-clay-600 border-clay-200',
  low:    'bg-sage-50 text-sage-500 border-sage-200',
}

const STATUS_STYLES = {
  todo:        'text-sage-400',
  in_progress: 'text-clay-500 font-semibold',
  done:        'line-through text-sage-300',
}

function ConfirmModal({ title, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-display text-lg text-sage-800 mb-2">Delete task?</h3>
        <p className="text-sm text-sage-500 mb-2">"{title}"</p>
        <p className="text-sm text-sage-400 mb-6">This cannot be undone.</p>
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

export default function TaskCard({ task }) {
  const { canEdit, isAdmin, allUsers } = useAuth()
  const { toggleDone, deleteTask, updateTask, archiveTask } = useTasks()
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const assignee = allUsers.find(u => u.id === task.assignedTo)
  const creator  = allUsers.find(u => u.id === task.createdBy)

  function handleAssign(e) { updateTask(task.id, { assignedTo: e.target.value }) }
  function handlePriority(e) { updateTask(task.id, { priority: e.target.value }) }
  function handleStatus(e) { updateTask(task.id, { status: e.target.value }) }

  return (
    <>
      <div className={`bg-white rounded-xl border border-sage-100 shadow-sm transition-all
        ${task.status === 'done' ? 'opacity-60' : ''}`}
      >
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Checkbox */}
          <button
            onClick={() => canEdit() && toggleDone(task.id)}
            disabled={!canEdit()}
            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
              ${task.status === 'done'
                ? 'bg-sage-400 border-sage-400'
                : 'border-sage-300 hover:border-sage-500'}`}
          >
            {task.status === 'done' && <Check size={11} className="text-white" />}
          </button>

          {/* Title */}
          <span className={`flex-1 text-sm ${STATUS_STYLES[task.status]}`}>
            {task.title}
          </span>

          {/* Priority badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLES[task.priority]}`}>
            {task.priority}
          </span>

          {/* Assignee avatar */}
          {assignee && (
            <span title={`Assigned to ${assignee.name}`} className="text-base">{assignee.avatar}</span>
          )}

          {/* Three-dot menu */}
          {canEdit() && (
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="text-sage-300 hover:text-sage-600 p-0.5 rounded transition-colors"
              >
                <MoreVertical size={15} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-20 bg-white border border-sage-200 rounded-xl shadow-lg py-1 min-w-36">
                  <button
                    onClick={() => { archiveTask(task.id); setMenuOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-sage-700 hover:bg-sage-50 flex items-center gap-2"
                  >
                    <Archive size={13} /> Archive
                  </button>
                  {isAdmin() && (
                    <button
                      onClick={() => { setConfirmDelete(true); setMenuOpen(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Expand toggle */}
          <button onClick={() => setExpanded(v => !v)} className="text-sage-300 hover:text-sage-500">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="px-4 pb-4 pt-1 border-t border-sage-50 space-y-3">
            {task.notes && (
              <p className="text-xs text-sage-500 italic">{task.notes}</p>
            )}

            <div className="flex flex-wrap gap-2 text-xs text-sage-400">
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  Due {task.dueDate}
                </span>
              )}
              {creator && (
                <span className="flex items-center gap-1">
                  <User size={11} />
                  Created by {creator.name}
                </span>
              )}
            </div>

            {canEdit() && (
              <div className="flex flex-wrap gap-2">
                <select
                  value={task.assignedTo}
                  onChange={handleAssign}
                  className="text-xs border border-sage-200 rounded-lg px-2 py-1 text-sage-600 bg-white"
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.avatar} {u.name}</option>
                  ))}
                </select>

                <select
                  value={task.status}
                  onChange={handleStatus}
                  className="text-xs border border-sage-200 rounded-lg px-2 py-1 text-sage-600 bg-white"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>

                <select
                  value={task.priority}
                  onChange={handlePriority}
                  className="text-xs border border-sage-200 rounded-lg px-2 py-1 text-sage-600 bg-white capitalize"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title={task.title}
          onConfirm={() => { deleteTask(task.id); setConfirmDelete(false) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
