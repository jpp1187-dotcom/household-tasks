import React, { useState, useEffect } from 'react'
import { X, Loader, Sparkles, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { GoogleGenAI } from '@google/genai'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const COLORS = ['yellow', 'green', 'blue', 'purple']
const COLOR_BG = { yellow: 'bg-amber-300', green: 'bg-green-400', blue: 'bg-blue-300', purple: 'bg-purple-300' }
const COLOR_BORDER = { yellow: 'border-amber-400', green: 'border-green-500', blue: 'border-blue-400', purple: 'border-purple-400' }

async function getNextDate(type) {
  const { data } = await supabase
    .from('puzzles')
    .select('active_date')
    .eq('type', type)
    .order('active_date', { ascending: false })
    .limit(1)
  const last = data?.[0]?.active_date ? new Date(data[0].active_date) : new Date()
  last.setDate(last.getDate() + 1)
  return last.toISOString().split('T')[0]
}

// ── Step 1: Choose type ────────────────────────────────────────────────────────
function StepChoose({ onChoose }) {
  return (
    <div>
      <h3 className="font-display text-lg text-zinc-900 mb-1">Submit a Puzzle</h3>
      <p className="text-xs text-zinc-500 mb-5">Choose which type to create</p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { type: 'quad', emoji: '🟨', label: 'The Quad', desc: '4 categories × 4 words' },
          { type: 'crossword', emoji: '✏️', label: 'Mini Crossword', desc: '5×5 grid with clues' },
        ].map(opt => (
          <button
            key={opt.type}
            onClick={() => onChoose(opt.type)}
            className="flex flex-col items-center gap-2 p-5 border-2 border-zinc-900 rounded-xl hover:bg-zinc-50 transition-colors"
          >
            <span className="text-4xl">{opt.emoji}</span>
            <span className="font-bold text-sm text-zinc-900">{opt.label}</span>
            <span className="text-xs text-zinc-500">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 2a: Quad builder ──────────────────────────────────────────────────────
function StepQuad({ onBack, onDone }) {
  const [cats, setCats] = useState(
    COLORS.map(color => ({ name: '', color, words: ['', '', '', ''] }))
  )

  function setName(i, val) {
    setCats(prev => prev.map((c, idx) => idx === i ? { ...c, name: val } : c))
  }
  function setColor(i, color) {
    setCats(prev => prev.map((c, idx) => idx === i ? { ...c, color } : c))
  }
  function setWord(catIdx, wordIdx, val) {
    setCats(prev => prev.map((c, idx) => {
      if (idx !== catIdx) return c
      const words = [...c.words]
      words[wordIdx] = val
      return { ...c, words }
    }))
  }

  const valid = cats.every(c => c.name.trim() && c.words.every(w => w.trim()))

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 mb-4">
        <ChevronLeft size={14} /> Back
      </button>
      <h3 className="font-display text-lg text-zinc-900 mb-4">Build The Quad</h3>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
        {cats.map((cat, i) => (
          <div key={i} className={`border-2 ${COLOR_BORDER[cat.color]} rounded-xl p-3`}>
            <div className="flex items-center gap-2 mb-2">
              <input
                value={cat.name}
                onChange={e => setName(i, e.target.value)}
                placeholder="Category name…"
                className="flex-1 border border-zinc-200 rounded-lg px-2 py-1.5 text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
              {/* Color selector */}
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(i, c)}
                    className={`w-5 h-5 rounded-full ${COLOR_BG[c]} border-2 transition-all ${cat.color === c ? 'border-zinc-900 scale-110' : 'border-transparent'}`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {cat.words.map((w, wi) => (
                <input
                  key={wi}
                  value={w}
                  onChange={e => setWord(i, wi, e.target.value)}
                  placeholder={`Word ${wi + 1}`}
                  className="border border-zinc-200 rounded-lg px-2 py-1.5 text-xs uppercase font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Preview</p>
        <div className="grid grid-cols-4 gap-1">
          {cats.flatMap(cat =>
            cat.words.map((w, wi) => (
              <div
                key={`${cat.name}-${wi}`}
                className={`${COLOR_BG[cat.color]} border-2 border-zinc-900 rounded px-1 py-1.5 text-center text-xs font-bold uppercase truncate`}
              >
                {w || '…'}
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => onDone({ categories: cats.map(c => ({ ...c, words: c.words.map(w => w.trim().toUpperCase()) })) })}
        disabled={!valid}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next <ChevronRight size={15} />
      </button>
    </div>
  )
}

// ── Step 2b: Crossword builder ─────────────────────────────────────────────────
function StepCrossword({ onBack, onDone }) {
  const [theme,     setTheme]     = useState('')
  const [wordList,  setWordList]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [generated, setGenerated] = useState(null)
  const [error,     setError]     = useState('')

  async function generate() {
    if (!theme.trim()) return
    setLoading(true)
    setError('')
    setGenerated(null)
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })
      const wordHint = wordList.trim() ? `\nTry to use these words if possible: ${wordList}` : ''
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Create a valid 5x5 mini crossword puzzle with theme "${theme}".${wordHint}
Return ONLY a JSON object, no markdown, no explanation:
{
  "grid": [["A","B","C","D","E"],["F","#","G","#","H"],...5 rows of 5],
  "solution": [same 5x5 array with all answers],
  "clues": {
    "across": [{"number":1,"clue":"hint (length)"},...],
    "down": [{"number":1,"clue":"hint (length)"},...]
  }
}
Rules: use # for black squares, no isolated letters, grid must be symmetric.`,
      })
      const text = (response.text ?? '').replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(text)
      setGenerated(parsed)
    } catch (err) {
      setError('Generation failed: ' + (err.message ?? 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 mb-4">
        <ChevronLeft size={14} /> Back
      </button>
      <h3 className="font-display text-lg text-zinc-900 mb-4">Build Mini Crossword</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1">Theme</label>
          <input
            value={theme}
            onChange={e => setTheme(e.target.value)}
            placeholder="e.g. Kitchen items, 90s movies…"
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1">Word list (optional)</label>
          <input
            value={wordList}
            onChange={e => setWordList(e.target.value)}
            placeholder="APPLE, GRAPE, LEMON…"
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
        <button
          onClick={generate}
          disabled={!theme.trim() || loading}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold border-2 border-zinc-900 rounded-xl hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? 'Generating…' : '✨ Generate with AI'}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Generated preview */}
      {generated && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Generated Grid</p>
          <div className="grid grid-cols-5 gap-0 border-2 border-zinc-900 rounded w-fit mx-auto mb-3">
            {generated.grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`w-8 h-8 border border-zinc-400 flex items-center justify-center text-xs font-bold
                    ${cell === '#' ? 'bg-zinc-900 text-zinc-900' : 'bg-white text-zinc-900'}`}
                >
                  {cell !== '#' ? cell : ''}
                </div>
              ))
            )}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {['across', 'down'].map(dir => (
              <div key={dir}>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">{dir}</p>
                {(generated.clues[dir] ?? []).map(clue => (
                  <div key={clue.number} className="flex gap-1 text-xs">
                    <span className="font-bold w-5 shrink-0">{clue.number}.</span>
                    <input
                      value={clue.clue}
                      onChange={e => {
                        setGenerated(prev => ({
                          ...prev,
                          clues: {
                            ...prev.clues,
                            [dir]: prev.clues[dir].map(c =>
                              c.number === clue.number ? { ...c, clue: e.target.value } : c
                            )
                          }
                        }))
                      }}
                      className="flex-1 border-b border-zinc-200 focus:outline-none focus:border-zinc-500 text-xs"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={() => onDone(generated)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Step 3: Confirm ────────────────────────────────────────────────────────────
function StepConfirm({ type, data, onBack, onSave, saving }) {
  const [nextDate, setNextDate] = useState('')

  useEffect(() => {
    getNextDate(type).then(setNextDate)
  }, [type])

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 mb-4">
        <ChevronLeft size={14} /> Back
      </button>
      <h3 className="font-display text-lg text-zinc-900 mb-1">Confirm Submission</h3>
      <p className="text-xs text-zinc-500 mb-5">
        Type: <span className="font-bold">{type === 'quad' ? 'The Quad' : 'Mini Crossword'}</span>
      </p>
      <div className="bg-zinc-50 border-2 border-zinc-900 rounded-xl p-4 mb-5">
        <p className="text-xs text-zinc-500 mb-1">Active date</p>
        <p className="text-xl font-black text-zinc-900">{nextDate || '…'}</p>
        <p className="text-xs text-zinc-400 mt-1">Next available slot</p>
      </div>
      <button
        onClick={() => onSave(nextDate)}
        disabled={saving || !nextDate}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
        {saving ? 'Saving…' : 'Submit Puzzle'}
      </button>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function PuzzleSubmitForm({ onClose }) {
  const { currentUser } = useAuth()
  const [step,       setStep]       = useState(1)   // 1 | 2 | 3
  const [type,       setType]       = useState(null) // 'quad' | 'crossword'
  const [puzzleData, setPuzzleData] = useState(null)
  const [saving,     setSaving]     = useState(false)

  function handleChoose(t) { setType(t); setStep(2) }

  function handleDone(data) { setPuzzleData(data); setStep(3) }

  async function handleSave(activeDate) {
    setSaving(true)
    const { error } = await supabase.from('puzzles').insert({
      type,
      data: puzzleData,
      active_date: activeDate,
      submitted_by: currentUser.id,
    })
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <X size={18} />
        </button>

        {step === 1 && <StepChoose onChoose={handleChoose} />}
        {step === 2 && type === 'quad'      && <StepQuad      onBack={() => setStep(1)} onDone={handleDone} />}
        {step === 2 && type === 'crossword' && <StepCrossword onBack={() => setStep(1)} onDone={handleDone} />}
        {step === 3 && (
          <StepConfirm
            type={type}
            data={puzzleData}
            onBack={() => setStep(2)}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}
