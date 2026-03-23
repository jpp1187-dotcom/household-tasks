import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useTasks } from '../contexts/TaskContext'
import { useAuth } from '../contexts/AuthContext'

const TEMPLATES = [
  { name: 'Upcoming Trip',        icon: '✈️' },
  { name: 'Groceries & Supplies', icon: '🛒' },
  { name: 'Media to Download',    icon: '🎬' },
]

const COLORS = [
  { label: 'Sage Green',  hex: '#4a7c4a' },
  { label: 'Clay Orange', hex: '#da6f28' },
  { label: 'Blue',        hex: '#378ADD' },
  { label: 'Purple',      hex: '#7F77DD' },
  { label: 'Coral',       hex: '#D85A30' },
  { label: 'Teal',        hex: '#1D9E75' },
]

export default function NewListModal({ onClose, navigate }) {
  const { addList } = useTasks()
  const { currentUser } = useAuth()

  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [name,   setName]   = useState('')
  const [icon,   setIcon]   = useState('📋')
  const [color,  setColor]  = useState('#4a7c4a')
  const [saving, setSaving] = useState(false)

  function selectTemplate(tpl) {
    setSelectedTemplate(tpl.name)
    setName(tpl.name)
    setIcon(tpl.icon)
  }

  async function handleCreate() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const created = await addList({ name: name.trim(), icon, color, createdBy: currentUser?.id })
      if (!created) { console.error('NewListModal: addList returned null'); return }
      onClose()
      if (created?.id) navigate('list', { listId: created.id })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-sage-100">
          <h2 className="font-display text-lg text-sage-800">New List</h2>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Template selector */}
          <div>
            <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest mb-3">Start from a template</p>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.name}
                  onClick={() => selectTemplate(tpl)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center
                    ${selectedTemplate === tpl.name
                      ? 'border-sage-500 bg-sage-50'
                      : 'border-sage-100 hover:border-sage-300 hover:bg-sage-50'}`}
                >
                  <span className="text-2xl">{tpl.icon}</span>
                  <span className="text-xs text-sage-600 leading-tight">{tpl.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name + icon input */}
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">List name</label>
            <div className="flex gap-2">
              <input
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-12 text-center border border-sage-200 rounded-lg px-1 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-sage-300"
                maxLength={2}
                title="Icon"
              />
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="My new list…"
                className="flex-1 border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <p className="text-xs font-semibold text-sage-500 mb-2">Color</p>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  title={c.label}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c.hex
                      ? 'ring-2 ring-offset-2 ring-sage-600 scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-5 border-t border-sage-50 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-sage-500 hover:text-sage-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40 hover:opacity-90"
            style={{ backgroundColor: color }}
          >
            {saving ? 'Creating…' : 'Create list'}
          </button>
        </div>

      </div>
    </div>
  )
}
