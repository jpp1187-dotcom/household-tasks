import React, { useState, useEffect, useMemo, useCallback } from 'react'

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function MiniCrossword({ puzzle, onComplete }) {
  const gridTemplate = useMemo(() => puzzle?.data?.grid ?? [], [puzzle])
  const solution     = useMemo(() => puzzle?.data?.solution ?? [], [puzzle])
  const clues        = useMemo(() => puzzle?.data?.clues ?? { across: [], down: [] }, [puzzle])

  // Init user grid from template ('#' stays '#', letters become '')
  const [userGrid,   setUserGrid]   = useState(() =>
    gridTemplate.map(row => row.map(cell => cell === '#' ? '#' : ''))
  )
  const [activeCell, setActiveCell] = useState(null)   // [r, c]
  const [direction,  setDirection]  = useState('across')
  const [seconds,    setSeconds]    = useState(0)
  const [started,    setStarted]    = useState(false)
  const [completed,  setCompleted]  = useState(false)

  // Timer
  useEffect(() => {
    if (!started || completed) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [started, completed])

  // Find first non-black cell on mount
  useEffect(() => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (gridTemplate[r]?.[c] !== '#') { setActiveCell([r, c]); return }
      }
    }
  }, [gridTemplate])

  // Cell numbering
  const cellNumbers = useMemo(() => {
    const nums = {}
    let n = 1
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (gridTemplate[r]?.[c] === '#') continue
        const startsAcross = (c === 0 || gridTemplate[r][c - 1] === '#') &&
          c + 1 < 5 && gridTemplate[r][c + 1] !== '#'
        const startsDown = (r === 0 || gridTemplate[r - 1]?.[c] === '#') &&
          r + 1 < 5 && gridTemplate[r + 1]?.[c] !== '#'
        if (startsAcross || startsDown) nums[`${r}-${c}`] = n++
      }
    }
    return nums
  }, [gridTemplate])

  // Active word cells
  const activeWordCells = useMemo(() => {
    if (!activeCell) return new Set()
    const [ar, ac] = activeCell
    const cells = new Set()
    if (direction === 'across') {
      let s = ac; while (s > 0 && gridTemplate[ar][s - 1] !== '#') s--
      let e = ac; while (e < 4 && gridTemplate[ar][e + 1] !== '#') e++
      for (let c = s; c <= e; c++) cells.add(`${ar}-${c}`)
    } else {
      let s = ar; while (s > 0 && gridTemplate[s - 1]?.[ac] !== '#') s--
      let e = ar; while (e < 4 && gridTemplate[e + 1]?.[ac] !== '#') e++
      for (let r = s; r <= e; r++) cells.add(`${r}-${ac}`)
    }
    return cells
  }, [activeCell, direction, gridTemplate])

  // Validation
  useEffect(() => {
    if (completed) return
    // Check all white cells filled
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (gridTemplate[r]?.[c] !== '#' && userGrid[r]?.[c] === '') return
      }
    }
    // Compare to solution
    let correct = true
    outer: for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (gridTemplate[r]?.[c] !== '#' && userGrid[r]?.[c] !== solution[r]?.[c]) {
          correct = false; break outer
        }
      }
    }
    if (correct) { setCompleted(true); onComplete?.(seconds) }
  }, [userGrid]) // eslint-disable-line

  // Move helpers
  const advanceCursor = useCallback((r, c, dir) => {
    if (dir === 'across') {
      for (let nc = c + 1; nc < 5; nc++) {
        if (gridTemplate[r][nc] !== '#') { setActiveCell([r, nc]); return }
      }
    } else {
      for (let nr = r + 1; nr < 5; nr++) {
        if (gridTemplate[nr]?.[c] !== '#') { setActiveCell([nr, c]); return }
      }
    }
  }, [gridTemplate])

  const retreatCursor = useCallback((r, c, dir) => {
    if (dir === 'across') {
      for (let nc = c - 1; nc >= 0; nc--) {
        if (gridTemplate[r][nc] !== '#') { setActiveCell([r, nc]); return nc }
      }
    } else {
      for (let nr = r - 1; nr >= 0; nr--) {
        if (gridTemplate[nr]?.[c] !== '#') { setActiveCell([nr, c]); return nr }
      }
    }
    return null
  }, [gridTemplate])

  // Keyboard
  useEffect(() => {
    function onKey(e) {
      if (!activeCell || completed) return
      const [r, c] = activeCell

      if (e.key === 'ArrowRight')  { setDirection('across'); for (let nc = c+1; nc < 5; nc++) { if (gridTemplate[r][nc] !== '#') { setActiveCell([r, nc]); break } }; e.preventDefault(); return }
      if (e.key === 'ArrowLeft')   { setDirection('across'); for (let nc = c-1; nc >= 0; nc--) { if (gridTemplate[r][nc] !== '#') { setActiveCell([r, nc]); break } }; e.preventDefault(); return }
      if (e.key === 'ArrowDown')   { setDirection('down');   for (let nr = r+1; nr < 5; nr++) { if (gridTemplate[nr]?.[c] !== '#') { setActiveCell([nr, c]); break } }; e.preventDefault(); return }
      if (e.key === 'ArrowUp')     { setDirection('down');   for (let nr = r-1; nr >= 0; nr--) { if (gridTemplate[nr]?.[c] !== '#') { setActiveCell([nr, c]); break } }; e.preventDefault(); return }

      if (e.key === 'Backspace') {
        e.preventDefault()
        setUserGrid(prev => {
          const next = prev.map(row => [...row])
          if (next[r][c] !== '') { next[r][c] = ''; return next }
          // retreat
          if (direction === 'across') {
            for (let nc = c - 1; nc >= 0; nc--) {
              if (gridTemplate[r][nc] !== '#') { setActiveCell([r, nc]); next[r][nc] = ''; break }
            }
          } else {
            for (let nr = r - 1; nr >= 0; nr--) {
              if (gridTemplate[nr]?.[c] !== '#') { setActiveCell([nr, c]); next[nr][c] = ''; break }
            }
          }
          return next
        })
        return
      }

      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault()
        if (!started) setStarted(true)
        const letter = e.key.toUpperCase()
        setUserGrid(prev => {
          const next = prev.map(row => [...row])
          next[r][c] = letter
          return next
        })
        advanceCursor(r, c, direction)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeCell, direction, started, completed, gridTemplate, advanceCursor])

  function handleCellClick(r, c) {
    if (gridTemplate[r]?.[c] === '#') return
    if (activeCell && activeCell[0] === r && activeCell[1] === c) {
      // Toggle direction
      setDirection(d => d === 'across' ? 'down' : 'across')
    } else {
      setActiveCell([r, c])
    }
  }

  function focusClue(clue, dir) {
    // Find the cell with that clue number
    const target = parseInt(clue.number)
    for (const [key, num] of Object.entries(cellNumbers)) {
      if (num === target) {
        const [r, c] = key.split('-').map(Number)
        setActiveCell([r, c])
        setDirection(dir)
        return
      }
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full">
      {/* Grid */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        {/* Timer */}
        <div className="self-end font-mono text-lg font-black text-zinc-900 tabular-nums">
          {completed ? '✓ ' : ''}{formatTime(seconds)}
        </div>

        <div className="grid grid-cols-5 gap-0 border-2 border-zinc-900 rounded">
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 5 }, (__, c) => {
              const isBlack  = gridTemplate[r]?.[c] === '#'
              const isActive = activeCell?.[0] === r && activeCell?.[1] === c
              const inWord   = activeWordCells.has(`${r}-${c}`)
              const num      = cellNumbers[`${r}-${c}`]
              const letter   = userGrid[r]?.[c] ?? ''
              const correct  = completed && letter === solution[r]?.[c]

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`w-10 h-10 border border-zinc-400 relative flex items-center justify-center select-none
                    ${isBlack  ? 'bg-zinc-900 cursor-default' : 'cursor-pointer'}
                    ${isActive && !isBlack ? 'bg-green-200' : ''}
                    ${inWord && !isActive && !isBlack ? 'bg-green-50' : ''}
                    ${completed && !isBlack ? 'bg-emerald-100' : ''}
                  `}
                >
                  {!isBlack && (
                    <>
                      {num && (
                        <span className="absolute top-0.5 left-0.5 text-xs font-bold text-green-700 leading-none">
                          {num}
                        </span>
                      )}
                      <span className="text-lg font-black text-zinc-900">{letter}</span>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>

        {completed && (
          <div className="text-center">
            <p className="text-2xl">🎉</p>
            <p className="font-black text-zinc-900 text-sm">Solved in {formatTime(seconds)}!</p>
          </div>
        )}
      </div>

      {/* Clues */}
      <div className="flex-1 grid grid-cols-2 gap-4 text-sm min-w-0">
        <div>
          <h4 className="font-black uppercase tracking-wider text-zinc-900 text-xs mb-2 border-b-2 border-zinc-900 pb-1">Across</h4>
          <ul className="space-y-1">
            {(clues.across ?? []).map(clue => (
              <li key={clue.number}>
                <button
                  onClick={() => focusClue(clue, 'across')}
                  className="text-left text-xs hover:text-green-700 transition-colors w-full"
                >
                  <span className="font-bold">{clue.number}.</span> {clue.clue}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-black uppercase tracking-wider text-zinc-900 text-xs mb-2 border-b-2 border-zinc-900 pb-1">Down</h4>
          <ul className="space-y-1">
            {(clues.down ?? []).map(clue => (
              <li key={clue.number}>
                <button
                  onClick={() => focusClue(clue, 'down')}
                  className="text-left text-xs hover:text-green-700 transition-colors w-full"
                >
                  <span className="font-bold">{clue.number}.</span> {clue.clue}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
