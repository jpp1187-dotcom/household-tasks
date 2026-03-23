import React, { useState, useEffect, useRef } from 'react'
import { CheckSquare, AlertCircle, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { supabase } from '../lib/supabase'

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
  if (code === 0)          return '☀️'
  if (code <= 3)           return '⛅'
  if (code <= 48)          return '🌫️'
  if (code <= 67)          return '🌧️'
  if (code <= 77)          return '❄️'
  if (code <= 82)          return '🌦️'
  if (code >= 95)          return '⛈️'
  return '🌤️'
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ onClick, className = '', children }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-sage-100 shadow-sm ${onClick ? 'cursor-pointer hover:border-sage-300' : ''} transition-colors ${className}`}
    >
      {children}
    </div>
  )
}

// ── Timezone selector modal ────────────────────────────────────────────────────
function TzModal({ currentTz, currentCity, onSave, onClose }) {
  const [tz,   setTz]   = useState(currentTz)
  const [city, setCity] = useState(currentCity)
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage({ navigate }) {
  const { currentUser, refreshProfile } = useAuth()
  const { tasks, lists } = useTasks()

  // ── Weather ────────────────────────────────────────────────────────────────
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

  // ── World clock ────────────────────────────────────────────────────────────
  const [clockTime, setClockTime] = useState('')
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

  // ── Puzzle of the Day ──────────────────────────────────────────────────────
  const [todayPuzzles, setTodayPuzzles] = useState(null) // null=loading, []=none, [...]=found

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    supabase.from('puzzles').select('id, type').eq('active_date', todayStr)
      .then(({ data }) => setTodayPuzzles(data ?? []))
      .catch(() => setTodayPuzzles([]))
  }, [])

  // ── Finance data ────────────────────────────────────────────────────────────
  const [billsTotal, setBillsTotal] = useState(null)
  const [spendTotal, setSpendTotal] = useState(null)
  const [recentNotes, setRecentNotes] = useState([])
  const [openTasks,   setOpenTasks]   = useState([])

  const activeLists = lists.filter(l => !l.archived)

  function openCountForList(listId) {
    return tasks.filter(t => t.listId === listId && t.status !== 'done' && !t.archived).length
  }
  const totalOpen = tasks.filter(t => t.status !== 'done' && !t.archived).length

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
  }, [currentUser?.id])

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">

      {/* Greeting */}
      <div className="mb-5">
        <h2 className="font-display text-2xl text-sage-800">
          {greeting()}, {currentUser?.name?.split(' ')[0] ?? 'there'} 👋
        </h2>
        <p className="text-sm text-sage-400 mt-0.5">{formatDate()}</p>
      </div>

      {/* ── Weather + Clock strip ── */}
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

      {/* ── Top 3 cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        {/* 📋 Current Lists */}
        <Card className="flex flex-col">
          <div className="px-5 pt-5 pb-3 border-b border-sage-50">
            <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide mb-1">📋 Current Lists</p>
          </div>
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
          <div className="px-5 py-3 border-t border-sage-50 cursor-pointer hover:bg-sage-50 transition-colors" onClick={() => navigate('my-tasks')}>
            <p className="text-xs text-sage-400">
              <span className="font-semibold text-sage-600">{totalOpen}</span> open task{totalOpen !== 1 ? 's' : ''} total
            </p>
          </div>
        </Card>

        {/* 🧩 Puzzle of the Day */}
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide mb-4">🧩 Puzzle of the Day</p>
          {todayPuzzles === null ? (
            /* loading */
            <>
              <div className="w-8 h-8 rounded-full border-2 border-sage-200 border-t-sage-400 animate-spin mb-4" />
              <p className="text-xs text-sage-300">Checking puzzles…</p>
            </>
          ) : todayPuzzles.length > 0 ? (
            /* puzzles available */
            <>
              <p className="text-5xl mb-3">🧩</p>
              <p className="text-sm font-semibold text-sage-700 mb-1">
                {todayPuzzles.length === 1
                  ? `1 puzzle today`
                  : `${todayPuzzles.length} puzzles today →`}
              </p>
              <p className="text-xs text-sage-400 mb-5">
                {todayPuzzles.map(p => p.type === 'quad' ? 'The Quad' : 'Mini Crossword').join(' & ')}
              </p>
              <button
                onClick={() => navigate('puzzles')}
                className="px-5 py-2 text-sm font-semibold text-white bg-sage-600 rounded-xl hover:bg-sage-700 transition-colors"
              >
                Play
              </button>
            </>
          ) : (
            /* no puzzles today */
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
        </Card>

        {/* 💰 Financial Overview */}
        <Card onClick={() => navigate('finances')} className="flex flex-col">
          <div className="px-5 pt-5 pb-3 border-b border-sage-50">
            <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide">💰 Financial Overview</p>
          </div>
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
          <div className="px-5 py-3 border-t border-sage-50">
            <p className="text-xs text-sage-400">Tap to view details →</p>
          </div>
        </Card>

      </div>

      {/* ── Bottom 2 cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 📝 Recent Shared Notes */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sage-50">
            <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide">📝 Recent Shared Notes</p>
            <button onClick={e => { e.stopPropagation(); navigate('shared-notes') }}
              className="text-xs text-sage-400 hover:text-sage-600 transition-colors">
              View all →
            </button>
          </div>
          {recentNotes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-sage-300 cursor-pointer hover:bg-sage-50 transition-colors" onClick={() => navigate('shared-notes')}>
              <p className="text-2xl mb-1">📝</p>
              <p className="text-xs">No shared notes yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-sage-50">
              {recentNotes.map(note => (
                <button key={note.id} onClick={() => navigate('shared-notes')}
                  className="w-full text-left px-5 py-3 hover:bg-sage-50 transition-colors">
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
        </Card>

        {/* ✓ Open Tasks (assigned to me) */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sage-50">
            <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide flex items-center gap-1.5">
              <CheckSquare size={12} className="text-sage-400" />
              My Open Tasks
            </p>
            <button onClick={e => { e.stopPropagation(); navigate('my-tasks') }}
              className="text-xs text-sage-400 hover:text-sage-600 transition-colors">
              View all →
            </button>
          </div>
          {openTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-sage-300 cursor-pointer hover:bg-sage-50 transition-colors" onClick={() => navigate('my-tasks')}>
              <p className="text-2xl mb-1">✓</p>
              <p className="text-xs">All caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-sage-50">
              {openTasks.map(t => {
                const isOverdue = t.due_date && t.due_date < today()
                const list = lists.find(l => l.id === t.list_id)
                return (
                  <button key={t.id} onClick={() => navigate('my-tasks')}
                    className="w-full text-left px-5 py-3 hover:bg-sage-50 transition-colors flex items-start gap-2">
                    {isOverdue && <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-sage-800 truncate">{t.title}</p>
                      {list && <p className="text-xs text-sage-400">{list.icon} {list.name}</p>}
                    </div>
                    {t.due_date && (
                      <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-sage-400'}`}>
                        {t.due_date}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

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
