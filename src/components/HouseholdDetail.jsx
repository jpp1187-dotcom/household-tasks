import React, { useState } from 'react'
import { Plus, ArrowLeft, Save, MoreVertical, Archive, Trash2, RotateCcw, Check, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'
import ResidentRegistrationModal from './ResidentRegistrationModal'
import NotesPanel from './NotesPanel'
import QuickTaskModal from './QuickTaskModal'

const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-clay-50 text-clay-600 border-clay-200',
  low:    'bg-sage-50 text-sage-500 border-sage-200',
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house',     label: 'House' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'other',     label: 'Other' },
]

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-sage-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
    />
  )
}

function ConfirmModal({ entityType, name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-display text-lg text-sage-800 mb-2">Delete {entityType}?</h3>
        <p className="text-sm text-sage-600 mb-1">"{name}"</p>
        <p className="text-sm text-sage-400 mb-6">This cannot be undone. All associated records will be deleted.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm border border-sage-200 rounded-xl text-sage-600 hover:bg-sage-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  )
}

function ThreeDotMenu({ archived, onArchive, onRestore, onDelete, isAdmin }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="p-1 text-sage-300 hover:text-sage-600 rounded transition-colors"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 bg-white border border-sage-200 rounded-xl shadow-lg py-1 min-w-36">
          {archived ? (
            <button onClick={() => { onRestore(); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-sage-700 hover:bg-sage-50 flex items-center gap-2">
              <RotateCcw size={13} /> Restore
            </button>
          ) : (
            <button onClick={() => { onArchive(); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-sage-700 hover:bg-sage-50 flex items-center gap-2">
              <Archive size={13} /> Archive
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { onDelete(); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Resident card in the Residents tab
function ResidentCard({ resident, projects, onClick, onArchive, onRestore, onDelete, isAdmin }) {
  const residentProjects = projects.filter(p => p.residentId === resident.id)
  const displayName = resident.preferredName || resident.legalName
  const words = (resident.legalName ?? '').trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] ?? '').toUpperCase() + (words[words.length - 1][0] ?? '').toUpperCase()
    : (words[0]?.[0] ?? '?').toUpperCase()

  return (
    <div className={`relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow
      ${resident.archived ? 'opacity-60 border-sage-200' : 'border-sage-100'}`}
    >
      <div className="absolute top-3 right-3 z-10">
        <ThreeDotMenu
          archived={resident.archived}
          onArchive={onArchive}
          onRestore={onRestore}
          onDelete={onDelete}
          isAdmin={isAdmin}
        />
      </div>
      <button
        onClick={() => !resident.archived && onClick()}
        className="w-full text-left p-4 pr-12"
      >
        {resident.archived && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-sage-100 text-sage-500 rounded-full mb-2">
            <Archive size={10} /> Archived
          </span>
        )}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-sage-200 flex items-center justify-center text-sm font-semibold text-sage-700 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sage-800 truncate">{displayName}</p>
            {resident.preferredName && (
              <p className="text-xs text-sage-400 truncate">{resident.legalName}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 text-xs mb-1">
          {resident.primaryLanguage && (
            <span className="px-2 py-0.5 bg-sage-50 text-sage-500 rounded-full">{resident.primaryLanguage}</span>
          )}
          {resident.genderIdentity && (
            <span className="px-2 py-0.5 bg-sage-50 text-sage-500 rounded-full">{resident.genderIdentity}</span>
          )}
        </div>

        {residentProjects.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {residentProjects.map(p => (
              <span key={p.id} className="text-xs px-2 py-0.5 bg-clay-50 text-clay-600 border border-clay-200 rounded-full">
                {p.projectType || p.name}
              </span>
            ))}
          </div>
        )}
      </button>
    </div>
  )
}

export default function HouseholdDetail({ householdId, initialTab = 'details', onBack, onSelectResident }) {
  const { isAdmin } = useAuth()
  const { households, projects, residents, updateHousehold, addProject,
          archiveProject, restoreProject, deleteProject,
          archiveResident, restoreResident, deleteResident } = useHouseholds()
  const { tasks, toggleDone, lists } = useTasks()

  const [tab, setTab] = useState(initialTab)
  React.useEffect(() => { setTab(initialTab) }, [initialTab])

  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showAddResident, setShowAddResident] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [showArchivedResidents, setShowArchivedResidents] = useState(false)
  const [showArchivedProjects, setShowArchivedProjects] = useState(false)
  const [showDoneTasks, setShowDoneTasks] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // { type, id, name }

  const household = households.find(h => h.id === householdId)
  const hProjects  = projects.filter(p => p.householdId === householdId && !p.residentId)
  const hResidents = residents.filter(r => r.householdId === householdId)

  const [form, setForm] = useState(null)
  React.useEffect(() => {
    if (household) {
      setForm({
        name: household.name ?? '',
        address_1: household.address_1 ?? '',
        address_2: household.address_2 ?? '',
        city: household.city ?? '',
        state: household.state ?? '',
        zip: household.zip ?? '',
        propertyType: household.propertyType ?? '',
        contactName: household.contactName ?? '',
        contactEmail: household.contactEmail ?? '',
        contactPhone: household.contactPhone ?? '',
        contactAddress: household.contactAddress ?? '',
        description: household.description ?? '',
      })
    }
  }, [householdId, household])

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    try {
      await updateHousehold(householdId, form)
      setSaveMsg({ text: 'Saved!', ok: true })
    } catch (err) {
      setSaveMsg({ text: 'Error: ' + err.message, ok: false })
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  async function handleAddProject(e) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    await addProject({ householdId, name: newProjectName.trim() })
    setNewProjectName('')
    setShowAddProject(false)
  }

  if (!household) return <div className="p-8 text-sage-400">Household not found.</div>

  const visibleResidents = showArchivedResidents ? hResidents : hResidents.filter(r => !r.archived)
  const visibleProjects  = showArchivedProjects  ? hProjects  : hProjects.filter(p => !p.archived)
  const archivedResidentCount = hResidents.filter(r => r.archived).length
  const archivedProjectCount  = hProjects.filter(p => p.archived).length

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-8 pb-24 md:pb-8">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-sage-400 hover:text-sage-600 mb-4">
        <ArrowLeft size={14} /> All Households
      </button>

      <div className="flex items-start justify-between mb-5">
        <h2 className="font-display text-2xl text-sage-800">{household.name}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-sage-100 mb-6">
        {['details', 'residents', 'tasks', 'projects', 'notes'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
              ${tab === t ? 'text-sage-800 border-sage-600' : 'text-sage-400 border-transparent hover:text-sage-600'}`}
          >
            {t === 'residents' ? `Residents (${hResidents.filter(r => !r.archived).length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Details tab ── */}
      {tab === 'details' && form && (
        <form onSubmit={handleSave} className="max-w-xl space-y-4">
          <Field label="Household name">
            <TextInput value={form.name} onChange={v => setField('name', v)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Address line 1">
              <TextInput value={form.address_1} onChange={v => setField('address_1', v)} placeholder="123 Main St" />
            </Field>
            <Field label="Address line 2">
              <TextInput value={form.address_2} onChange={v => setField('address_2', v)} placeholder="Apt 4B" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="City"><TextInput value={form.city} onChange={v => setField('city', v)} /></Field>
            <Field label="State"><TextInput value={form.state} onChange={v => setField('state', v)} placeholder="NY" /></Field>
            <Field label="ZIP"><TextInput value={form.zip} onChange={v => setField('zip', v)} placeholder="10001" /></Field>
          </div>

          <Field label="Property type">
            <select value={form.propertyType} onChange={e => setField('propertyType', e.target.value)}
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300">
              <option value="">— Select —</option>
              {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <div className="pt-2 border-t border-sage-100">
            <p className="text-xs font-semibold text-sage-500 uppercase tracking-widest mb-3">Primary Contact</p>
            <div className="space-y-3">
              <Field label="Contact name"><TextInput value={form.contactName} onChange={v => setField('contactName', v)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact email"><TextInput value={form.contactEmail} onChange={v => setField('contactEmail', v)} /></Field>
                <Field label="Contact phone"><TextInput value={form.contactPhone} onChange={v => setField('contactPhone', v)} /></Field>
              </div>
              <Field label="Contact address">
                <TextInput value={form.contactAddress} onChange={v => setField('contactAddress', v)} placeholder="If different from property" />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3}
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-50 transition-colors">
              <Save size={14} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saveMsg && (
              <span className={`text-sm ${saveMsg.ok ? 'text-sage-600' : 'text-red-500'}`}>{saveMsg.text}</span>
            )}
          </div>
        </form>
      )}

      {/* ── Residents tab ── */}
      {tab === 'residents' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-sage-500">
                {hResidents.filter(r => !r.archived).length} resident{hResidents.filter(r => !r.archived).length !== 1 ? 's' : ''}
              </p>
              {archivedResidentCount > 0 && isAdmin() && (
                <button
                  onClick={() => setShowArchivedResidents(v => !v)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors
                    ${showArchivedResidents ? 'bg-sage-100 border-sage-300 text-sage-700' : 'border-sage-200 text-sage-400 hover:bg-sage-50'}`}
                >
                  {showArchivedResidents ? 'Hide archived' : `+${archivedResidentCount} archived`}
                </button>
              )}
            </div>
            {isAdmin() && (
              <button
                onClick={() => setShowAddResident(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm"
              >
                <Plus size={16} /> Add Resident
              </button>
            )}
          </div>

          {visibleResidents.length === 0 ? (
            <div className="text-center py-20 text-sage-300">
              <p className="text-4xl mb-3">🏘️</p>
              <p className="text-sm">No residents added yet.</p>
              {isAdmin() && (
                <button onClick={() => setShowAddResident(true)} className="mt-3 text-sm text-sage-500 underline">
                  Add the first resident
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleResidents.map(r => (
                <ResidentCard
                  key={r.id}
                  resident={r}
                  projects={projects}
                  onClick={() => onSelectResident?.(r.id)}
                  onArchive={() => archiveResident(r.id)}
                  onRestore={() => restoreResident(r.id)}
                  onDelete={() => setConfirmDelete({ type: 'resident', id: r.id, name: r.legalName })}
                  isAdmin={isAdmin()}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tasks tab ── */}
      {tab === 'tasks' && (() => {
        const hResidentIds = new Set(residents.filter(r => r.householdId === householdId).map(r => r.id))
        const householdTasks = tasks.filter(t =>
          !t.archived && (t.householdId === householdId || hResidentIds.has(t.residentId))
        )
        const openTasks = householdTasks.filter(t => t.status !== 'done')
        const doneTasks = householdTasks.filter(t => t.status === 'done')

        const tasksByList = {}
        openTasks.forEach(t => {
          const key = t.listId || 'none'
          if (!tasksByList[key]) tasksByList[key] = []
          tasksByList[key].push(t)
        })

        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-sage-500">{openTasks.length} open task{openTasks.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-sm"
              >
                <Plus size={16} /> Add Task
              </button>
            </div>

            {openTasks.length === 0 && doneTasks.length === 0 ? (
              <div className="text-center py-20 text-sage-300">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm">No tasks for this household yet.</p>
              </div>
            ) : (
              <>
                {Object.entries(tasksByList).map(([key, listTasks]) => {
                  const list = key !== 'none' ? lists.find(l => l.id === key) : null
                  return (
                    <div key={key} className="mb-5">
                      <p className="text-xs font-semibold text-sage-500 mb-2 flex items-center gap-1.5">
                        {list ? (
                          <><span>{list.icon}</span><span>{list.name}</span></>
                        ) : (
                          <span>No list</span>
                        )}
                        <span className="text-sage-400">({listTasks.length})</span>
                      </p>
                      <div className="space-y-2 max-w-2xl">
                        {listTasks.map(t => (
                          <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-sage-100 shadow-sm">
                            <button
                              onClick={() => toggleDone(t.id)}
                              className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                ${t.status === 'done' ? 'bg-sage-400 border-sage-400' : 'border-sage-300 hover:border-sage-500'}`}
                            >
                              {t.status === 'done' && <Check size={11} className="text-white" />}
                            </button>
                            <span className={`flex-1 text-sm ${t.status === 'done' ? 'line-through text-sage-300' : 'text-sage-800'}`}>
                              {t.title}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${PRIORITY_STYLES[t.priority]}`}>
                              {t.priority}
                            </span>
                            {t.dueDate && (
                              <span className="text-xs text-sage-400 flex items-center gap-1 shrink-0">
                                <Calendar size={11} />{t.dueDate}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {doneTasks.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowDoneTasks(v => !v)}
                      className="text-xs text-sage-400 hover:text-sage-600 transition-colors mb-2"
                    >
                      {showDoneTasks ? '▾' : '▸'} {doneTasks.length} completed
                    </button>
                    {showDoneTasks && (
                      <div className="space-y-2 max-w-2xl opacity-60">
                        {doneTasks.map(t => (
                          <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-sage-100 shadow-sm">
                            <button
                              onClick={() => toggleDone(t.id)}
                              className="shrink-0 w-5 h-5 rounded-full border-2 bg-sage-400 border-sage-400 flex items-center justify-center"
                            >
                              <Check size={11} className="text-white" />
                            </button>
                            <span className="flex-1 text-sm line-through text-sage-300">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* ── Projects tab ── */}
      {tab === 'projects' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-sage-500">Household-level projects</p>
              {archivedProjectCount > 0 && isAdmin() && (
                <button
                  onClick={() => setShowArchivedProjects(v => !v)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors
                    ${showArchivedProjects ? 'bg-sage-100 border-sage-300 text-sage-700' : 'border-sage-200 text-sage-400 hover:bg-sage-50'}`}
                >
                  {showArchivedProjects ? 'Hide archived' : `+${archivedProjectCount} archived`}
                </button>
              )}
            </div>
            {isAdmin() && (
              <button onClick={() => setShowAddProject(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm">
                <Plus size={16} /> Add Project
              </button>
            )}
          </div>

          {showAddProject && (
            <form onSubmit={handleAddProject} className="bg-white border-2 border-sage-200 rounded-xl p-4 mb-4 max-w-md flex gap-2">
              <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project name…"
                className="flex-1 text-sm border border-sage-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-300" />
              <button type="submit" className="px-4 py-2 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700">Add</button>
              <button type="button" onClick={() => setShowAddProject(false)} className="px-3 py-2 text-sm text-sage-400 hover:text-sage-600">✕</button>
            </form>
          )}

          {visibleProjects.length === 0 ? (
            <div className="text-center py-20 text-sage-300">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">No household projects yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleProjects.map(p => (
                <div key={p.id} className={`relative bg-white rounded-xl border shadow-sm
                  ${p.archived ? 'opacity-60 border-sage-200' : 'border-sage-100'}`}
                >
                  <div className="absolute top-4 right-4 z-10">
                    <ThreeDotMenu
                      archived={p.archived}
                      onArchive={() => archiveProject(p.id)}
                      onRestore={() => restoreProject(p.id)}
                      onDelete={() => setConfirmDelete({ type: 'project', id: p.id, name: p.name })}
                      isAdmin={isAdmin()}
                    />
                  </div>
                  <div className="w-full text-left p-5 pr-12">
                    {p.archived && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-sage-100 text-sage-500 rounded-full mb-2">
                        <Archive size={10} /> Archived
                      </span>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sage-800 flex-1 pr-2">{p.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0
                        ${p.status === 'active' ? 'bg-sage-100 text-sage-600' :
                          p.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    {p.description && <p className="text-xs text-sage-500 line-clamp-2">{p.description}</p>}
                    {p.dueDate && <p className="text-xs text-sage-400 mt-1">Due {p.dueDate}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Notes tab ── */}
      {tab === 'notes' && (
        <div className="max-w-2xl">
          <NotesPanel entityType="household" entityId={householdId} allowSoap={false} />
        </div>
      )}

      {/* Mobile FAB */}
      {tab === 'residents' && isAdmin() && (
        <button
          onClick={() => setShowAddResident(true)}
          className="md:hidden fixed bottom-6 right-6 z-20 w-14 h-14 bg-sage-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-sage-700 active:scale-95 transition-all"
          aria-label="Add resident"
        >
          <Plus size={24} />
        </button>
      )}

      {showAddResident && (
        <ResidentRegistrationModal
          householdId={householdId}
          onClose={() => setShowAddResident(false)}
          onSaved={() => setShowAddResident(false)}
        />
      )}

      {showAddTask && (
        <QuickTaskModal
          prefillHousehold={household}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          entityType={confirmDelete.type}
          name={confirmDelete.name}
          onConfirm={() => {
            if (confirmDelete.type === 'resident') deleteResident(confirmDelete.id)
            else deleteProject(confirmDelete.id)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
