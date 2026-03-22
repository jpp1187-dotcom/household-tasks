import React, { useState } from 'react'
import { Plus, ArrowLeft, Save } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHouseholds } from '../contexts/HouseholdContext'
import { useTasks } from '../contexts/TaskContext'
import ResidentRegistrationModal from './ResidentRegistrationModal'

const PROPERTY_TYPES = ['Single Family', 'Condo', 'Apartment', 'Townhouse', 'Group Home', 'Other']

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

// Resident card in the Residents tab
function ResidentCard({ resident, projects, onClick }) {
  const residentProjects = projects.filter(p => p.residentId === resident.id)
  const displayName = resident.preferredName || resident.legalName
  const words = (resident.legalName ?? '').trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] ?? '').toUpperCase() + (words[words.length - 1][0] ?? '').toUpperCase()
    : (words[0]?.[0] ?? '?').toUpperCase()

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-sage-100 shadow-sm p-4 text-left hover:shadow-md transition-shadow w-full"
    >
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
  )
}

export default function HouseholdDetail({ householdId, initialTab = 'details', onBack, onSelectProject, onSelectResident }) {
  const { isAdmin } = useAuth()
  const { households, projects, residents, updateHousehold, addProject } = useHouseholds()
  const { tasks } = useTasks()

  const [tab, setTab] = useState(initialTab)

  // Sync tab when parent navigates to a specific tab (e.g. Sidebar "Residents" link)
  React.useEffect(() => { setTab(initialTab) }, [initialTab])
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showAddResident, setShowAddResident] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  const household = households.find(h => h.id === householdId)
  const hProjects = projects.filter(p => p.householdId === householdId && !p.residentId)
  const hResidents = residents.filter(r => r.householdId === householdId)

  const [form, setForm] = useState(null)

  // (Re-)initialise form when household loads or when navigating to a different household
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

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-8 pb-24 md:pb-8">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-sage-400 hover:text-sage-600 mb-4"
      >
        <ArrowLeft size={14} /> All Households
      </button>

      {/* Page title */}
      <div className="flex items-start justify-between mb-5">
        <h2 className="font-display text-2xl text-sage-800">{household.name}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-sage-100 mb-6">
        {['details', 'residents', 'projects'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
              ${tab === t
                ? 'text-sage-800 border-sage-600'
                : 'text-sage-400 border-transparent hover:text-sage-600'}`}
          >
            {t === 'residents' ? `Residents (${hResidents.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
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
            <Field label="City">
              <TextInput value={form.city} onChange={v => setField('city', v)} />
            </Field>
            <Field label="State">
              <TextInput value={form.state} onChange={v => setField('state', v)} placeholder="NY" />
            </Field>
            <Field label="ZIP">
              <TextInput value={form.zip} onChange={v => setField('zip', v)} placeholder="10001" />
            </Field>
          </div>

          <Field label="Property type">
            <select
              value={form.propertyType}
              onChange={e => setField('propertyType', e.target.value)}
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            >
              <option value="">— Select —</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <div className="pt-2 border-t border-sage-100">
            <p className="text-xs font-semibold text-sage-500 uppercase tracking-widest mb-3">Primary Contact</p>
            <div className="space-y-3">
              <Field label="Contact name">
                <TextInput value={form.contactName} onChange={v => setField('contactName', v)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact email">
                  <TextInput value={form.contactEmail} onChange={v => setField('contactEmail', v)} />
                </Field>
                <Field label="Contact phone">
                  <TextInput value={form.contactPhone} onChange={v => setField('contactPhone', v)} />
                </Field>
              </div>
              <Field label="Contact address">
                <TextInput value={form.contactAddress} onChange={v => setField('contactAddress', v)} placeholder="If different from property" />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <textarea
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              rows={3}
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-50 transition-colors"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saveMsg && (
              <span className={`text-sm ${saveMsg.ok ? 'text-sage-600' : 'text-red-500'}`}>
                {saveMsg.text}
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── Residents tab ── */}
      {tab === 'residents' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-sage-500">
              {hResidents.length} resident{hResidents.length !== 1 ? 's' : ''} in this household
            </p>
            {/* "+ Add Resident" desktop button — hidden on mobile, use FAB instead */}
            {isAdmin() && (
              <button
                onClick={() => setShowAddResident(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                Add Resident
              </button>
            )}
          </div>

          {hResidents.length === 0 ? (
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
              {hResidents.map(r => (
                <ResidentCard
                  key={r.id}
                  resident={r}
                  projects={projects}
                  onClick={() => onSelectResident?.(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Projects tab ── */}
      {tab === 'projects' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-sage-500">Household-level projects (not linked to a specific resident)</p>
            {isAdmin() && (
              <button
                onClick={() => setShowAddProject(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                Add Project
              </button>
            )}
          </div>

          {showAddProject && (
            <form onSubmit={handleAddProject} className="bg-white border-2 border-sage-200 rounded-xl p-4 mb-4 max-w-md flex gap-2">
              <input
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project name…"
                className="flex-1 text-sm border border-sage-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-300"
              />
              <button type="submit" className="px-4 py-2 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700">
                Add
              </button>
              <button type="button" onClick={() => setShowAddProject(false)} className="px-3 py-2 text-sm text-sage-400 hover:text-sage-600">
                ✕
              </button>
            </form>
          )}

          {hProjects.length === 0 ? (
            <div className="text-center py-20 text-sage-300">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">No household projects yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {hProjects.map(p => {
                const pt = tasks.filter(t => t.projectId === p.id)
                const done = pt.filter(t => t.status === 'done').length
                const pct = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 text-left hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sage-800 flex-1 pr-2">{p.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0
                        ${p.status === 'active'    ? 'bg-sage-100 text-sage-600' :
                          p.status === 'completed' ? 'bg-green-50 text-green-600' :
                                                     'bg-gray-100 text-gray-500'}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-sage-500 mb-3 line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex gap-3 text-xs text-sage-400 mb-3">
                      <span>{pt.filter(t => t.status !== 'done').length} open</span>
                      <span>·</span>
                      <span>{done} done</span>
                      {p.dueDate && <span>· Due {p.dueDate}</span>}
                    </div>
                    <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sage-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Mobile FAB — "+ Add Resident" (residents tab only) */}
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
    </div>
  )
}
