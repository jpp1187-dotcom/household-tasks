import React, { useState } from 'react'
import { X, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react'
import { useHouseholds } from '../contexts/HouseholdContext'

const PROJECT_TYPES = [
  { value: 'housing',           label: '🏠 Housing' },
  { value: 'clinical',          label: '🏥 Clinical' },
  { value: 'behavioral_health', label: '🧠 Behavioral Health' },
  { value: 'justice',           label: '⚖️ Justice' },
  { value: 'care_coordination', label: '🤝 Care Coordination' },
  { value: 'benefits',          label: '📋 Benefits' },
]

const STEPS = ['Identity', 'Contact', 'Identifiers & Projects']

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-sage-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder = '', type = 'text', disabled = false }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 disabled:bg-sage-50 disabled:text-sage-400"
    />
  )
}

const EMPTY = {
  // Identity
  legalName: '', preferredName: '', genderIdentity: '', sexAtBirth: '', raceEthnicity: '', primaryLanguage: '',
  // Contact
  contactMethod: '', contactAddress: '', mailingAddress: '', emergencyContact: '',
  // Identifiers
  ssnMasked: '', medicaidId: '', medicareId: '', govIdType: '', govIdNumber: '', mpiId: '', otherInsuranceId: '',
  // Projects
  projectTypes: [],
}

