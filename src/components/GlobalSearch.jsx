import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, User, Home, CheckSquare, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useHouseholds } from '../contexts/HouseholdContext'

const ICONS = {
  resident:  { icon: User,        color: 'text-sage-500',   bg: 'bg-sage-50' },
  household: { icon: Home,        color: 'text-clay-500',   bg: 'bg-clay-50' },
  task:      { icon: CheckSquare, color: 'text-blue-500',   bg: 'bg-blue-50' },
  note:      { icon: FileText,    color: 'text-purple-500', bg: 'bg-purple-50' },
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function GlobalSearch({ navigate }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debouncedQuery = useDebounce(query, 300)

  const { households } = useHouseholds()

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    const q = debouncedQuery.trim()
    setLoading(true)

    const LIMIT = 5
    Promise.all([
      supabase.from('residents').select('id, legal_name, preferred_name, household_id')
        .ilike('legal_name', `%${q}%`).limit(LIMIT),
      supabase.from('households').select('id, name, address')
        .ilike('name', `%${q}%`).limit(LIMIT),
      supabase.from('tasks').select('id, title, project_id, list_id')
        .ilike('title', `%${q}%`).limit(LIMIT),
      supabase.from('notes').select('id, content, entity_id, entity_type')
        .or(`content.ilike.%${q}%,subjective.ilike.%${q}%`).limit(LIMIT),
    ]).then(([rRes, hRes, tRes, nRes]) => {
      const grouped = []

      const residents = rRes.data ?? []
      if (residents.length) {
        grouped.push({ type: 'resident', label: 'Residents', items: residents.map(r => ({
          id: r.id,
          type: 'resident',
          title: r.legal_name,
          subtitle: r.preferred_name ? `Goes by ${r.preferred_name}` : (
            households.find(h => h.id === r.household_id)?.name ?? ''
          ),
          householdId: r.household_id,
        })) })
      }

      const hh = hRes.data ?? []
      if (hh.length) {
        grouped.push({ type: 'household', label: 'Households', items: hh.map(h => ({
          id: h.id,
          type: 'household',
          title: h.name,
          subtitle: h.address,
        })) })
      }

      const tasks = tRes.data ?? []
      if (tasks.length) {
        grouped.push({ type: 'task', label: 'Tasks', items: tasks.map(t => ({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: t.project_id ? 'In a project' : 'Personal list',
          projectId: t.project_id,
        })) })
      }

      if (!nRes.error) {
        const notes = nRes.data ?? []
        if (notes.length) {
          grouped.push({ type: 'note', label: 'Notes', items: notes.map(n => ({
            id: n.id,
            type: 'note',
            title: (n.content || n.subjective || '').slice(0, 60) + '…',
            subtitle: `${n.entity_type} note`,
            entityId: n.entity_id,
            entityType: n.entity_type,
          })) })
        }
      }

      setResults(grouped)
      setOpen(grouped.length > 0)
      setLoading(false)
    })
  }, [debouncedQuery])

  function handleSelect(item) {
    setOpen(false)
    setQuery('')
    switch (item.type) {
      case 'resident':
        navigate('resident', { residentId: item.id, householdId: item.householdId })
        break
      case 'household':
        navigate('household', { householdId: item.id })
        break
      case 'task':
        // Navigate to project if linked, else my-tasks
        if (item.projectId) navigate('project', { projectId: item.projectId })
        else navigate('my-tasks')
        break
      case 'note':
        if (item.entityType === 'resident') navigate('resident', { residentId: item.entityId })
        else if (item.entityType === 'household') navigate('household', { householdId: item.entityId })
        break
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      {/* Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search residents, tasks…"
          className="w-full pl-8 pr-8 py-1.5 text-sm border border-sage-200 rounded-xl bg-sage-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 text-sage-700 placeholder-sage-400 transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-300 hover:text-sage-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-sage-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto py-1">
          {loading && <p className="text-xs text-sage-400 px-4 py-3">Searching…</p>}

          {!loading && results.length === 0 && query.length >= 2 && (
            <p className="text-xs text-sage-400 px-4 py-3">No results for "{query}"</p>
          )}

          {results.map(group => {
            const cfg = ICONS[group.type]
            const Icon = cfg.icon
            return (
              <div key={group.type}>
                <p className="text-xs font-semibold text-sage-400 uppercase tracking-widest px-4 pt-3 pb-1">
                  {group.label}
                </p>
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sage-50 transition-colors text-left"
                  >
                    <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={13} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-sage-800 truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-sage-400 truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
