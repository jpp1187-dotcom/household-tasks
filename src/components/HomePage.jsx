import React, { useState, useEffect } from 'react'
import { Clock, Users, LayoutDashboard, RotateCcw, Eye, EyeOff, AlertCircle, CheckSquare, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { supabase } from '../lib/supabase'
import AgendaCard from './AgendaCard'
import GmailCard from './GmailCard'
import DashboardWidget from './DashboardWidget'

// ── Widget layout definitions ──────────────────────────────────────────────────
const WIDGET_DEFS = [
  { id: 'lists',    label: 'Current Lists' },
  { id: 'tasks',    label: 'My Tasks' },
  { id: 'finances', label: 'Financial Overview' },
  { id: 'puzzles',  label: 'Puzzle of the Day' },
  { id: 'notes',    label: 'Shared Notes' },
  { id: 'recipes',  label: 'Recent Recipes' },
  { id: 'calendar', label: 'Google Agenda' },
  { id: 'gmail',    label: 'Gmail' },
]
const ALL_IDS = WIDGET_DEFS.map(w => w.id)
const LAYOUT_KEY = 'gormbase_dashboard_layout'

function parseLayout(raw) {
  const vis = {}
  ALL_IDS.forEach(id => { vis[id] = true })
  if (raw?.hidden && Array.isArray(raw.hidden)) {
    raw.hidden.forEach(id => { if (ALL_IDS.includes(id)) vis[id] = false })
  }
  return vis
}

// ── Timezone list ──────────────────────────────────────────────────────────────
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Toronto', 'America/Vancouver',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Rome', 'Europe/Madrid', 'Europe/Amsterdam',
  'Asia/Tokyo', 'Asia/Dubai', 'Asia/Singapore',
  'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  'Pacific/Auckland', 'UTC',
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 60)  return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days  = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function weatherEmoji(code) {
  if (code === 0)  return '☀️'
  if (code <= 3)   return '⛅'
  if (code <= 48)  return '🌫️'
  if (code <= 67)  return '🌧️'
  if (code <= 77)  return '❄️'
  if (code <= 82)  return '🌦️'
  if (code >= 95)  return '⛈️'
  return '🌤️'
}

// ── Recipe emoji helper ────────────────────────────────────────────────────────
const TAG_EMOJI = {
  pasta: '🍝', salad: '🥗', dessert: '🍰', breakfast: '🍳',
  soup: '🍲', sandwich: '🥪', chicken: '🍗', fish: '🐟',
  vegetarian: '🥦', vegan: '🌱', beef: '🥩', snack: '🍿',
}
function recipeEmoji(tags) {
  if (!tags?.length) return '🍳'
  for (const t of tags) { const k = t.toLowerCase(); if (TAG_EMOJI[k]) return TAG_EMOJI[k] }
  return '🍳'
}

