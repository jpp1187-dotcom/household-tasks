import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'
import { DOMAIN_CONFIG } from './ProjectListView'

export default function ProjectListPage({ navigate }) {
  const { projects, households, residents } = useHouseholds()
  const { tasks } = useTasks()
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [householdFilter, setHouseholdFilter] = useState('')

  const activeProjects = projects.filter(p => !p.archived)

  let visible = activeProjects
  if (domainFilter) visible = visible.filter(p => p.projectType === domainFilter)
  if (householdFilter) visible = visible.filter(p => p.householdId === householdFilter)
  if (search.trim()) {
    const q = search.toLowerCase()
    visible = visible.filter(p => p.name.toLowerCase().includes(q))
  }

  // Group by domain
  const domains = Object.keys(DOMAIN_CONFIG)
  const grouped = domainFilter
    ? { [domainFilter]: visible }
    : domains.reduce((acc, d) => {
        const dProjects = visible.filter(p => p.projectType === d)
        if (dProjects.length > 0) acc[d] = dProjects
        return acc
      }, {})
  const ungrouped = visible.filter(p => !p.projectType || !DOMAIN_CONFIG[p.projectType])

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-display text-2xl text-sage-800">All Projects</h2>
        <p className="text-xs text-sage-400 mt-1">{activeProjects.length} active projects</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="pl-8 pr-3 py-1.5 text-sm border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300 bg-white"
          />
        </div>
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-sage-200 rounded-lg text-sage-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300">
          <option value="">All domains</option>
          {Object.entries(DOMAIN_CONFIG).map(([k, cfg]) => (
            <option key={k} value={k}>{cfg.icon} {cfg.label}</option>
          ))}
        </select>
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
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">{search ? 'No projects match your search.' : 'No projects yet.'}</p>
        </div>
      ) : (
        <div className="space-y-8 max-w-5xl">
          {Object.entries(grouped).map(([domain, domainProjects]) => {
            const cfg = DOMAIN_CONFIG[domain]
            return (
              <div key={domain}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{cfg.icon}</span>
                  <h3 className="font-semibold text-sage-700">{cfg.label}</h3>
                  <span className="text-xs text-sage-400">({domainProjects.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {domainProjects.map(p => <ProjectCard key={p.id} project={p} households={households} residents={residents} tasks={tasks} navigate={navigate} />)}
                </div>
              </div>
            )
          })}
          {ungrouped.length > 0 && (
            <div>
              <h3 className="font-semibold text-sage-700 mb-3">Other</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {ungrouped.map(p => <ProjectCard key={p.id} project={p} households={households} residents={residents} tasks={tasks} navigate={navigate} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, households, residents, tasks, navigate }) {
  const household = households.find(h => h.id === project.householdId)
  const resident = project.residentId ? residents.find(r => r.id === project.residentId) : null
  const pt = tasks.filter(t => t.projectId === project.id)
  const done = pt.filter(t => t.status === 'done').length
  const pct = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0

  return (
    <button
      onClick={() => navigate?.('project', { projectId: project.id, householdId: project.householdId })}
      className="bg-white rounded-xl border border-sage-100 shadow-sm hover:shadow-md transition-shadow p-4 text-left w-full"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold text-sage-800 flex-1 pr-2 truncate">{project.name}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0
          ${project.status === 'active' ? 'bg-sage-100 text-sage-600' :
            project.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
          {project.status}
        </span>
      </div>
      {household && <p className="text-xs text-sage-400 mb-0.5">🏠 {household.name}</p>}
      {resident && <p className="text-xs text-sage-400 mb-2">👤 {resident.preferredName || resident.legalName}</p>}
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 bg-sage-100 rounded-full overflow-hidden">
          <div className="h-full bg-sage-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-sage-400 shrink-0">{done}/{pt.length}</span>
      </div>
    </button>
  )
}
