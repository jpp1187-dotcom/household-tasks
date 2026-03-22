import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useTasks } from '../contexts/TaskContext'

const ICONS = ['🏠', '🛒', '✈️', '💭', '📋', '🎯', '🎒', '🌱', '💊', '🔧']

export default function AddListModal({ onClose, onCreated }) {
  const { addList } = useTasks()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📋')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const list = await addList({ name: name.trim(), icon })
    onCreated(list.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-sage-100">
          <h2 className="font-display text-lg text-sage-800">New List</h2>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Trip: Portugal"
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button
                  key={ic} type="button"
                  onClick={() => setIcon(ic)}
                  className={`text-xl p-1.5 rounded-lg border-2 transition-colors
                    ${icon === ic ? 'border-sage-400 bg-sage-50' : 'border-transparent hover:border-sage-200'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-sage-500 hover:text-sage-700">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors">
              Create List
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
