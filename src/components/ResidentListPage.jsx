import React, { useState } from 'react'
import { Search, Archive } from 'lucide-react'
import { useHouseholds } from '../contexts/HouseholdContext'

export default function ResidentListPage({ onSelectResident }) {
  const { residents, households } = useHouseholds()
  const [search, setSearch] = useState('')
  const [householdFilter, setHouseholdFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const activeResidents = residents.filter(r => !r.archived)
  const archivedCount = residents.filter(r => r.archived).length

  let visible = showArchived ? residents : activeResidents
  if (householdFilter) visible = visible.filter(r => r.householdId === householdFilter)
  if (search.trim()) {
    const q = search.toLowerCase()
    visible = visible.filter(r =>
      r.legalName.toLowerCase().includes(q) ||
      (r.preferredName && r.preferredName.toLowerCase().includes(q))
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Residents</h2>
          <p className="text-xs text-sage-400 mt-1">
            {activeResidents.length} resident{activeResidents.length !== 1 ? 's' : ''}
            {archivedCount > 0 && `, ${archivedCount} archived`}
          </p>
        </div>
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
              ${showArchived ? 'bg-sage-100 border-sage-300 text-sage-700' : 'border-sage-200 text-sage-400 hover:bg-sage-50'}`}
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search residents…"
            className="pl-8 pr-3 py-1.5 text-sm border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300 bg-white"
          />
        </div>
        <select value={householdFilter} onChange={e => setHouseholdFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-sage-200 rounded-lg text-sage-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300">
          <option value="">All households</option>
          {households.filter(h => !h.archived).map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-20 text-sage-300">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-sm">{search ? 'No residents match your search.' : 'No residents yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
          {visible.map(r => {
            const household = households.find(h => h.id === r.householdId)
            const words = (r.legalName ?? '').trim().split(/\s+/)
            const initials = words.length >= 2
              ? (words[0][0] ?? '').toUpperCase() + (words[words.length - 1][0] ?? '').toUpperCase()
              : (words[0]?.[0] ?? '?').toUpperCase()

            return (
              <button
                key={r.id}
                onClick={() => onSelectResident(r.id, r.householdId)}
                disabled={r.archived}
                className={`bg-white rounded-xl border p-4 text-left transition-shadow
                  ${r.archived ? 'opacity-60 border-sage-200 cursor-default' : 'border-sage-100 shadow-sm hover:shadow-md'}`}
              >
                {r.archived && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-sage-100 text-sage-500 rounded-full mb-2">
                    <Archive size={10} /> Archived
                  </span>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-sage-200 flex items-center justify-center text-sm font-semibold text-sage-700 shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-sage-800 truncate">
                      {r.preferredName || r.legalName}
                    </p>
                    {r.preferredName && (
                      <p className="text-xs text-sage-400 truncate">{r.legalName}</p>
                    )}
                  </div>
                </div>
                {household && (
                  <p className="text-xs text-sage-400">🏠 {household.name}</p>
                )}
                {r.primaryLanguage && (
                  <p className="text-xs text-sage-400 mt-0.5">🗣 {r.primaryLanguage}</p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
