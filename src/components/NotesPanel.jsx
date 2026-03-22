import React, { useState, useEffect, useRef } from 'react'
import { Plus, ChevronDown, ChevronUp, FileText, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TaskContext'
import { DOMAIN_CONFIG } from '../lib/domains'
import QuickTaskModal from './QuickTaskModal'
import { format } from 'date-fns'

function formatDate(str) {
  if (!str) return ''
  try {
    return format(new Date(str), 'MMM d, yyyy h:mma').replace('AM', 'am').replace('PM', 'pm')
  } catch { return str }
}

// ── Domain guesser ─────────────────────────────────────────────────────────────
function guessDomain(sentence) {
  const s = sentence.toLowerCase()
  if (/housing|lease|landlord|rent|evict|unit|apartment|shelter/.test(s)) return 'housing'
  if (/clinical|appointment|medical|doctor|prescri|hospital|health|diagnos|medication/.test(s)) return 'clinical'
  if (/benefits|medicaid|medicare|snap|insurance|ssi|ssdi|application|eligib/.test(s)) return 'benefits'
  if (/court|justice|legal|attorney|probation|parole|charge|hearing|warrant/.test(s)) return 'justice'
  if (/care|refer|coordinat|discharge|transition|placement|service plan/.test(s)) return 'care_coordination'
  if (/behavioral|mental|therapy|counseling|substance|addiction|psychiatric|psych/.test(s)) return 'behavioral_health'
  return null
}

const ACTION_VERBS = /\b(follow up|schedule|call|send|submit|contact|arrange|complete|review|update|refer|connect|ensure|request|obtain|assist|provide)\b/i

function extractTaskSuggestions(planText) {
  if (!planText?.trim()) return []
  // Split on periods, semicolons, newlines
  const sentences = planText
    .split(/[.;\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 8)
  return sentences
    .filter(s => ACTION_VERBS.test(s))
    .slice(0, 8)
    .map(s => ({
      title: s.charAt(0).toUpperCase() + s.slice(1),
      domain_tag: guessDomain(s),
    }))
}

// ── NoteCard ──────────────────────────────────────────────────────────────────
function NoteCard({ note, authorName }) {
  const [expanded, setExpanded] = useState(false)

  const preview = note.note_type === 'soap'
    ? [note.subjective, note.objective, note.assessment, note.plan].filter(Boolean).join(' | ').slice(0, 120)
    : (note.content ?? '').slice(0, 120)

  return (
    <div className="bg-sage-50 rounded-xl border border-sage-100 p-4 mb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {note.note_type === 'soap' ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-medium">
              <ClipboardList size={10} /> SOAP
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-sage-100 text-sage-600 border border-sage-200 rounded-full font-medium">
              <FileText size={10} /> Free Write
            </span>
          )}
          <span className="text-xs text-sage-500 font-medium">{authorName}</span>
          <span className="text-xs text-sage-400">{formatDate(note.created_at)}</span>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-sage-300 hover:text-sage-600 shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="mt-2">
        {!expanded ? (
          <p className="text-xs text-sage-600 leading-relaxed">{preview}
            {(note.note_type === 'soap'
              ? [note.subjective, note.objective, note.assessment, note.plan].filter(Boolean).join(' ').length
              : (note.content ?? '').length) > 120 && (
              <button onClick={() => setExpanded(true)} className="text-sage-400 hover:text-sage-600 ml-1">
                …read more
              </button>
            )}
          </p>
        ) : note.note_type === 'soap' ? (
          <div className="space-y-2 text-xs text-sage-700">
            {note.subjective && <div><p className="font-semibold text-sage-400 mb-0.5">Subjective</p><p className="leading-relaxed whitespace-pre-wrap">{note.subjective}</p></div>}
            {note.objective  && <div><p className="font-semibold text-sage-400 mb-0.5">Objective</p><p className="leading-relaxed whitespace-pre-wrap">{note.objective}</p></div>}
            {note.assessment && <div><p className="font-semibold text-sage-400 mb-0.5">Assessment</p><p className="leading-relaxed whitespace-pre-wrap">{note.assessment}</p></div>}
            {note.plan       && <div><p className="font-semibold text-sage-400 mb-0.5">Plan</p><p className="leading-relaxed whitespace-pre-wrap">{note.plan}</p></div>}
          </div>
        ) : (
          <p className="text-xs text-sage-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
        )}
      </div>
    </div>
  )
}