// ── Shared MiniCard shell ──────────────────────────────────────────────────────
function MiniCard({ icon, title, onNavigate, to, children }) {
  return (
    <div className="bg-white rounded-xl border border-sage-100 shadow-sm flex flex-col min-h-[220px]">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sage-50 shrink-0">
        <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          {title}
        </p>
        {to && onNavigate && (
          <button
            onClick={e => { e.stopPropagation(); onNavigate(to) }}
            className="text-xs text-sage-400 hover:text-sage-600 transition-colors"
          >
            View all →
          </button>
        )}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}

// ── ListsCard ──────────────────────────────────────────────────────────────────
function ListsCard({ lists, tasks, navigate }) {
  const activeLists = lists.filter(l => !l.archived)
  function openCountForList(listId) {
    return tasks.filter(t => t.listId === listId && t.status !== 'done' && !t.archived).length
  }
  const totalOpen = tasks.filter(t => t.status !== 'done' && !t.archived).length

  return (
    <MiniCard icon="📋" title="Current Lists" onNavigate={navigate} to="my-tasks">
      <div className="flex flex-col h-full">
        <div className="flex-1 divide-y divide-sage-50">
          {activeLists.length === 0 ? (
            <p className="px-5 py-4 text-xs text-sage-300 text-center">No lists yet.</p>
          ) : (
            activeLists.map(list => {
              const count = openCountForList(list.id)
              return (
                <button
                  key={list.id}
                  onClick={() => navigate('list', { listId: list.id })}
                  className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-sage-50 transition-colors text-left"
                >
                  <span className="text-base leading-none shrink-0">{list.icon}</span>
                  <span className="flex-1 text-sm text-sage-700 truncate">{list.name}</span>
                  {count > 0 && (
                    <span className="text-xs font-semibold text-sage-500 shrink-0">{count}</span>
                  )}
                </button>
              )
            })
          )}
        </div>
        <div
          className="px-5 py-3 border-t border-sage-50 cursor-pointer hover:bg-sage-50 transition-colors"
          onClick={() => navigate('my-tasks')}
        >
          <p className="text-xs text-sage-400">
            <span className="font-semibold text-sage-600">{totalOpen}</span> open task{totalOpen !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>
    </MiniCard>
  )
}

// ── TasksCard ──────────────────────────────────────────────────────────────────
function TasksCard({ openTasks, lists, navigate }) {
  const shown = openTasks.slice(0, 3)
  const extra = openTasks.length - 3

  return (
    <MiniCard icon={<CheckSquare size={12} className="text-sage-400" />} title="My Tasks" onNavigate={navigate} to="my-tasks">
      {openTasks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-10 text-sage-300 cursor-pointer hover:bg-sage-50 transition-colors h-full"
          onClick={() => navigate('my-tasks')}
        >
          <p className="text-2xl mb-1">✓</p>
          <p className="text-xs">All caught up!</p>
        </div>
      ) : (
        <div className="divide-y divide-sage-50">
          {shown.map(t => {
            const isOverdue = t.due_date && t.due_date < today()
            return (
              <button
                key={t.id}
                onClick={() => navigate('my-tasks')}
                className="w-full text-left px-5 py-3 hover:bg-sage-50 transition-colors flex items-start gap-2"
              >
                {isOverdue
                  ? <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                  : <span className="w-3 h-3 rounded-full border border-sage-300 mt-0.5 shrink-0" />
                }
                <span className="flex-1 text-sm text-sage-800 truncate">{t.title}</span>
                {t.due_date && (
                  <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-sage-400'}`}>
                    {t.due_date}
                  </span>
                )}
              </button>
            )
          })}
          {extra > 0 && (
            <button
              onClick={() => navigate('my-tasks')}
              className="w-full text-left px-5 py-3 hover:bg-sage-50 transition-colors text-xs text-sage-400"
            >
              +{extra} more
            </button>
          )}
        </div>
      )}
    </MiniCard>
  )
}

// ── FinancesCard ───────────────────────────────────────────────────────────────
function FinancesCard({ billsTotal, spendTotal, navigate }) {
  return (
    <MiniCard icon="💰" title="Financial Overview" onNavigate={navigate} to="finances">
      <div className="flex flex-col h-full">
        <div className="flex-1 px-5 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sage-500">Bills due</span>
            <span className={`text-sm font-semibold ${billsTotal > 0 ? 'text-red-500' : 'text-sage-400'}`}>
              {billsTotal == null ? '…' : formatMoney(billsTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-sage-500">Shared spend</span>
            <span className="text-sm font-semibold text-sage-800">
              {spendTotal == null ? '…' : formatMoney(spendTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-sage-500">Budget left</span>
            <span className="text-sm font-semibold text-green-600">—</span>
          </div>
        </div>
        <div
          className="px-5 py-3 border-t border-sage-50 cursor-pointer hover:bg-sage-50 transition-colors"
          onClick={() => navigate('finances')}
        >
          <p className="text-xs text-sage-400">Tap to view details →</p>
        </div>
      </div>
    </MiniCard>
  )
}

// ── PuzzlesCard ────────────────────────────────────────────────────────────────
function PuzzlesCard({ todayPuzzles, puzzleProgress, navigate }) {
  return (
    <MiniCard icon="🧩" title="Puzzle of the Day" onNavigate={navigate} to="puzzles">
      <div className="flex flex-col items-center justify-center p-6 text-center h-full">
        {todayPuzzles === null ? (
          <>
            <div className="w-8 h-8 rounded-full border-2 border-sage-200 border-t-sage-400 animate-spin mb-4" />
            <p className="text-xs text-sage-300">Checking puzzles…</p>
          </>
        ) : todayPuzzles.length > 0 ? (
          <>
            <p className="text-5xl mb-3">🧩</p>
            <p className="text-sm font-semibold text-sage-700 mb-1">
              {todayPuzzles.length === 1 ? '1 puzzle today' : `${todayPuzzles.length} puzzles today`}
            </p>
            <p className="text-xs text-sage-400 mb-2">
              {todayPuzzles.map(p => p.type === 'quad' ? 'The Quad' : 'Mini Crossword').join(' & ')}
            </p>
            <div className="w-full max-w-[140px] h-1.5 bg-sage-100 rounded-full mt-2 mb-3">
              <div
                className="h-full bg-sage-500 rounded-full transition-all"
                style={{ width: `${todayPuzzles.length ? (puzzleProgress / todayPuzzles.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-sage-400 mb-4">
              {puzzleProgress}/{todayPuzzles.length} solved
            </p>
            <button
              onClick={() => navigate('puzzles')}
              className="px-5 py-2 text-sm font-semibold text-white bg-sage-600 rounded-xl hover:bg-sage-700 transition-colors"
            >
              {puzzleProgress >= todayPuzzles.length ? 'Review' : 'Play'}
            </button>
          </>
        ) : (
          <>
            <p className="text-5xl mb-3">😶</p>
            <p className="text-sm font-semibold text-sage-700 mb-1">No puzzle today</p>
            <p className="text-xs text-sage-400 mb-5">Be the first to submit one!</p>
            <button
              onClick={() => navigate('puzzles')}
              className="px-5 py-2 text-sm font-semibold text-white bg-sage-600 rounded-xl hover:bg-sage-700 transition-colors"
            >
              Submit one
            </button>
          </>
        )}
      </div>
    </MiniCard>
  )
}

// ── NotesCard ──────────────────────────────────────────────────────────────────
function NotesCard({ recentNotes, navigate }) {
  return (
    <MiniCard icon="📝" title="Shared Notes" onNavigate={navigate} to="shared-notes">
      {recentNotes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-10 text-sage-300 cursor-pointer hover:bg-sage-50 transition-colors h-full"
          onClick={() => navigate('shared-notes')}
        >
          <p className="text-2xl mb-1">📝</p>
          <p className="text-xs">No shared notes yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-sage-50">
          {recentNotes.map(note => (
            <button
              key={note.id}
              onClick={() => navigate('shared-notes')}
              className="w-full text-left px-5 py-3 hover:bg-sage-50 transition-colors"
            >
              <p className="text-sm font-medium text-sage-800 truncate">{note.title || 'Untitled note'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {(note.author?.name || note.created_by) && (
                  <span className="text-xs text-sage-400 truncate">
                    {note.author?.name ?? note.created_by?.slice(0, 8)}
                  </span>
                )}
                <span className="text-xs text-sage-300">{timeAgo(note.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </MiniCard>
  )
}

// ── RecipesCard ────────────────────────────────────────────────────────────────
function RecipesCard({ recentRecipes, navigate }) {
  return (
    <MiniCard icon="🍳" title="Recent Recipes" onNavigate={navigate} to="recipes">
      {recentRecipes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-10 text-sage-300 cursor-pointer hover:bg-sage-50 transition-colors h-full"
          onClick={() => navigate('recipes')}
        >
          <p className="text-2xl mb-1">🍳</p>
          <p className="text-xs">No recipes yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-sage-50">
          {recentRecipes.map(recipe => (
            <button
              key={recipe.id}
              onClick={() => navigate('recipes')}
              className="w-full text-left px-5 py-3 hover:bg-sage-50 transition-colors flex items-center gap-2"
            >
              <span className="text-lg shrink-0">{recipeEmoji(recipe.tags)}</span>
              <span className="flex-1 text-sm text-sage-800 truncate">{recipe.title}</span>
              {recipe.total_time_mins && (
                <span className="text-xs text-sage-400 shrink-0">{recipe.total_time_mins}m</span>
              )}
            </button>
          ))}
        </div>
      )}
    </MiniCard>
  )
}

// ── Timezone modal ─────────────────────────────────────────────────────────────
function TzModal({ currentTz, currentCity, onSave, onClose }) {
  const [tz,     setTz]     = useState(currentTz)
  const [city,   setCity]   = useState(currentCity)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(tz, city)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 className="font-display text-base text-sage-800 mb-4">Clock Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">Timezone</label>
            <select value={tz} onChange={e => setTz(e.target.value)}
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              {TIMEZONES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-sage-500 mb-1">City label</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. New York"
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-sage-500 hover:text-sage-700">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-sage-600 rounded-xl hover:bg-sage-700 disabled:opacity-40">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main HomePage ──────────────────────────────────────────────────────────────
export default function HomePage({ navigate }) {
  const { currentUser, refreshProfile } = useAuth()
  const { tasks, lists } = useTasks()

  // ── Layout state ────────────────────────────────────────────────────────────
  const [vis, setVis] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}')
      return parseLayout(raw)
    } catch {
      return parseLayout(null)
    }
  })
  const [editMode,  setEditMode]  = useState(false)
  const [draftVis,  setDraftVis]  = useState({})

  // Load layout from Supabase on mount
  useEffect(() => {
    if (!currentUser?.id) return
    supabase.from('profiles').select('dashboard_layout').eq('id', currentUser.id).single()
      .then(({ data }) => {
        if (data?.dashboard_layout) {
          const parsed = parseLayout(data.dashboard_layout)
          setVis(parsed)
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(data.dashboard_layout))
        }
      })
      .catch(() => {})
  }, [currentUser?.id])

  function startEdit() {
    setDraftVis({ ...vis })
    setEditMode(true)
  }
  function toggleWidget(id) {
    setDraftVis(prev => ({ ...prev, [id]: !prev[id] }))
  }
  async function saveEdit() {
    setVis(draftVis)
    const hidden = ALL_IDS.filter(id => !draftVis[id])
    const layout = { hidden }
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
    try {
      await supabase.from('profiles').update({ dashboard_layout: layout }).eq('id', currentUser.id)
    } catch {}
    setEditMode(false)
  }
  function cancelEdit() {
    setEditMode(false)
    setDraftVis({})
  }
  function resetLayout() {
    setDraftVis(parseLayout(null))
  }

  const currentVis = editMode ? draftVis : vis

  // ── Weather ─────────────────────────────────────────────────────────────────
  const [weather,     setWeather]     = useState(null)
  const [weatherCity, setWeatherCity] = useState('')
  const [weatherErr,  setWeatherErr]  = useState(false)
  const [cityInput,   setCityInput]   = useState(currentUser?.city ?? '')

  useEffect(() => {
    if (!navigator.geolocation) { setWeatherErr(true); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const [wRes, gRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
              headers: { 'User-Agent': 'GormBase Household App' },
            }),
          ])
          const wData = await wRes.json()
          const gData = await gRes.json()
          const tempC = wData.current_weather.temperature
          setWeather({ tempF: Math.round(tempC * 9 / 5 + 32), code: wData.current_weather.weathercode })
          setWeatherCity(
            gData.address?.city || gData.address?.town || gData.address?.village ||
            gData.address?.county || currentUser?.city || ''
          )
        } catch { setWeatherErr(true) }
      },
      () => setWeatherErr(true)
    )
  }, [])

  async function saveCityFallback() {
    if (!cityInput.trim()) return
    await supabase.from('profiles').update({ city: cityInput.trim() }).eq('id', currentUser.id)
    await refreshProfile()
  }

  // ── World clock ─────────────────────────────────────────────────────────────
  const [clockTime,   setClockTime]   = useState('')
  const [showTzModal, setShowTzModal] = useState(false)
  const tz    = currentUser?.timezone ?? 'America/New_York'
  const label = currentUser?.city || tz.split('/')[1]?.replace(/_/g, ' ') || tz

  useEffect(() => {
    function tick() {
      try {
        setClockTime(new Date().toLocaleTimeString('en-US', {
          timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
        }))
      } catch { setClockTime('') }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tz])

  async function saveTzAndCity(newTz, newCity) {
    await supabase.from('profiles').update({ timezone: newTz, city: newCity }).eq('id', currentUser.id)
    await refreshProfile()
    setShowTzModal(false)
  }

  // ── Puzzle of the Day ───────────────────────────────────────────────────────
  const [todayPuzzles,   setTodayPuzzles]   = useState(null)
  const [puzzleProgress, setPuzzleProgress] = useState(0)

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    supabase.from('puzzles').select('id, type').eq('active_date', todayStr)
      .then(async ({ data }) => {
        const puzzles = data ?? []
        setTodayPuzzles(puzzles)
        if (puzzles.length > 0 && currentUser?.id) {
          const puzzleIds = puzzles.map(p => p.id)
          try {
            const { data: subs } = await supabase
              .from('puzzle_submissions')
              .select('puzzle_id')
              .eq('submitted_by', currentUser.id)
              .in('puzzle_id', puzzleIds)
            setPuzzleProgress((subs ?? []).length)
          } catch {}
        }
      })
      .catch(() => setTodayPuzzles([]))
  }, [currentUser?.id])

  // ── Finance data ─────────────────────────────────────────────────────────────
  const [billsTotal,   setBillsTotal]   = useState(null)
  const [spendTotal,   setSpendTotal]   = useState(null)
  const [recentNotes,  setRecentNotes]  = useState([])
  const [openTasks,    setOpenTasks]    = useState([])
  const [recentRecipes, setRecentRecipes] = useState([])

  useEffect(() => {
    supabase.from('bills').select('amount').eq('paid', false)
      .then(({ data }) => setBillsTotal((data ?? []).reduce((s, b) => s + (b.amount ?? 0), 0)))
      .catch(() => {})

    const thisMonth = new Date().toISOString().slice(0, 7)
    supabase.from('expenses').select('amount').gte('date', `${thisMonth}-01`)
      .then(({ data }) => setSpendTotal((data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0)))
      .catch(() => {})

    supabase.from('shared_notes')
      .select('id, title, content, created_at, author:profiles!created_by(name)')
      .order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setRecentNotes(data ?? []))
      .catch(() => {
        supabase.from('shared_notes')
          .select('id, title, content, created_at, created_by')
          .order('created_at', { ascending: false }).limit(3)
          .then(({ data }) => setRecentNotes(data ?? []))
          .catch(() => {})
      })

    supabase.from('tasks').select('id, title, due_date, list_id, status, assigned_to')
      .eq('archived', false).neq('status', 'done')
      .eq('assigned_to', currentUser?.id)
      .order('due_date', { ascending: true, nullsFirst: false }).limit(5)
      .then(({ data }) => setOpenTasks(data ?? []))
      .catch(() => {})

    // Recipes
    supabase.from('recipes')
      .select('id, title, tags, total_time_mins, photo_url')
      .order('created_at', { ascending: false }).limit(3)
      .then(({ data, error }) => {
        if (error) {
          // Retry without total_time_mins in case column doesn't exist
          return supabase.from('recipes')
            .select('id, title, tags, photo_url')
            .order('created_at', { ascending: false }).limit(3)
        }
        return { data, error: null }
      })
      .then(result => {
        if (result?.data) setRecentRecipes(result.data)
      })
      .catch(() => {})
  }, [currentUser?.id])

  return (
    <div className="bg-sage-50 min-h-full">
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-[1400px] mx-auto">

        {/* Greeting row + Customize button */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl text-sage-800">
              {greeting()}, {currentUser?.name?.split(' ')[0] ?? 'there'} 👋
            </h2>
            <p className="text-sm text-sage-400 mt-0.5">{formatDate()}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {!editMode ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sage-600 bg-white border border-sage-200 rounded-xl hover:border-sage-400 transition-colors shadow-sm"
              >
                <LayoutDashboard size={13} />
                Customize
              </button>
            ) : (
              <>
                <button
                  onClick={resetLayout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sage-500 bg-white border border-sage-200 rounded-xl hover:border-sage-400 transition-colors shadow-sm"
                  title="Reset to default"
                >
                  <RotateCcw size={13} />
                  Reset
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1.5 text-xs font-semibold text-sage-500 bg-white border border-sage-200 rounded-xl hover:border-sage-400 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sage-600 border border-sage-600 rounded-xl hover:bg-sage-700 transition-colors shadow-sm"
                >
                  Save layout
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit mode hint banner */}
        {editMode && (
          <p className="text-xs text-sage-400 bg-white border border-sage-100 rounded-xl px-4 py-3 mb-5 text-center shadow-sm">
            Tap any widget to toggle its visibility. Hit <strong>Save layout</strong> when done.
          </p>
        )}

        {/* Weather + Clock strip */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-sage-100 shadow-sm px-5 py-4 mb-6 gap-4">
          {/* Weather */}
          <div className="flex items-center gap-3 min-w-0">
            {weather ? (
              <>
                <span className="text-3xl shrink-0">{weatherEmoji(weather.code)}</span>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-sage-800 leading-tight">{weather.tempF}°F</p>
                  <p className="text-xs text-sage-400 truncate">{weatherCity}</p>
                </div>
              </>
            ) : weatherErr ? (
              <div className="min-w-0">
                <p className="text-xs text-sage-500 mb-1">Enter your city for weather</p>
                <input
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  onBlur={saveCityFallback}
                  onKeyDown={e => e.key === 'Enter' && saveCityFallback()}
                  placeholder="e.g. Boston"
                  className="text-xs border border-sage-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sage-300 w-36"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-sage-200 border-t-sage-500 animate-spin" />
                <p className="text-xs text-sage-300">Loading weather…</p>
              </div>
            )}
          </div>

          {/* Clock */}
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-sage-800 tabular-nums leading-tight">
              {clockTime || '——:——:—— ——'}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <p className="text-xs text-sage-400">{label}</p>
              <button
                onClick={() => setShowTzModal(true)}
                className="text-sage-300 hover:text-sage-500 transition-colors"
                title="Set timezone"
              >
                <Settings size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Widget grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardWidget id="lists" visible={currentVis.lists} editMode={editMode} onToggle={toggleWidget}>
            <ListsCard lists={lists} tasks={tasks} navigate={navigate} />
          </DashboardWidget>

          <DashboardWidget id="tasks" visible={currentVis.tasks} editMode={editMode} onToggle={toggleWidget}>
            <TasksCard openTasks={openTasks} lists={lists} navigate={navigate} />
          </DashboardWidget>

          <DashboardWidget id="finances" visible={currentVis.finances} editMode={editMode} onToggle={toggleWidget}>
            <FinancesCard billsTotal={billsTotal} spendTotal={spendTotal} navigate={navigate} />
          </DashboardWidget>

          <DashboardWidget id="puzzles" visible={currentVis.puzzles} editMode={editMode} onToggle={toggleWidget}>
            <PuzzlesCard todayPuzzles={todayPuzzles} puzzleProgress={puzzleProgress} navigate={navigate} />
          </DashboardWidget>

          <DashboardWidget id="notes" visible={currentVis.notes} editMode={editMode} onToggle={toggleWidget}>
            <NotesCard recentNotes={recentNotes} navigate={navigate} />
          </DashboardWidget>

          <DashboardWidget id="recipes" visible={currentVis.recipes} editMode={editMode} onToggle={toggleWidget}>
            <RecipesCard recentRecipes={recentRecipes} navigate={navigate} />
          </DashboardWidget>

          <DashboardWidget id="calendar" visible={currentVis.calendar} editMode={editMode} onToggle={toggleWidget}>
            <AgendaCard navigate={navigate} />
          </DashboardWidget>

          <DashboardWidget id="gmail" visible={currentVis.gmail} editMode={editMode} onToggle={toggleWidget}>
            <GmailCard />
          </DashboardWidget>
        </div>

      </div>

      {/* Timezone modal */}
      {showTzModal && (
        <TzModal
          currentTz={tz}
          currentCity={currentUser?.city ?? ''}
          onSave={saveTzAndCity}
          onClose={() => setShowTzModal(false)}
        />
      )}
    </div>
  )
}
