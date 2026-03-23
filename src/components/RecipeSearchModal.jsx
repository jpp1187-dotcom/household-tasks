import React, { useState } from 'react'
import { X, Search, Loader, ExternalLink, Download, ChefHat } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const SERPER_KEY = import.meta.env.VITE_SERPER_API_KEY

// Infer tags from title + snippet text
function inferTags(title = '', snippet = '') {
  const text = `${title} ${snippet}`.toLowerCase()
  const map = {
    pasta:      ['pasta','spaghetti','fettuccine','penne','linguine','rigatoni','noodle'],
    salad:      ['salad'],
    dessert:    ['cake','cookie','pie','dessert','brownie','muffin','cupcake','pudding'],
    breakfast:  ['breakfast','pancake','waffle','oatmeal','granola','frittata','omelette'],
    soup:       ['soup','chowder','bisque','stew','broth','chili'],
    chicken:    ['chicken','poultry'],
    beef:       ['beef','steak','burger','meatball','meatloaf','brisket'],
    fish:       ['fish','salmon','tuna','shrimp','seafood','crab','lobster','scallop'],
    vegetarian: ['vegetarian','veggie','vegan','plant-based','tofu'],
    sandwich:   ['sandwich','wrap','sub','panini','toast'],
    snack:      ['snack','dip','hummus','chips','appetizer'],
  }
  return Object.entries(map)
    .filter(([, words]) => words.some(w => text.includes(w)))
    .map(([tag]) => tag)
    .slice(0, 4)
}

// Strip the " - SiteName" suffix from recipe titles
function cleanTitle(raw = '') {
  return raw
    .replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '')
    .replace(/\s*\|\s*[^|]+$/, '')
    .trim()
}

export default function RecipeSearchModal({ onClose, onImported }) {
  const { currentUser } = useAuth()
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(null)  // url of result being saved
  const [saved,   setSaved]   = useState(new Set())

  async function handleSearch(e) {
    e?.preventDefault()
    if (!query.trim() || loading) return
    if (!SERPER_KEY) {
      setError('VITE_SERPER_API_KEY is not set in .env.local. Get a free key at serper.dev.')
      return
    }
    setLoading(true)
    setError('')
    setResults([])
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: `${query.trim()} recipe`, num: 10 }),
      })
      if (!res.ok) throw new Error(`Search API error ${res.status}`)
      const data = await res.json()
      const organic = data.organic ?? []
      if (organic.length === 0) setError('No results found — try different keywords.')
      setResults(organic)
    } catch (err) {
      setError(err.message ?? 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(result) {
    if (saving || saved.has(result.link)) return
    setSaving(result.link)
    setError('')
    try {
      const title = cleanTitle(result.title)
      const tags  = inferTags(result.title, result.snippet)
      const { error: dbErr } = await supabase.from('recipes').insert({
        title,
        description: result.snippet ?? '',
        tags,
        source_url:   result.link,
        created_by:   currentUser?.id,
        prep_time:    0,
        cook_time:    0,
        servings:     null,
        ingredients:  [],
        instructions: [],
        photo_url:    result.imageUrl ?? null,
      })
      if (dbErr) throw dbErr
      setSaved(prev => new Set([...prev, result.link]))
      onImported?.()
    } catch (err) {
      setError('Save failed: ' + (err.message ?? err))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col">

        {/* ── Header / search bar ── */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-sage-100">
          <ChefHat size={18} className="text-sage-400 shrink-0" />
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search recipes… e.g. 'chicken tikka masala'"
              className="flex-1 text-sm text-sage-700 focus:outline-none min-w-0"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-sage-600 text-white text-xs font-semibold rounded-lg hover:bg-sage-700 disabled:opacity-40 transition-colors"
            >
              {loading ? <Loader size={13} className="animate-spin" /> : <Search size={13} />}
              Search
            </button>
          </form>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600 shrink-0 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Results body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-14 text-sage-300">
              <Loader size={28} className="animate-spin mb-3" />
              <p className="text-sm">Searching…</p>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-14 text-sage-300 text-center">
              <ChefHat size={36} className="mb-3 opacity-40" />
              <p className="text-sm font-medium text-sage-500 mb-1">Find any recipe online</p>
              <p className="text-xs">Type a dish name and hit Search to import it into your recipe collection.</p>
              {!SERPER_KEY && (
                <p className="text-xs text-amber-600 mt-4 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 max-w-sm">
                  ⚠️ Add <code className="font-mono">VITE_SERPER_API_KEY</code> to <code className="font-mono">.env.local</code> to enable search.
                  Get a free key at <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" className="underline">serper.dev</a>.
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {results.map(result => {
              const isSaved   = saved.has(result.link)
              const isSaving  = saving === result.link
              let hostname = ''
              try { hostname = new URL(result.link).hostname.replace('www.', '') } catch { /* ignore */ }

              return (
                <div key={result.link} className="flex gap-3 bg-sage-50 rounded-xl p-4 border border-sage-100 hover:border-sage-200 transition-colors">
                  {/* Thumbnail */}
                  {result.imageUrl && (
                    <img
                      src={result.imageUrl}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover shrink-0 bg-sage-100"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5 mb-1">
                      <p className="font-semibold text-sage-800 text-sm leading-snug flex-1 line-clamp-2">
                        {cleanTitle(result.title)}
                      </p>
                      <a
                        href={result.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-sage-300 hover:text-sage-600 transition-colors mt-0.5"
                        title="Open original"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                    {result.snippet && (
                      <p className="text-xs text-sage-500 line-clamp-2 leading-relaxed">{result.snippet}</p>
                    )}
                    <p className="text-xs text-sage-400 mt-1.5">{hostname}</p>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleImport(result)}
                    disabled={isSaving || isSaved}
                    className={`shrink-0 self-center flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                      ${isSaved
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50'}`}
                  >
                    {isSaving
                      ? <Loader size={12} className="animate-spin" />
                      : isSaved
                        ? '✓ Saved'
                        : <><Download size={12} /> Save</>
                    }
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        {results.length > 0 && (
          <div className="px-5 py-3 border-t border-sage-100 text-xs text-sage-400 text-center">
            {saved.size > 0
              ? `${saved.size} recipe${saved.size !== 1 ? 's' : ''} saved to your collection`
              : `${results.length} results · click Save to add to your recipes`}
          </div>
        )}
      </div>
    </div>
  )
}
