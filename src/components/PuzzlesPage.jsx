import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Trophy, Clock, Plus, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TheQuad from './games/TheQuad'
import MiniCrossword from './games/MiniCrossword'
import PuzzleSubmitForm from './PuzzleSubmitForm'

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function Leaderboard({ puzzleId }) {
  const [scores, setScores] = useState([])
  const channelRef = useRef(null)

  const fetchScores = useCallback(async () => {
    const { data } = await supabase
      .from('puzzle_scores')
      .select('*, profiles(name, avatar_url)')
      .eq('puzzle_id', puzzleId)
      .order('time_seconds', { ascending: true })
      .limit(10)
    setScores(data ?? [])
  }, [puzzleId])

  useEffect(() => {
    fetchScores()
    channelRef.current = supabase
      .channel(`puzzle-scores-${puzzleId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'puzzle_scores',
        filter: `puzzle_id=eq.${puzzleId}`,
      }, fetchScores)
      .subscribe()
    return () => { channelRef.current?.unsubscribe() }
  }, [puzzleId, fetchScores])

  if (scores.length === 0) return <p className="text-xs text-zinc-400 py-2">No scores yet — be the first!</p>

  return (
    <div className="space-y-1.5 mt-2">
      {scores.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2 text-xs">
          <span className="w-5 text-zinc-400 font-bold">{i + 1}.</span>
          <span className="flex-1 font-medium text-zinc-800 truncate">
            {s.profiles?.name ?? s.user_name ?? 'Anonymous'}
          </span>
          <span className="flex items-center gap-1 text-zinc-500 tabular-nums">
            <Clock size={10} /> {formatTime(s.time_seconds)}
          </span>
          {s.mistakes != null && (
            <span className={`font-semibold ${s.mistakes === 0 ? 'text-green-600' : 'text-zinc-400'}`}>
              {s.mistakes === 0 ? '✓' : `${s.mistakes}✗`}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function PuzzleCard({ puzzle, myScore, onPlay }) {
  const label = puzzle.type === 'quad' ? 'The Quad' : 'Mini Crossword'
  const emoji = puzzle.type === 'quad' ? '🟨' : '✏️'

  return (
    <div className="bg-white border-2 border-zinc-900 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1">
          <h3 className="font-black text-zinc-900 uppercase tracking-wider text-sm">{label}</h3>
          {myScore ? (
            <p className="text-xs text-green-600 font-medium">
              Completed — {formatTime(myScore.time_seconds)}
              {myScore.mistakes != null ? ` · ${myScore.mistakes} mistake${myScore.mistakes !== 1 ? 's' : ''}` : ''}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Not played yet</p>
          )}
        </div>
        <button
          onClick={onPlay}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 transition-colors"
        >
          {myScore ? 'Replay' : 'Play'}
        </button>
      </div>

      <div className="border-t border-zinc-100 pt-2">
        <div className="flex items-center gap-1 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
          <Trophy size={11} /> Leaderboard
        </div>
        <Leaderboard puzzleId={puzzle.id} />
      </div>
    </div>
  )
}

export default function PuzzlesPage() {
  const { currentUser } = useAuth()
  const [puzzles,     setPuzzles]     = useState([])
  const [myScores,    setMyScores]    = useState({})
  const [loading,     setLoading]     = useState(true)
  const [activeGame,  setActiveGame]  = useState(null) // { puzzle }
  const [showSubmit,  setShowSubmit]  = useState(false)

  const fetchPuzzles = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('puzzles')
      .select('*')
      .eq('active_date', today())
    setPuzzles(data ?? [])

    if (data?.length && currentUser?.id) {
      const ids = data.map(p => p.id)
      const { data: scores } = await supabase
        .from('puzzle_scores')
        .select('*')
        .in('puzzle_id', ids)
        .eq('user_id', currentUser.id)
      const map = {}
      scores?.forEach(s => { map[s.puzzle_id] = s })
      setMyScores(map)
    }
    setLoading(false)
  }, [currentUser?.id])

  useEffect(() => { fetchPuzzles() }, [fetchPuzzles])

  async function handleComplete(puzzle, value) {
    // value is mistakes (quad) or timeSeconds (crossword)
    const isQuad = puzzle.type === 'quad'
    const payload = {
      puzzle_id: puzzle.id,
      user_id: currentUser.id,
      user_name: currentUser.name ?? currentUser.email ?? '',
      time_seconds: isQuad ? 0 : value,
      mistakes: isQuad ? value : 0,
      completed_at: new Date().toISOString(),
    }
    await supabase.from('puzzle_scores').upsert(payload, { onConflict: 'puzzle_id,user_id' })
    await fetchPuzzles()
  }

  // ── Game view ──────────────────────────────────────────────────────────────
  if (activeGame) {
    const { puzzle } = activeGame
    return (
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <button
          onClick={() => setActiveGame(null)}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-5 transition-colors"
        >
          <ArrowLeft size={16} /> Back to puzzles
        </button>
        <h2 className="font-black text-2xl text-zinc-900 uppercase tracking-wider mb-1">
          {puzzle.type === 'quad' ? '🟨 The Quad' : '✏️ Mini Crossword'}
        </h2>
        <p className="text-xs text-zinc-400 mb-6">{today()}</p>

        {puzzle.type === 'quad' ? (
          <TheQuad
            puzzle={puzzle}
            onComplete={(mistakes) => handleComplete(puzzle, mistakes)}
          />
        ) : (
          <MiniCrossword
            puzzle={puzzle}
            onComplete={(secs) => handleComplete(puzzle, secs)}
          />
        )}
      </div>
    )
  }

  // ── Hub view ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-black text-2xl text-zinc-900 uppercase tracking-wider">🧩 Puzzles</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{today()}</p>
        </div>
        <button
          onClick={() => setShowSubmit(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-zinc-900 rounded-xl hover:bg-zinc-50 transition-colors"
        >
          <Plus size={13} /> Submit a Puzzle
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-300">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin mb-3" />
          <p className="text-sm">Loading today's puzzles…</p>
        </div>
      ) : puzzles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400 text-center">
          <p className="text-5xl mb-4">🧩</p>
          <p className="font-bold text-zinc-700 mb-1">No puzzles today</p>
          <p className="text-sm mb-5">Be the first to submit one!</p>
          <button
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 transition-colors"
          >
            <Plus size={15} /> Submit a Puzzle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-3xl">
          {puzzles.map(p => (
            <PuzzleCard
              key={p.id}
              puzzle={p}
              myScore={myScores[p.id]}
              onPlay={() => setActiveGame({ puzzle: p })}
            />
          ))}
        </div>
      )}

      {showSubmit && <PuzzleSubmitForm onClose={() => { setShowSubmit(false); fetchPuzzles() }} />}
    </div>
  )
}
