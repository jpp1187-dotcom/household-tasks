import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { DOMAIN_CONFIG } from '../lib/domains'
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#4a7c4a', '#e48a4a', '#9ec09e', '#ecae7d', '#2f502e', '#da6f28', '#6d9f6d', '#c4581e']

function shorten(str, max = 14) {
  return str.length > max ? str.slice(0, max) + '…' : str
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({ navigate }) {
  const { currentUser, allUsers } = useAuth()
  const { tasks } = useTasks()
  const { households, residents, activity } = useHouseholds()
  const [chartType, setChartType] = useState('bar')

  const myOpen = tasks.filter(t => t.assignedTo === currentUser?.id && t.status !== 'done' && !t.archived).length
  const myDone = tasks.filter(t => t.assignedTo === currentUser?.id && t.status === 'done').length
  const totalOpen = tasks.filter(t => t.status !== 'done' && !t.archived).length

  // Per-user progress cards
  const userStats = allUsers.map(u => ({
    ...u,
    open: tasks.filter(t => t.assignedTo === u.id && t.status !== 'done').length,
    done: tasks.filter(t => t.assignedTo === u.id && t.status === 'done').length,
  }))

  // Household task data (by householdId or via resident)
  const householdData = households.map(h => {
    const residentIds = new Set(residents.filter(r => r.householdId === h.id).map(r => r.id))
    const ht = tasks.filter(t => t.householdId === h.id || residentIds.has(t.residentId))
    return {
      name: shorten(h.name),
      done: ht.filter(t => t.status === 'done').length,
      open: ht.filter(t => t.status !== 'done').length,
      total: ht.length,
    }
  }).filter(d => d.total > 0)

  // Domain task data (by domain_tag)
  const domainData = Object.entries(DOMAIN_CONFIG).map(([key, cfg]) => {
    const dt = tasks.filter(t => t.domainTag === key && !t.archived)
    return {
      name: cfg.label,
      done: dt.filter(t => t.status === 'done').length,
      open: dt.filter(t => t.status !== 'done').length,
      total: dt.length,
    }
  }).filter(d => d.total > 0)

  // Recent activity — last 10 entries
  const recentActivity = activity.slice(0, 10)

  const activeHouseholds = households.filter(h => !h.archived).length
  const activeResidents = residents.filter(r => !r.archived).length

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">
      {/* Personalized greeting */}
      <div className="mb-6 md:mb-8">
        <h2 className="font-display text-2xl text-sage-800">
          {greeting()}, {currentUser?.name?.split(' ')[0] ?? 'there'} 👋
        </h2>
        <p className="text-sm text-sage-400 mt-1">
          {myOpen} open task{myOpen !== 1 ? 's' : ''} assigned to you
          {myDone > 0 && ` · ${myDone} completed`}
        </p>
      </div>

      {/* Navigation tiles */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <button
          onClick={() => navigate('household-list')}
          className="bg-white rounded-xl border border-sage-100 shadow-sm p-4 text-left hover:shadow-md transition-shadow"
        >
          <p className="text-2xl mb-2">🏠</p>
          <p className="text-sm font-semibold text-sage-800">Households</p>
          <p className="text-xs text-sage-400 mt-0.5">{activeHouseholds} active</p>
        </button>
        <button
          onClick={() => navigate('resident-list')}
          className="bg-white rounded-xl border border-sage-100 shadow-sm p-4 text-left hover:shadow-md transition-shadow"
        >
          <p className="text-2xl mb-2">👤</p>
          <p className="text-sm font-semibold text-sage-800">Residents</p>
          <p className="text-xs text-sage-400 mt-0.5">{activeResidents} active</p>
        </button>
        <button
          onClick={() => navigate('all-tasks')}
          className="bg-white rounded-xl border border-sage-100 shadow-sm p-4 text-left hover:shadow-md transition-shadow"
        >
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm font-semibold text-sage-800">Tasks</p>
          <p className="text-xs text-sage-400 mt-0.5">{totalOpen} open</p>
        </button>
      </div>

      {/* User progress cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 md:mb-10">
        {userStats.map(u => {
          const total = u.open + u.done
          const pct = total > 0 ? Math.round((u.done / total) * 100) : 0
          return (
            <div key={u.id} className="bg-white rounded-xl border border-sage-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="text-2xl shrink-0">{u.avatar ?? '🧑'}</span>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-sage-800">{u.name}</p>
                  <p className="text-xs text-sage-400 capitalize">{u.role}</p>
                </div>
                <span className="text-sm font-semibold text-sage-500">{pct}%</span>
              </div>
              <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
                <div className="h-full bg-sage-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-sage-400 mt-2">{u.done} done · {u.open} open</p>
            </div>
          )
        })}
      </div>

      {/* ── Lower section: Charts + Activity side-by-side ─────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Charts — left, wider */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-sage-100 shadow-sm p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg text-sage-800">Overview</h3>
            <div className="flex gap-1">
              {[
                ['bar',    'By Household'],
                ['domain', 'By Domain'],
                ['pie',    'Distribution'],
              ].map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-2 md:px-3 py-1 text-xs rounded-lg font-medium transition-colors
                    ${chartType === type ? 'bg-sage-600 text-white' : 'text-sage-500 hover:bg-sage-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {chartType === 'domain' && domainData.length === 0 && (
            <p className="text-center text-sage-300 text-sm py-12">No domain task data yet.</p>
          )}
          {chartType !== 'domain' && householdData.length === 0 && (
            <p className="text-center text-sage-300 text-sm py-12">No household task data yet.</p>
          )}

          {chartType === 'domain' && domainData.length > 0 && (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={domainData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6d9f6d' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6d9f6d' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="done" name="Done" fill="#4a7c4a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="open" name="Open" fill="#c9ddc9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === 'bar' && householdData.length > 0 && (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={householdData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6d9f6d' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6d9f6d' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="done" name="Done" fill="#4a7c4a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="open" name="Open" fill="#c9ddc9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === 'pie' && householdData.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={householdData}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                >
                  {householdData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Activity — right column */}
        <div className="w-full lg:w-72 shrink-0 bg-white rounded-xl border border-sage-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base text-sage-800">Recent Activity</h3>
            {navigate && (
              <button
                onClick={() => navigate('activity')}
                className="text-xs text-sage-400 hover:text-sage-600 transition-colors"
              >
                View all →
              </button>
            )}
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-xs text-sage-300 py-4 text-center">No activity yet.</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map(a => {
                const user = allUsers.find(u => u.id === a.userId)
                return (
                  <div key={a.id} className="text-xs">
                    <p className="text-sage-700 leading-snug">
                      <span className="font-semibold">{user?.name ?? 'Someone'}</span>
                      {' '}
                      <span className="text-sage-500">{a.action}</span>
                      {a.entityName && (
                        <>
                          {' '}
                          <span className="font-medium text-sage-600">{a.entityName}</span>
                        </>
                      )}
                    </p>
                    <p className="text-sage-400 mt-0.5">{timeAgo(a.createdAt)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
