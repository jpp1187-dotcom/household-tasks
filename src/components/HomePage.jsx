import React, { useState, useEffect } from 'react'
import { CheckSquare, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { supabase } from '../lib/supabase'

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

// ── Card wrapper — pointer + hover border ──────────────────────────────────────
function Card({ onClick, className = '', children }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-sage-100 shadow-sm cursor-pointer hover:border-sage-300 transition-colors ${className}`}
    >
      {children}
    </div>
  )
}

export default function HomePage({ navigate }) {
  const { currentUser } = useAuth()
  const { tasks, lists } = useTasks()

  // ── Finance data ────────────────────────────────────────────────────────────
  const [billsTotal,  setBillsTotal]  = useState(null)
  const [spendTotal,  setSpendTotal]  = useState(null)

  // ── Recent shared notes ─────────────────────────────────────────────────────
  const [recentNotes, setRecentNotes] = useState([])

  // ── Open tasks (direct query for fresh due-date sort) ───────────────────────
  const [openTasks, setOpenTasks] = useState([])

  const activeLists = lists.filter(l => !l.archived)

  // Open task count per list (from context tasks)
  function openCountForList(listId) {
    return tasks.filter(t => t.listId === listId && t.status !== 'done' && !t.archived).length
  }
  const totalOpen = tasks.filter(t => t.status !== 'done' && !t.archived).length

  useEffect(() => {
    // Bills: sum of unpaid amounts
    supabase
      .from('bills')
      .select('amount')
      .eq('paid', false)
      .then(({ data }) => {
        const sum = (data ?? []).reduce((acc, b) => acc + (b.amount ?? 0), 0)
        setBillsTotal(sum)
      })
      .catch(() => {})

    // Expenses: sum this month
    const thisMonth = new Date().toISOString().slice(0, 7)
    supabase
      .from('expenses')
      .select('amount')
      .gte('date', `${thisMonth}-01`)
      .then(({ data }) => {
        const sum = (data ?? []).reduce((acc, e) => acc + (e.amount ?? 0), 0)
        setSpendTotal(sum)
      })
      .catch(() => {})

    // Recent shared notes — join author name
    supabase
      .from('shared_notes')
      .select('id, title, content, created_at, author:profiles!created_by(name)')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setRecentNotes(data ?? []))
      .catch(() => {
        // Fallback without join
        supabase
          .from('shared_notes')
          .select('id, title, content, created_at, created_by')
          .order('created_at', { ascending: false })
          .limit(3)
          .then(({ data }) => setRecentNotes(data ?? []))
          .catch(() => {})
      })

    // Open tasks — last 5 by due date
    supabase
      .from('tasks')
      .select('id, title, due_date, list_id, status')
      .eq('archived', false)
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5)
      .then(({ data }) => setOpenTasks(data ?? []))
      .catch(() => {})
  }, [])

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">

      {/* Greeting */}
      <div className="mb-6">
        <h2 className="font-display text-2xl text-sage-800">
          {greeting()}, {currentUser?.name?.split(' ')[0] ?? 'there'} 👋
        </h2>
        <p className="text-sm text-sage-400 mt-0.5">{formatDate()}</p>
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
          <div
            className="px-5 py-3 border-t border-sage-50 cursor-pointer hover:bg-sage-50 transition-colors"
            onClick={() => navigate('my-tasks')}
          >
            <p className="text-xs text-sage-400">
              <span className="font-semibold text-sage-600">{totalOpen}</span> open task{totalOpen !== 1 ? 's' : ''} total
            </p>
          </div>
        </Card>

        {/* 🧩 Puzzle of the Day */}
        <Card onClick={() => navigate('puzzles')} className="flex flex-col items-center justify-center p-6 text-center">
          <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide mb-4">🧩 Puzzle of the Day</p>
          <p className="text-5xl mb-4">🧩</p>
          <p className="text-xs text-sage-400 mb-5">Coming soon</p>
          <button
            disabled
            className="px-5 py-2 text-sm font-semibold text-sage-300 bg-sage-50 border border-sage-200 rounded-xl cursor-not-allowed"
          >
            Play
          </button>
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
            <button
              onClick={e => { e.stopPropagation(); navigate('shared-notes') }}
              className="text-xs text-sage-400 hover:text-sage-600 transition-colors"
            >
              View all →
            </button>
          </div>

          {recentNotes.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center py-10 text-sage-300 cursor-pointer hover:bg-sage-50 transition-colors"
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
        </Card>

        {/* ✓ Open Tasks */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sage-50">
            <p className="text-xs font-semibold text-sage-400 uppercase tracking-wide flex items-center gap-1.5">
              <CheckSquare size={12} className="text-sage-400" />
              Open Tasks
            </p>
            <button
              onClick={e => { e.stopPropagation(); navigate('my-tasks') }}
              className="text-xs text-sage-400 hover:text-sage-600 transition-colors"
            >
              View all →
            </button>
          </div>

          {openTasks.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center py-10 text-sage-300 cursor-pointer hover:bg-sage-50 transition-colors"
              onClick={() => navigate('my-tasks')}
            >
              <p className="text-2xl mb-1">✓</p>
              <p className="text-xs">All caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-sage-50">
              {openTasks.map(t => {
                const isOverdue = t.due_date && t.due_date < today()
                const list = lists.find(l => l.id === t.list_id)
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate('my-tasks')}
                    className="w-full text-left px-5 py-3 hover:bg-sage-50 transition-colors flex items-start gap-2"
                  >
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
    </div>
  )
}