export default function ResidentRegistrationModal({ householdId, existingResident = null, onClose, onSaved }) {
  const { addResident, updateResident, addProject } = useHouseholds()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(existingResident
    ? {
        ...existingResident,
        projectTypes: [],  // existing projects shown in ResidentProfile, not here
      }
    : { ...EMPTY }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function toggleProjectType(type) {
    setForm(prev => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(type)
        ? prev.projectTypes.filter(t => t !== type)
        : [...prev.projectTypes, type],
    }))
  }

  function canProceed() {
    if (step === 0) return form.legalName.trim().length > 0
    return true
  }

  async function handleSubmit() {
    if (!form.legalName.trim()) {
      setError('Legal name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      let resident
      if (existingResident) {
        await updateResident(existingResident.id, { ...form })
        resident = { ...existingResident, ...form }
      } else {
        resident = await addResident({ ...form, householdId })
        // Auto-create a project row for each checked type
        for (const type of form.projectTypes) {
          const label = PROJECT_TYPES.find(p => p.value === type)?.label ?? type
          await addProject({
            householdId,
            residentId: resident.id,
            projectType: type,
            name: `${form.legalName} — ${label}`,
            status: 'active',
          })
        }
      }
      onSaved?.(resident)
      onClose()
    } catch (err) {
      setError(err.message ?? 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Demo warning */}
        <div className="flex items-center gap-2 px-5 py-3 bg-clay-50 border-b border-clay-200 rounded-t-2xl">
          <AlertTriangle size={14} className="text-clay-600 shrink-0" />
          <p className="text-xs text-clay-700 font-medium">
            Demo environment — do not enter real PII or protected health information.
          </p>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage-100">
          <div>
            <h2 className="font-display text-lg text-sage-800">
              {existingResident ? 'Edit Resident' : 'Add Resident'}
            </h2>
            <p className="text-xs text-sage-400 mt-0.5">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex px-6 pt-4 gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 rounded-full w-full transition-colors
                ${i < step ? 'bg-sage-500' : i === step ? 'bg-sage-400' : 'bg-sage-100'}`}
              />
              <span className={`text-xs ${i === step ? 'text-sage-700 font-medium' : 'text-sage-400'}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* ── Step 0: Identity ── */}
          {step === 0 && (
            <>
              <Field label="Legal name *">
                <TextInput value={form.legalName} onChange={v => set('legalName', v)} placeholder="Full legal name" />
              </Field>
              <Field label="Preferred name">
                <TextInput value={form.preferredName} onChange={v => set('preferredName', v)} placeholder="Goes by…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gender identity">
                  <TextInput value={form.genderIdentity} onChange={v => set('genderIdentity', v)} placeholder="Optional" />
                </Field>
                <Field label="Sex at birth">
                  <TextInput value={form.sexAtBirth} onChange={v => set('sexAtBirth', v)} placeholder="Optional" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Race / ethnicity">
                  <TextInput value={form.raceEthnicity} onChange={v => set('raceEthnicity', v)} placeholder="Optional" />
                </Field>
                <Field label="Primary language">
                  <TextInput value={form.primaryLanguage} onChange={v => set('primaryLanguage', v)} placeholder="English" />
                </Field>
              </div>
            </>
          )}

          {/* ── Step 1: Contact ── */}
          {step === 1 && (
            <>
              <Field label="Contact method (phone / email)">
                <TextInput value={form.contactMethod} onChange={v => set('contactMethod', v)} placeholder="(555) 000-0000 or email" />
              </Field>
              <Field label="Contact address">
                <textarea
                  value={form.contactAddress}
                  onChange={e => set('contactAddress', e.target.value)}
                  rows={2}
                  placeholder="123 Main St, City, ST 00000"
                  className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"
                />
              </Field>
              <Field label="Mailing address (if different)">
                <textarea
                  value={form.mailingAddress}
                  onChange={e => set('mailingAddress', e.target.value)}
                  rows={2}
                  placeholder="Leave blank if same as contact address"
                  className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"
                />
              </Field>
              <Field label="Emergency contact">
                <TextInput value={form.emergencyContact} onChange={v => set('emergencyContact', v)} placeholder="Name and phone number" />
              </Field>
            </>
          )}

          {/* ── Step 2: Identifiers + Projects ── */}
          {step === 2 && (
            <>
              <div className="bg-clay-50 border border-clay-200 rounded-lg px-4 py-3 text-xs text-clay-700 mb-2">
                These fields are stored in the database but never logged in activity history.
              </div>
              <Field label="SSN (masked)">
                <TextInput value={form.ssnMasked} onChange={v => set('ssnMasked', v)} placeholder="XXX-XX-XXXX" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Medicaid ID">
                  <TextInput value={form.medicaidId} onChange={v => set('medicaidId', v)} placeholder="Member ID" />
                </Field>
                <Field label="Medicare ID">
                  <TextInput value={form.medicareId} onChange={v => set('medicareId', v)} placeholder="Beneficiary ID" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gov ID type">
                  <TextInput value={form.govIdType} onChange={v => set('govIdType', v)} placeholder="Driver's license, etc." />
                </Field>
                <Field label="Gov ID number">
                  <TextInput value={form.govIdNumber} onChange={v => set('govIdNumber', v)} placeholder="ID number" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="MPI ID">
                  <TextInput value={form.mpiId} onChange={v => set('mpiId', v)} placeholder="Master Patient Index" />
                </Field>
                <Field label="Other insurance ID">
                  <TextInput value={form.otherInsuranceId} onChange={v => set('otherInsuranceId', v)} placeholder="Plan ID" />
                </Field>
              </div>

              {!existingResident && (
                <div>
                  <label className="block text-xs font-semibold text-sage-500 mb-2">
                    Auto-create projects for
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_TYPES.map(pt => (
                      <label
                        key={pt.value}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors
                          ${form.projectTypes.includes(pt.value)
                            ? 'bg-sage-100 border-sage-400 text-sage-800 font-medium'
                            : 'border-sage-200 text-sage-600 hover:bg-sage-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.projectTypes.includes(pt.value)}
                          onChange={() => toggleProjectType(pt.value)}
                          className="hidden"
                        />
                        {pt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-sage-100">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-1 text-sm text-sage-500 hover:text-sage-700 transition-colors"
          >
            <ChevronLeft size={15} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-5 py-2 text-sm font-semibold bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-40 transition-colors"
            >
              Next
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : existingResident ? 'Save changes' : 'Add resident'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
