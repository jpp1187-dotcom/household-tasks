import React, { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Edit2, MoreVertical, Archive, Trash2, RotateCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'
import ResidentRegistrationModal from './ResidentRegistrationModal'
import NotesPanel from './NotesPanel'

const STATUS_COLS = ['todo', 'in_progress', 'done']
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 mb-4">
      <h3 className="text-xs font-semibold text-sage-400 uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm mb-2">
      <span className="text-sage-400 w-36 shrink-0">{label}</span>
      <span className="text-sage-800">{value}</span>
    </div>
  )
}

function ConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-display text-lg text-sage-800 mb-2">Delete project?</h3>
        <p className="text-sm text-sage-600 mb-1">"{name}"</p>
        <p className="text-sm text-sage-400 mb-6">This cannot be undone. All tasks will be deleted.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm border border-sage-200 rounded-xl text-sage-600 hover:bg-sage-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  )
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

export default function ResidentProfile({ residentId, onBack, onSelectProject }) {
  const { isAdmin } = useAuth()
  const { residents, projects, households, activity, archiveProject, restoreProject, deleteProject } = useHouseholds()
  const { tasks } = useTasks()
  const [tab, setTab] = useState('overview')
  const [showSensitive, setShowSensitive] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showArchivedProjects, setShowArchivedProjects] = useState(false)

  const resident = residents.find(r => r.id === residentId)
  const household = resident ? households.find(h => h.id === resident.householdId) : null
  const allResidentProjects = projects.filter(p => p.residentId === residentId)
  const residentProjects = showArchivedProjects
    ? allResidentProjects
    : allResidentProjects.filter(p => !p.archived)
  const archivedCount = allResidentProjects.filter(p => p.archived).length

  // Activity for this resident and their projects/tasks
  const residentProjectIds = new Set(allResidentProjects.map(p => p.id))
  const residentTaskIds = new Set(tasks.filter(t => residentProjectIds.has(t.projectId)).map(t => t.id))
  const residentActivity = activity.filter(a =>
    a.entityId === residentId ||
    residentProjectIds.has(a.entityId) ||
    residentTaskIds.has(a.entityId)
  ).slice(0, 30)

  if (!resident) return <div className="p-8 text-sage-400">Resident not found.</div>

  const displayName = resident.preferredName
    ? `${resident.preferredName} (${resident.legalName})`
    : resident.legalName

  const words = (resident.legalName ?? '').trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] ?? '').toUpperCase() + (words[words.length - 1][0] ?? '').toUpperCase()
    : (words[0]?.[0] ?? '?').toUpperCase()

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-sage-400 hover:text-sage-600 mb-4">
        <ArrowLeft size={14} />
        {household?.name ?? 'Back'}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-sage-200 flex items-center justify-center text-lg font-semibold text-sage-700 shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="font-display text-2xl text-sage-800">{displayName}</h2>
            {resident.genderIdentity && (
              <p className="text-xs text-sage-400 mt-0.5">{resident.genderIdentity}</p>
            )}
          </div>
        </div>
        {isAdmin() && (
          <button onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-sage-200 rounded-xl text-sage-600 hover:bg-sage-50 transition-colors">
            <Edit2 size={14} />
            Edit
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-sage-100 mb-6">
        {['overview', 'notes', 'projects', 'activity'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
              ${tab === t ? 'text-sage-800 border-sage-600' : 'text-sage-400 border-transparent hover:text-sage-600'}`}
          >
            {t === 'projects' ? `Projects (${allResidentProjects.filter(p => !p.archived).length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        <>
          <Section title="Identity">
            <InfoRow label="Legal name" value={resident.legalName} />
            <InfoRow label="Preferred name" value={resident.preferredName} />
            <InfoRow label="Gender identity" value={resident.genderIdentity} />
            <InfoRow label="Sex at birth" value={resident.sexAtBirth} />
            <InfoRow label="Race / ethnicity" value={resident.raceEthnicity} />
            <InfoRow label="Primary language" value={resident.primaryLanguage} />
          </Section>

          <Section title="Contact">
            <InfoRow label="Contact method" value={resident.contactMethod} />
            <InfoRow label="Contact address" value={resident.contactAddress} />
            <InfoRow label="Mailing address" value={resident.mailingAddress} />
            <InfoRow label="Emergency contact" value={resident.emergencyContact} />
            {!resident.contactMethod && !resident.contactAddress && !resident.mailingAddress && !resident.emergencyContact && (
              <p className="text-xs text-sage-300">No contact information on file.</p>
            )}
          </Section>

          {/* Identifiers — sensitive, hidden by default */}
          <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-sage-400 uppercase tracking-widest">Identifiers</h3>
              <button
                onClick={() => setShowSensitive(v => !v)}
                className="flex items-center gap-1 text-xs text-sage-400 hover:text-sage-600 transition-colors"
              >
                {showSensitive ? <EyeOff size={13} /> : <Eye size={13} />}
                {showSensitive ? 'Hide' : 'Show'}
              </button>
            </div>
            {showSensitive ? (
              <>
                <InfoRow label="SSN (masked)" value={resident.ssnMasked || '—'} />
                <InfoRow label="Medicaid ID" value={resident.medicaidId || '—'} />
                <InfoRow label="Medicare ID" value={resident.medicareId || '—'} />
                {resident.govIdType && (
                  <InfoRow label={resident.govIdType} value={resident.govIdNumber} />
                )}
                <InfoRow label="MPI ID" value={resident.mpiId || '—'} />
                <InfoRow label="Other insurance ID" value={resident.otherInsuranceId || '—'} />
              </>
            ) : (
              <p className="text-xs text-sage-300 italic">Hidden — click Show to reveal.</p>
            )}
          </div>
        </>
      )}

      {/* ── Notes tab ── */}
      {tab === 'notes' && (
        <NotesPanel entityType="resident" entityId={residentId} allowSoap={true} />
      )}

      {/* ── Projects tab ── */}
      {tab === 'projects' && (
        <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-sage-400 uppercase tracking-widest">Projects</h3>
            <div className="flex items-center gap-2">
              {archivedCount > 0 && (
                <button
                  onClick={() => setShowArchivedProjects(v => !v)}
                  className="text-xs text-sage-400 hover:text-sage-600 transition-colors"
                >
                  {showArchivedProjects ? 'Hide archived' : `+${archivedCount} archived`}
                </button>
              )}
            </div>
          </div>

          {residentProjects.length === 0 ? (
            <p className="text-xs text-sage-300">No projects yet.</p>
          ) : (
            residentProjects.map(project => {
              const pTasks = tasks.filter(t => t.projectId === project.id)
              const done = pTasks.filter(t => t.status === 'done').length
              const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0

              return (
                <div key={project.id} className={`mb-6 last:mb-0 ${project.archived ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => !project.archived && onSelectProject?.(project.id)}
                      className="text-sm font-semibold text-sage-700 hover:text-sage-900 transition-colors text-left"
                    >
                      {project.name}
                      {project.archived && (
                        <span className="ml-2 text-xs font-normal text-sage-400">(archived)</span>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize
                        ${project.status === 'active'    ? 'bg-sage-100 text-sage-600' :
                          project.status === 'completed' ? 'bg-green-50 text-green-600' :
                                                           'bg-gray-100 text-gray-500'}`}
                      >
                        {project.status}
                      </span>
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <ProjectMenu
                          project={project}
                          onArchive={() => archiveProject(project.id)}
                          onRestore={() => restoreProject(project.id)}
                          onDelete={() => setConfirmDelete({ id: project.id, name: project.name })}
                          isAdmin={isAdmin()}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-sage-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sage-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-sage-400 shrink-0">{done}/{pTasks.length}</span>
                  </div>

                  {pTasks.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {STATUS_COLS.map(col => {
                        const colTasks = pTasks.filter(t => t.status === col)
                        return (
                          <div key={col}>
                            <p className="text-xs text-sage-400 font-medium mb-1.5">
                              {STATUS_LABELS[col]} {colTasks.length > 0 && `(${colTasks.length})`}
                            </p>
                            <div className="space-y-1.5">
                              {colTasks.map(t => (
                                <div key={t.id} className="bg-sage-50 rounded-lg px-2 py-1.5">
                                  <p className={`text-xs leading-snug ${t.status === 'done' ? 'line-through text-sage-400' : 'text-sage-700'}`}>
                                    {t.title}
                                  </p>
                                </div>
                              ))}
                              {colTasks.length === 0 && (
                                <div className="h-8 border border-dashed border-sage-200 rounded-lg" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Activity tab ── */}
      {tab === 'activity' && (
        <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-sage-400 uppercase tracking-widest mb-4">Activity</h3>
          {residentActivity.length === 0 ? (
            <p className="text-xs text-sage-300">No activity yet.</p>
          ) : (
            <div className="space-y-4">
              {residentActivity.map(a => (
                <div key={a.id} className="text-xs">
                  <p className="text-sage-700 leading-snug">
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
              ))}
            </div>
          )}
        </div>
      )}

      {showEditModal && (
        <ResidentRegistrationModal
          householdId={resident.householdId}
          existingResident={resident}
          onClose={() => setShowEditModal(false)}
          onSaved={() => setShowEditModal(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          name={confirmDelete.name}
          onConfirm={() => { deleteProject(confirmDelete.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function ProjectMenu({ project, onArchive, onRestore, onDelete, isAdmin }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="p-1 text-sage-300 hover:text-sage-600 rounded transition-colors"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 bg-white border border-sage-200 rounded-xl shadow-lg py-1 min-w-36">
          {project.archived ? (
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
    </>
  )
}
