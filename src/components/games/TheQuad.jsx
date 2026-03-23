import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shuffle, Send } from 'lucide-react'

const CATEGORY_COLORS = {
  yellow: 'bg-amber-300',
  green:  'bg-green-400',
  blue:   'bg-blue-300',
  purple: 'bg-purple-300',
}

const COLOR_EMOJI = { yellow: '🟨', green: '🟩', blue: '🟦', purple: '🟪' }

function fisherYates(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TheQuad({ puzzle, onComplete }) {
  const categories = useMemo(() => puzzle?.data?.categories ?? [], [puzzle])

  const [tiles,    setTiles]    = useState([])
  const [selected, setSelected] = useState([])
  const [solved,   setSolved]   = useState([])
  const [mistakes, setMistakes] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won,      setWon]      = useState(false)
  const [shaking,  setShaking]  = useState(false)
  const [oneAway,  setOneAway]  = useState(false)
  const [copied,   setCopied]   = useState(false)

  useEffect(() => {
    const all = categories.flatMap(cat =>
      (cat.words ?? []).map(w => ({ word: w, color: cat.color, catName: cat.name }))
    )
    setTiles(fisherYates(all))
  }, [categories])

  function toggleTile(tile) {
    if (gameOver) return
    if (solved.some(s => s.name === tile.catName)) return
    setOneAway(false)
    setSelected(prev => {
      const has = prev.some(t => t.word === tile.word)
      if (has) return prev.filter(t => t.word !== tile.word)
      if (prev.length >= 4) return prev
      return [...prev, tile]
    })
  }

  function handleSubmit() {
    if (selected.length !== 4) return
    const cats = selected.map(t => t.catName)
    const allSame = cats.every(c => c === cats[0])
    if (allSame) {
      const solvedCat = categories.find(c => c.name === cats[0])
      const newSolved = [...solved, solvedCat]
      setSolved(newSolved)
      setSelected([])
      if (newSolved.length === 4) {
        setWon(true)
        setGameOver(true)
        onComplete?.(mistakes)
      }
    } else {
      const counts = {}
      cats.forEach(c => { counts[c] = (counts[c] || 0) + 1 })
      if (Math.max(...Object.values(counts)) === 3) setOneAway(true)
      const next = mistakes + 1
      setMistakes(next)
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
      if (next >= 4) { setGameOver(true); onComplete?.(4) }
    }
  }

  function copyShare() {
    const rows = solved.map(cat => Array(4).fill(COLOR_EMOJI[cat.color]).join('')).join('\n')
    navigator.clipboard.writeText(`The Quad 🧩\n${rows}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const solvedNames = new Set(solved.map(s => s.name))
  const unsolvedTiles = tiles.filter(t => !solvedNames.has(t.catName))

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto py-2">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        Create four groups of four!
      </p>

      {/* Solved rows */}
      <div className="w-full space-y-2">
        <AnimatePresence>
          {solved.map(cat => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${CATEGORY_COLORS[cat.color] ?? 'bg-zinc-200'} border-2 border-zinc-900 rounded-lg px-4 py-3 text-center`}
            >
              <p className="text-xs font-black uppercase tracking-wider text-zinc-900">{cat.name}</p>
              <p className="text-xs text-zinc-700 mt-0.5">{(cat.words ?? []).join(', ')}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 4×4 grid */}
      {!gameOver && (
        <motion.div
          className="grid grid-cols-4 gap-1.5 w-full"
          animate={shaking ? { x: [-4, 4, -4, 4, 0] } : {}}
          transition={{ duration: 0.3 }}
        >
          {unsolvedTiles.map(tile => {
            const sel = selected.some(s => s.word === tile.word)
            return (
              <motion.button
                key={tile.word}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleTile(tile)}
                className={`border-2 border-zinc-900 rounded-lg p-3 text-center text-xs font-bold uppercase tracking-wider select-none transition-colors
                  ${sel ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900 hover:bg-zinc-100'}`}
              >
                {tile.word}
              </motion.button>
            )
          })}
        </motion.div>
      )}

      {oneAway && <p className="text-xs font-bold text-amber-600 animate-pulse">One away!</p>}

      {/* Mistake circles */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-500 mr-1">Mistakes:</span>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-zinc-900 transition-colors ${i < mistakes ? 'bg-zinc-900' : 'bg-white'}`}
          />
        ))}
      </div>

      {/* Action buttons */}
      {!gameOver && (
        <div className="flex gap-3">
          <button
            onClick={() => setTiles(prev => fisherYates([...prev]))}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <Shuffle size={13} /> Shuffle
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.length !== 4}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={13} /> Submit
          </button>
        </div>
      )}

      {/* End state */}
      {gameOver && (
        <div className="text-center space-y-3 w-full">
          {won ? (
            <>
              <p className="text-3xl">🎉</p>
              <p className="font-black text-zinc-900 uppercase tracking-wider">
                Solved with {mistakes} mistake{mistakes !== 1 ? 's' : ''}!
              </p>
              <div className="font-mono text-2xl leading-snug">
                {solved.map(cat => (
                  <div key={cat.name}>{Array(4).fill(COLOR_EMOJI[cat.color]).join('')}</div>
                ))}
              </div>
              <button
                onClick={copyShare}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors"
              >
                {copied ? '✓ Copied!' : '📋 Copy Results'}
              </button>
            </>
          ) : (
            <>
              <p className="text-3xl">😞</p>
              <p className="font-black text-zinc-900 uppercase tracking-wider">Better luck tomorrow!</p>
              <div className="space-y-1.5 mt-2">
                {categories.map(cat => (
                  <div key={cat.name} className={`${CATEGORY_COLORS[cat.color] ?? 'bg-zinc-200'} border-2 border-zinc-900 rounded-lg px-3 py-2 text-xs`}>
                    <span className="font-black uppercase">{cat.name}:</span>{' '}
                    {(cat.words ?? []).join(', ')}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
