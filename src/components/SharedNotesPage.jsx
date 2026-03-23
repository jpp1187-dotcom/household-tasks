import React, { useState, useEffect, useRef } from 'react'
import { Plus, X, Tag, Download, FileText, Loader, ChevronDown } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { readToken, createGoogleDoc } from '../lib/googleAuth'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// ── DOCX download helper ──────────────────────────────────────────────────────
async function downloadDocx(note) {
  const lines = (note.content ?? '').split('\n')

  const children = [
    note.title
      ? new Paragraph({ text: note.title, heading: HeadingLevel.HEADING_1 })
      : null,
    note.tags?.length
      ? new Paragraph({
          children: [new TextRun({ text: `Tags: ${note.tags.join(', ')}`, italics: true, color: '888888' })],
        })
      : null,
    new Paragraph({ text: '' }),
    ...lines.map(line =>
      new Paragraph({ children: [new TextRun({ text: line || '' })] })
    ),
  ].filter(Boolean)

  const doc  = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${(note.title || 'shared-note').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Export dropdown ───────────────────────────────────────────────────────────
function ExportMenu({ note }) {
  const [open,        setOpen]        = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError,   setDocsError]   = useState('')
  const [docsLink,    setDocsLink]    = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleDocx() {
    setOpen(false)
    try { await downloadDocx(note) }
    catch (err) { console.error('[ExportMenu] DOCX error:', err) }
  }

  async function handleGoogleDocs() {
    setOpen(false)
    setDocsError('')
    setDocsLink('')
    const token = readToken()
    if (!token) {
      setDocsError(
        GOOGLE_CLIENT_ID
          ? 'Connect Google Calendar first (Dashboard → Google Agenda card) to enable Docs export.'
          : 'Add VITE_GOOGLE_CLIENT_ID to .env.local to enable Google Docs.'
      )
      return
    }
    setDocsLoading(true)
    try {
      const url = await createGoogleDoc(note.title || 'Shared Note', note.content ?? '', token)
      if (url) {
        setDocsLink(url)
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        setDocsError('Failed to create Google Doc.')
      }
    } catch (err) {
      setDocsError(err.message ?? 'Google Docs error')
    } finally {
      setDocsLoading(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sage-500 border border-sage-200 rounded-lg hover:bg-sage-50 transition-colors"
        title="Export this note"
      >
        {docsLoading ? <Loader size={11} className="animate-spin" /> : <Download size={11} />}
        Export <ChevronDown size={9} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-sage-200 rounded-xl shadow-lg min-w-[195px] py-1 overflow-hidden">
          <button
            onClick={handleDocx}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-sage-700 hover:bg-sage-50 transition-colors text-left"
          >
            <FileText size={14} className="text-blue-500 shrink-0" />
            Download as Word (.docx)
          </button>
          <button
            onClick={handleGoogleDocs}
            disabled={docsLoading}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-sage-700 hover:bg-sage-50 transition-colors text-left disabled:opacity-50"
          >
            <svg viewBox="0 0 48 48" className="w-3.5 h-3.5 shrink-0">
              <path fill="#2196F3" d="M37 45H11c-2.2 0-4-1.8-4-4V7c0-2.2 1.8-4 4-4h19l11 11v27c0 2.2-1.8 4-4 4z"/>
              <path fill="#BBDEFB" d="M40 14H30V4z"/>
              <path fill="#E3F2FD" d="M31 23H17v-2h14v2zm3 4H17v-2h17v2zm-3 4H17v-2h14v2z"/>
            </svg>
            Send to Google Docs
          </button>
        </div>
      )}

      {docsError && (
        <p className="text-xs text-red-500 mt-1 absolute right-0 w-52 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 z-10 leading-snug shadow-sm">
          {docsError}
        </p>
      )}
      {docsLink && !docsError && (
        <a
          href={docsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 underline mt-1 block absolute right-0"
        >
          Open in Google Docs →
        </a>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SharedNotesPage() {
  const { currentUser } = useAuth()
  const [notes,     setNotes]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeTag, setActiveTag] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editNote,  setEditNote]  = useState(null)

  useEffect(() => { fetchNotes() }, [])

  async function fetchNotes() {
    setLoading(true)
    const { data } = await supabase
      .from('shared_notes')
      .select('id, title, content, tags, created_at, created_by, author:profiles!created_by(name)')
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }

  const allTags  = [...new Set(notes.flatMap(n => n.tags ?? []))].sort()
  const filtered = activeTag ? notes.filter(n => (n.tags ?? []).includes(activeTag)) : notes

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Shared Notes</h2>
          <p className="text-xs text-sage-400 mt-0.5">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditNote(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
              ${!activeTag ? 'bg-sage-600 text-white border-sage-600' : 'text-sage-500 border-sage-200 hover:border-sage-400'}`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                ${activeTag === tag ? 'bg-sage-600 text-white border-sage-600' : 'text-sage-500 border-sage-200 hover:border-sage-400'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Notes masonry grid */}
      {loading ? (
        <p className="text-xs text-sage-300 py-4">Loading…</p>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-sage-300 cursor-pointer hover:bg-sage-50 rounded-2xl transition-colors"
          onClick={() => { setEditNote(null); setShowModal(true) }}
        >
          <p className="text-4xl mb-2">📝</p>
          <p className="text-sm">No notes yet. Click to add one.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered.map(note => (
            <div
              key={note.id}
              className="break-inside-avoid bg-white rounded-xl border border-sage-100 shadow-sm p-4 hover:border-sage-300 transition-colors"
            >
              {/* Top row: title + export button */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => { setEditNote(note); setShowModal(true) }}
                >
                  {note.title && (
                    <p className="font-semibold text-sage-800 text-sm">{note.title}</p>
                  )}
                </div>
                <div className="shrink-0 relative" onClick={e => e.stopPropagation()}>
                  <ExportMenu note={note} />
                </div>
              </div>

              {/* Body */}
              <div
                className="cursor-pointer"
                onClick={() => { setEditNote(note); setShowModal(true) }}
              >
                {note.content && (
                  <p className="text-xs text-sage-600 leading-relaxed whitespace-pre-wrap line-clamp-6">{note.content}</p>
                )}
                {(note.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {note.tags.map(tag => (
                      <span key={tag} className="text-xs bg-sage-50 text-sage-500 px-2 py-0.5 rounded-full border border-sage-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-sage-300 mt-2">
                  {note.author?.name ?? note.created_by?.slice(0, 8)} ·{' '}
                  {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note modal */}
      {showModal && (
        <NoteModal
          note={editNote}
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onSaved={fetchNotes}
        />
      )}
    </div>
  )
}

// ── Note edit / create modal ──────────────────────────────────────────────────
function NoteModal({ note, currentUser, onClose, onSaved }) {
  const [title,    setTitle]    = useState(note?.title   ?? '')
  const [content,  setContent]  = useState(note?.content ?? '')
  const [tagInput, setTagInput] = useState((note?.tags ?? []).join(', '))
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    try {
      if (note?.id) {
        await supabase.from('shared_notes').update({ title, content, tags }).eq('id', note.id)
      } else {
        await supabase.from('shared_notes').insert({ title, content, tags, created_by: currentUser?.id })
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!note?.id || deleting) return
    setDeleting(true)
    await supabase.from('shared_notes').delete().eq('id', note.id)
    onSaved()
    onClose()
  }

  const liveNote = { title, content, tags: tagInput.split(',').map(t => t.trim()).filter(Boolean) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-sage-100">
          <h3 className="font-display text-lg text-sage-800">{note ? 'Edit note' : 'New note'}</h3>
          <div className="flex items-center gap-2">
            <ExportMenu note={liveNote} />
            <button onClick={onClose} className="text-sage-300 hover:text-sage-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full text-sm font-semibold text-sage-800 border border-sage-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your note…"
            rows={8}
            className="w-full text-sm text-sage-700 border border-sage-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          <div>
            <label className="block text-xs font-semibold text-sage-400 mb-1 flex items-center gap-1">
              <Tag size={11} /> Tags (comma separated)
            </label>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="e.g. shopping, travel"
              className="w-full text-sm text-sage-700 border border-sage-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 pb-5 pt-3 border-t border-sage-50">
          {note?.created_by === currentUser?.id ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-sage-500 hover:text-sage-700 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-sage-600 rounded-xl hover:bg-sage-700 transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
