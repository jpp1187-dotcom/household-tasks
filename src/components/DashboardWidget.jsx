import React from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * DashboardWidget — controls visibility and provides edit-mode overlay.
 *
 * Props:
 *   id        string  — unique widget id
 *   visible   bool    — whether widget is shown in normal mode
 *   editMode  bool    — when true, all widgets render with a toggle overlay
 *   onToggle  fn(id)  — called when overlay is clicked
 *   children  node    — the widget card
 */
export default function DashboardWidget({ id, visible, editMode, onToggle, children }) {
  if (!visible && !editMode) return null

  return (
    <div className={`relative transition-opacity duration-200 ${!visible && editMode ? 'opacity-40' : ''}`}>
      {editMode && (
        <button
          onClick={() => onToggle?.(id)}
          className="absolute inset-0 z-10 flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors cursor-pointer"
          aria-label={visible ? 'Hide widget' : 'Show widget'}
        >
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg
            ${visible
              ? 'bg-sage-700 text-white border border-sage-700'
              : 'bg-white text-sage-500 border border-sage-300'
            }`}
          >
            {visible ? <Eye size={12} /> : <EyeOff size={12} />}
            {visible ? 'Visible' : 'Hidden'}
          </span>
        </button>
      )}
      {children}
    </div>
  )
}