// ── SOAP Form with task suggestions ───────────────────────────────────────────
function SOAPForm({ onSave, onCancel, residentId }) {
  const { currentUser } = useAuth()
  const { addTask } = useTasks()
  const [form, setForm] = useState({ subjective: '', objective: '', assessment: '', plan: '' })
  const [suggestions, setSuggestions] = useState([])
  const [checked, setChecked] = useState({})
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Debounced plan parsing
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const newSuggestions = extractTaskSuggestions(form.plan)
      setSuggestions(newSuggestions)
      // Pre-check all new suggestions
      const newChecked = {}
      newSuggestions.forEach((_, i) => { newChecked[i] = true })
      setChecked(newChecked)
    }, 800)
    return () => clearTimeout(debounceRef.current)
  }, [form.plan])

  const checkedCount = Object.values(checked).filter(Boolean).length

  async function handleSave() {
    if (saving) return
    setSaving(true)
    // 1. Save the note
    await onSave('soap', form, suggestions.filter((_, i) => checked[i]))
    setSaving(false)
  }

  const taCls = "w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"

  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-4 mb-4 space-y-3">
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">SOAP Note</p>
      {[['subjective','Subjective'],['objective','Objective'],['assessment','Assessment']].map(([k,l]) => (
        <div key={k}>
          <label className="block text-xs font-semibold text-sage-500 mb-1">{l}</label>
          <textarea rows={2} value={form[k]} onChange={e => set(k, e.target.value)} className={taCls} placeholder={`${l}…`} />
        </div>
      ))}

      {/* Plan field */}
      <div>
        <label className="block text-xs font-semibold text-sage-500 mb-1">Plan</label>
        <textarea rows={3} value={form.plan} onChange={e => set('plan', e.target.value)} className={taCls} placeholder="Plan… (action items will be suggested as tasks)" />
      </div>

      {/* Task suggestions panel */}
      {suggestions.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-green-700 mb-2">Suggested tasks from Plan</p>
          {suggestions.map((s, i) => {
            const cfg = s.domain_tag ? DOMAIN_CONFIG[s.domain_tag] : null
            return (
              <label key={i} className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checked[i]}
                  onChange={e => setChecked(prev => ({ ...prev, [i]: e.target.checked }))}
                  className="mt-0.5 shrink-0 accent-green-600"
                />
                <span className="flex-1 text-xs text-sage-800 leading-snug">{s.title}</span>
                {cfg && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? 'Saving…'
            : checkedCount > 0
              ? `Save note + create ${checkedCount} task${checkedCount !== 1 ? 's' : ''}`
              : 'Save Note'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-sage-400 hover:text-sage-600">Cancel</button>
      </div>
    </div>
  )
}

// ── Free Write Form ────────────────────────────────────────────────────────────
function FreeWriteForm({ onSave, onCancel, residentId }) {
  const [content, setContent] = useState('')
  const [showQuickTask, setShowQuickTask] = useState(false)

  return (
    <div className="bg-white border-2 border-sage-200 rounded-xl p-4 mb-4 space-y-3">
      <p className="text-xs font-semibold text-sage-500 uppercase tracking-widest">Free Write</p>
      <textarea rows={4} value={content} onChange={e => setContent(e.target.value)}
        className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm text-sage-800 resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"
        placeholder="Write anything…" autoFocus
      />
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => onSave('free', { content })}
          disabled={!content.trim()}
          className="px-4 py-1.5 text-sm font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-40">
          Save Note
        </button>
        {residentId && (
          <button
            type="button"
            onClick={() => setShowQuickTask(true)}
            className="px-3 py-1.5 text-sm font-medium border border-green-200 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            + Add task from this note
          </button>
        )}
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-sage-400 hover:text-sage-600">Cancel</button>
      </div>
      {showQuickTask && (
        <QuickTaskModal
          onClose={() => setShowQuickTask(false)}
        />
      )}
    </div>
  )
}

// ── NotesPanel ────────────────────────────────────────────────────────────────
/**
 * NotesPanel — SOAP + free-write notes for residents and households.
 * Pass residentId to enable task suggestions on SOAP notes.
 *
 * Required SQL:
 * CREATE TABLE IF NOT EXISTS notes (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   entity_type text NOT NULL,
 *   entity_id uuid NOT NULL,
 *   note_type text NOT NULL,
 *   subjective text DEFAULT '',
 *   objective text DEFAULT '',
 *   assessment text DEFAULT '',
 *   plan text DEFAULT '',
 *   content text DEFAULT '',
 *   created_by uuid REFERENCES auth.users(id),
 *   created_at timestamptz DEFAULT now()
 * );
 */
export default function NotesPanel({ entityType, entityId, allowSoap = true, residentId = null }) {
  const { currentUser, allUsers } = useAuth()
  const { addTask } = useTasks()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(null) // 'soap' | 'freewrite' | null

  useEffect(() => {
    if (!entityId) return
    supabase.from('notes')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          if (err.code === '42P01' || err.message?.includes('does not exist')) {
            setError('Notes table not found. Run the notes SQL migration to enable notes.')
          } else {
            setError(err.message)
          }
        } else {
          setNotes(data ?? [])
        }
        setLoading(false)
      })
  }, [entityType, entityId])

  async function handleSave(noteType, data, taskSuggestions = []) {
    const row = {
      entity_type: entityType,
      entity_id: entityId,
      note_type: noteType,
      created_by: currentUser?.id,
      subjective: data.subjective ?? '',
      objective:  data.objective  ?? '',
      assessment: data.assessment ?? '',
      plan:       data.plan       ?? '',
      content:    data.content    ?? '',
    }
    const { data: saved, error: err } = await supabase.from('notes').insert(row).select().single()
    if (err) { alert('Failed to save note: ' + err.message); return }
    setNotes(prev => [saved, ...prev])

    // Create suggested tasks (SOAP only)
    for (const suggestion of taskSuggestions) {
      try {
        await addTask({
          title:       suggestion.title,
          residentId:  residentId ?? entityId,
          householdId: null,
          domainTag:   suggestion.domain_tag ?? null,
          listId:      null,
          assignedTo:  currentUser?.id,
          createdBy:   currentUser?.id,
          priority:    'medium',
          dueDate:     null,
        })
      } catch (e) {
        console.error('[NotesPanel] failed to create task:', e.message)
      }
    }

    setShowForm(null)
  }

  if (loading) return <p className="text-xs text-sage-400 py-4">Loading notes…</p>
  if (error) return (
    <div className="bg-clay-50 border border-clay-200 rounded-xl p-4 text-xs text-clay-700">
      {error}
    </div>
  )

  return (
    <div>
      {/* Action buttons */}
      {!showForm && (
        <div className="flex gap-2 mb-4">
          {allowSoap && (
            <button onClick={() => setShowForm('soap')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
              <Plus size={12} /> SOAP Note
            </button>
          )}
          <button onClick={() => setShowForm('freewrite')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sage-50 text-sage-700 border border-sage-200 rounded-lg hover:bg-sage-100 transition-colors">
            <Plus size={12} /> Free Write
          </button>
        </div>
      )}

      {showForm === 'soap' && (
        <SOAPForm
          onSave={handleSave}
          onCancel={() => setShowForm(null)}
          residentId={residentId ?? (entityType === 'resident' ? entityId : null)}
        />
      )}
      {showForm === 'freewrite' && (
        <FreeWriteForm
          onSave={handleSave}
          onCancel={() => setShowForm(null)}
          residentId={residentId ?? (entityType === 'resident' ? entityId : null)}
        />
      )}

      {/* Notes list */}
      {notes.length === 0 && !showForm && (
        <div className="text-center py-10 text-sage-300">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">No notes yet.</p>
        </div>
      )}

      {notes.map(note => {
        const author = allUsers.find(u => u.id === note.created_by)
        return <NoteCard key={note.id} note={note} authorName={author?.name ?? 'Unknown'} />
      })}
    </div>
  )
}
