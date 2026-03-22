import React, { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Edit2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'
import ResidentRegistrationModal from './ResidentRegistrationModal'
import TaskCard from './TaskCard'

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

export default function ResidentProfile({ residentId, onBack, onSelectProject }) {
  const { isAdmin } = useAuth()
  const { residents, projects, households } = useHouseholds()
  const { tasks } = useTasks()
  const [showSensitive, setShowSensitive] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const resident = residents.find(r => r.id === residentId)
  const household = resident ? households.find(h => h.id === resident.householdId) : null
  const residentProjects = projects.filter(p => p.residentId === residentId)

  if (!resident) return <div className="p-8 text-sage-400">Resident not found.</div>

  const displayName = resident.preferredName
    ? `${resident.preferredName} (${resident.legalName})`
    : resident.legalName

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-3xl">
      {/* Back breadcrumb */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-sage-400 hover:text-sage-600 mb-4"
      >
        <ArrowLeft size={14} />
        {household?.name ?? 'Back'}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            {/* Initials avatar */}
            <div className="w-12 h-12 rounded-full bg-sage-200 flex items-center justify-center text-lg font-semibold text-sage-700 shrink-0">
              {(() => {
                const words = (resident.legalName ?? '').trim().split(/\s+/)
                return words.length >= 2
                  ? (words[0][0] ?? '?').toUpperCase() + (words[words.length - 1][0] ?? '').toUpperCase()
                  : (words[0]?.[0] ?? '?').toUpperCase()
              })()}
            </div>
            <div>
              <h2 className="font-display text-2xl text-sage-800">{displayName}</h2>
              {resident.genderIdentity && (
                <p className="text-xs text-sage-400 mt-0.5">{resident.genderIdentity}</p>
              )}
            </div>
          </div>
        </div>
        {isAdmin() && (
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-sage-200 rounded-xl text-sage-600 hover:bg-sage-50 transition-colors"
          >
            <Edit2 size={14} />
            Edit
          </button>
        )}
      </div>

      {/* Identity */}
      <Section title="Identity">
        <InfoRow label="Legal name" value={resident.legalName} />
        <InfoRow label="Preferred name" value={resident.preferredName} />
        <InfoRow label="Gender identity" value={resident.genderIdentity} />
        <InfoRow label="Sex at birth" value={resident.sexAtBirth} />
        <InfoRow label="Race / ethnicity" value={resident.raceEthnicity} />
        <InfoRow label="Primary language" value={resident.primaryLanguage} />
      </Section>

      {/* Contact */}
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

      {/* Projects — mini kanban */}
      <Section title="Projects">
        {residentProjects.length === 0 ? (
          <p className="text-xs text-sage-300">No projects yet.</p>
        ) : (
          residentProjects.map(project => {
            const pTasks = tasks.filter(t => t.projectId === project.id)
            const done = pTasks.filter(t => t.status === 'done').length
            const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0

            return (
              <div key={project.id} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => onSelectProject?.(project.id)}
                    className="text-sm font-semibold text-sage-700 hover:text-sage-900 transition-colors text-left"
                  >
                    {project.name}
                  </button>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize
                    ${project.status === 'active'    ? 'bg-sage-100 text-sage-600' :
                      project.status === 'completed' ? 'bg-green-50 text-green-600' :
                                                       'bg-gray-100 text-gray-500'}`}
                  >
                    {project.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-1.5 bg-sage-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sage-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-sage-400 shrink-0">{done}/{pTasks.length}</span>
                </div>

                {/* Mini kanban columns */}
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
      </Section>

      {showEditModal && (
        <ResidentRegistrationModal
          householdId={resident.householdId}
          existingResident={resident}
          onClose={() => setShowEditModal(false)}
          onSaved={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}
