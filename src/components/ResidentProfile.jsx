import React, { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Edit2, Check, Calendar, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'
import ResidentRegistrationModal from './ResidentRegistrationModal'
import NotesPanel from './NotesPanel'
import QuickTaskModal from './QuickTaskModal'
import { DOMAIN_CONFIG } from '../lib/domains'

const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-clay-50 text-clay-600 border-clay-200',
  low:    'bg-sage-50 text-sage-500 border-sage-200',
}

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

function TaskItem({ task, onToggle }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-sage-100 shadow-sm">
      <button
        onClick={() => onToggle(task.id)}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${task.status === 'done' ? 'bg-sage-400 border-sage-400' : 'border-sage-300 hover:border-sage-500'}`}
      >
        {task.status === 'done' && <Check size={11} className="text-white" />}
      </button>
      <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-sage-300' : 'text-sage-800'}`}>
        {task.title}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
        {task.priority}
      </span>
      {task.dueDate && (
        <span className="text-xs text-sage-400 flex items-center gap-1 shrink-0">
          <Calendar size={11} />
          {task.dueDate}
        </span>
      )}
    </div>
  )
}

export default function ResidentProfile({ residentId, onBack }) {
  const { isAdmin } = useAuth()
  const { residents, households, activity } = useHouseholds()
  const { tasks, toggleDone } = useTasks()
  const [tab, setTab] = useState('overview')
  const [showSensitive, setShowSensitive] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showDoneTasks, setShowDoneTasks] = useState(false)

  const resident = residents.find(r => r.id === residentId)
  const household = resident ? households.find(h => h.id === resident.householdId) : null

  // Tasks for this resident (from TaskContext — no extra DB call needed)
  const residentTasks = tasks.filter(t => t.residentId === residentId && !t.archived)
  const openTasks = residentTasks.filter(t => t.status !== 'done')
  const doneTasks = residentTasks.filter(t => t.status === 'done')

  // Group open tasks by domain_tag
  const tasksByDomain = {}
  openTasks.forEach(t => {
    const key = t.domainTag || 'none'
    if (!tasksByDomain[key]) tasksByDomain[key] = []
    tasksByDomain[key].push(t)
  })

  // Activity for this resident
  const residentActivity = activity.filter(a => a.entityId === residentId).slice(0, 30)

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
        {['overview', 'notes', 'tasks', 'activity'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
              ${tab === t ? 'text-sage-800 border-sage-600' : 'text-sage-400 border-transparent hover:text-sage-600'}`}
          >
            {t === 'tasks' ? `Tasks (${openTasks.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
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

      {/* ── Tasks tab ── */}
      {tab === 'tasks' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-sage-500">{openTasks.length} open task{openTasks.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-sm"
            >
              <Plus size={14} /> Add Task
            </button>
          </div>

          {openTasks.length === 0 && doneTasks.length === 0 ? (
            <div className="text-center py-16 text-sage-300">
              <p className="text-3xl mb-3">✓</p>
              <p className="text-sm">No tasks for this resident yet.</p>
            </div>
          ) : (
            <>
              {/* Tasks grouped by domain */}
              {Object.entries(tasksByDomain).map(([key, domTasks]) => {
                const cfg = key !== 'none' ? DOMAIN_CONFIG[key] : null
                return (
                  <div key={key} className="mb-5">
                    {cfg ? (
                      <p className="text-xs font-semibold text-sage-500 mb-2 flex items-center gap-1.5">
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                        <span className="text-sage-400">({domTasks.length})</span>
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-sage-400 mb-2">No domain ({domTasks.length})</p>
                    )}
                    <div className="space-y-2">
                      {domTasks.map(t => (
                        <TaskItem key={t.id} task={t} onToggle={toggleDone} />
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Completed tasks toggle */}
              {doneTasks.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowDoneTasks(v => !v)}
                    className="text-xs text-sage-400 hover:text-sage-600 transition-colors mb-2"
                  >
                    {showDoneTasks ? '▾' : '▸'} {doneTasks.length} completed
                  </button>
                  {showDoneTasks && (
                    <div className="space-y-2 opacity-60">
                      {doneTasks.map(t => (
                        <TaskItem key={t.id} task={t} onToggle={toggleDone} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
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

      {showAddTask && (
        <QuickTaskModal
          prefillResident={resident}
          prefillHousehold={household}
          onClose={() => setShowAddTask(false)}
        />
      )}
    </div>
  )
}
