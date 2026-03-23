import React, { useState, useEffect } from 'react'
import { Plus, X, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function SharedNotesPage() {
  const { currentUser } = useAuth()
  const [notes,        setNotes]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activeTag,    setActiveTag]    = useState(null)
  const [showModal,    setShowModal]    = useState(false)
  const [editNote,     setEditNote]     = useState(null)

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

  const allTags = [...new Set(notes.flatMap(n => n.tags ?? []))].sort()
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

      {/* Notes grid */}
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
              onClick={() => { setEditNote(note); setShowModal(true) }}
              className="break-inside-avoid bg-white rounded-xl border border-sage-100 shadow-sm p-4 cursor-pointer hover:border-sage-300 transition-colors"
            >
              {note.title && (
                <p className="font-semibold text-sage-800 mb-1 text-sm">{note.title}</p>
              )}
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

function NoteModal({ note, currentUser, onClose, onSaved }) {
  const [title,   setTitle]   = useState(note?.title   ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [tagInput, setTagInput] = useState((note?.tags ?? []).join(', '))
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    try {
      if (note?.id) {
        await supabase.from('shared_notes').update({ title, content, tags }).eq('id', note.id)
      } else {
        await supabase.from('shared_notes').insert({
          title, content, tags, created_by: currentUser?.id,
        })
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-sage-100">
          <h3 className="font-display text-lg text-sage-800">{note ? 'Edit note' : 'New note'}</h3>
          <button onClick={onClose} className="text-sage-300 hover:text-sage-600 transition-colors">
            <X size={18} />
          </button>
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
