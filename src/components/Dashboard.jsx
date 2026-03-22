import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#4a7c4a', '#e48a4a', '#9ec09e', '#ecae7d', '#2f502e', '#da6f28', '#6d9f6d', '#c4581e']

function shorten(str, max = 14) {
  return str.length > max ? str.slice(0, max) + '…' : str
}

export default function Dashboard() {
  const { currentUser, allUsers } = useAuth()
  const { tasks } = useTasks()
  const { households, projects } = useHouseholds()
  const [chartType, setChartType] = useState('bar')

  const myOpen = tasks.filter(t => t.assignedTo === currentUser?.id && t.status !== 'done').length
  const myDone = tasks.filter(t => t.assignedTo === currentUser?.id && t.status === 'done').length

  // Per-user progress cards
  const userStats = allUsers.map(u => ({
    ...u,
    open: tasks.filter(t => t.assignedTo === u.id && t.status !== 'done').length,
    done: tasks.filter(t => t.assignedTo === u.id && t.status === 'done').length,
  }))

  // Household task data (tasks that belong to a project → household)
  const householdData = households.map(h => {
    const ids = new Set(projects.filter(p => p.householdId === h.id).map(p => p.id))
    const ht = tasks.filter(t => ids.has(t.projectId))
    return {
      name: shorten(h.name),
      done: ht.filter(t => t.status === 'done').length,
      open: ht.filter(t => t.status !== 'done').length,
      total: ht.length,
    }
  }).filter(d => d.total > 0)

  // Gantt data: project completion bars
  const ganttData = projects
    .filter(p => p.status !== 'archived')
    .map(p => {
      const pt = tasks.filter(t => t.projectId === p.id)
      const done = pt.filter(t => t.status === 'done').length
      const pct = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0
      return { name: shorten(p.name, 20), progress: pct, remaining: 100 - pct }
    })

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-5xl">
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="font-display text-2xl text-sage-800">
          Welcome back, {currentUser?.name ?? 'there'} 👋
        </h2>
        <p className="text-sm text-sage-400 mt-1">
          {myOpen} open task{myOpen !== 1 ? 's' : ''} assigned to you
          {myDone > 0 && ` · ${myDone} completed`}
        </p>
      </div>

      {/* User progress cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {userStats.map(u => {
          const total = u.open + u.done
          const pct = total > 0 ? Math.round((u.done / total) * 100) : 0
          return (
            <div key={u.id} className="bg-white rounded-xl border border-sage-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="text-2xl">{u.avatar}</span>
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

      {/* Charts */}
      <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg text-sage-800">Overview</h3>
          <div className="flex gap-1">
            {[
              ['bar',   'By Household'],
              ['pie',   'Distribution'],
              ['gantt', 'Project Progress'],
            ].map(([type, label]) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors
                  ${chartType === type ? 'bg-sage-600 text-white' : 'text-sage-500 hover:bg-sage-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty states */}
        {chartType !== 'gantt' && householdData.length === 0 && (
          <p className="text-center text-sage-300 text-sm py-12">No household task data yet.</p>
        )}
        {chartType === 'gantt' && ganttData.length === 0 && (
          <p className="text-center text-sage-300 text-sm py-12">No projects yet.</p>
        )}

        {/* Bar chart */}
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

        {/* Pie chart */}
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

        {/* Gantt-style horizontal bar */}
        {chartType === 'gantt' && ganttData.length > 0 && (
          <ResponsiveContainer width="100%" height={Math.max(200, ganttData.length * 44)}>
            <BarChart
              data={ganttData}
              layout="vertical"
              margin={{ top: 5, right: 40, bottom: 5, left: 10 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 11, fill: '#6d9f6d' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 11, fill: '#4a7c4a' }}
              />
              <Tooltip
                formatter={(v, name) => [`${v}%`, name === 'progress' ? 'Complete' : 'Remaining']}
              />
              <Bar dataKey="progress"  name="progress"  stackId="a" fill="#4a7c4a" />
              <Bar dataKey="remaining" name="remaining" stackId="a" fill="#e8f0e8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
