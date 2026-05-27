'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { supabase } from '@/lib/supabase'
import { EVENTS, type AnswerPayload, type QuestionStartPayload } from '@/lib/events'
import { TYPE_LABELS, type Question } from '@/lib/questions'
import { HostWordCloud } from '@/components/host/HostWordCloud'
import { HostTokenAllocation } from '@/components/host/HostTokenAllocation'
import { HostPictionary } from '@/components/host/HostPictionary'
import { HostCoordPlot } from '@/components/host/HostCoordPlot'
import { HostRanking } from '@/components/host/HostRanking'
import { HostReact } from '@/components/host/HostReact'
import { HostMultipleChoice } from '@/components/host/HostMultipleChoice'

type Participant = { name: string; presence_ref: string }
type Drawing = { name: string; url: string }
type Phase = 'lobby' | 'active' | 'ended'

export default function HostPage() {
  const { code } = useParams<{ code: string }>()
  const [joinUrl, setJoinUrl] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [phase, setPhase] = useState<Phase>('lobby')
  const [currentIndex, setCurrentIndex] = useState(0)

  // Per-question answer storage — keyed by question index
  const [allWordCloudWords, setAllWordCloudWords] = useState<Record<number, string[]>>({})
  const [allTokenTotals, setAllTokenTotals] = useState<Record<number, Record<string, number>>>({})
  const [allPictionaryDrawings, setAllPictionaryDrawings] = useState<Record<number, Drawing[]>>({})
  const [allCoordPoints, setAllCoordPoints] = useState<Record<number, Array<{ x: number; y: number; name: string }>>>({})
  const [allRankingScores, setAllRankingScores] = useState<Record<number, Record<string, number>>>({})
  // allReactionCounts[qIdx][item][emoji] = count
  const [allReactionCounts, setAllReactionCounts] = useState<Record<number, Record<string, Record<string, number>>>>({})
  // allMcVotes[qIdx][option] = count
  const [allMcVotes, setAllMcVotes] = useState<Record<number, Record<string, number>>>({})

  // Per-question comparison choice — maps questionIndex → comparisonQuestionIndex | null
  // undefined means "never opened compare panel for this question" (treated as no comparison)
  const [comparisonChoices, setComparisonChoices] = useState<Record<number, number | null>>({})
  const [compareOpen, setCompareOpen] = useState(false)

  const gameChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const currentPayloadRef = useRef<QuestionStartPayload | null>(null)
  // Ref so the broadcast answer handler can always read the latest index without stale closure
  const currentIndexRef = useRef(0)

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join/${code}`)
  }, [code])

  // Load questions — sessionStorage first (same tab, instant), DB fallback (new tab / reopened)
  useEffect(() => {
    const stored = sessionStorage.getItem(`session_${code}`)
    if (stored) {
      setQuestions(JSON.parse(stored))
      return
    }
    supabase
      .from('sessions')
      .select('questions')
      .eq('code', code)
      .single()
      .then(({ data }) => {
        if (data?.questions) setQuestions(data.questions)
      })
  }, [code])

  // Presence channel — participant list + late-joiner re-broadcast
  useEffect(() => {
    const channel = supabase.channel(`room:${code}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ name: string }>()
        const all = Object.values(state).flat().map((p) => ({ name: p.name, presence_ref: p.presence_ref }))
        setParticipants(all)
      })
      .on('presence', { event: 'join' }, async () => {
        if (currentPayloadRef.current) {
          console.log('[host] late joiner — re-broadcasting current question')
          await gameChannelRef.current?.send({
            type: 'broadcast',
            event: EVENTS.QUESTION_START,
            payload: currentPayloadRef.current,
          })
        }
      })
      .subscribe((status) => console.log('[host] presence channel:', status))

    return () => { supabase.removeChannel(channel) }
  }, [code])

  // Game channel — receives all answer types
  useEffect(() => {
    const channel = supabase.channel(`game:${code}`)
      .on('broadcast', { event: EVENTS.ANSWER_SUBMIT }, ({ payload }: { payload: AnswerPayload }) => {
        console.log('[host] answer:submit', payload)
        const idx = currentIndexRef.current
        if (payload.type === 'word_cloud') {
          setAllWordCloudWords((prev) => ({
            ...prev,
            [idx]: [...(prev[idx] ?? []), payload.word],
          }))
        } else if (payload.type === 'token_allocation') {
          setAllTokenTotals((prev) => {
            const prevBuckets = prev[idx] ?? {}
            const next = { ...prevBuckets }
            for (const [bucket, amount] of Object.entries(payload.allocations)) {
              next[bucket] = (next[bucket] ?? 0) + amount
            }
            return { ...prev, [idx]: next }
          })
        } else if (payload.type === 'pictionary') {
          setAllPictionaryDrawings((prev) => ({
            ...prev,
            [idx]: [...(prev[idx] ?? []), { name: payload.participantName, url: payload.imageDataUrl }],
          }))
        } else if (payload.type === 'coord_plot') {
          setAllCoordPoints((prev) => ({
            ...prev,
            [idx]: [...(prev[idx] ?? []), { x: payload.x, y: payload.y, name: payload.participantName }],
          }))
        } else if (payload.type === 'ranking') {
          setAllRankingScores((prev) => {
            const prevScores = prev[idx] ?? {}
            const next = { ...prevScores }
            const n = payload.orderedOptions.length
            payload.orderedOptions.forEach((opt, i) => {
              next[opt] = (next[opt] ?? 0) + (n - i)
            })
            return { ...prev, [idx]: next }
          })
        } else if (payload.type === 'multiple_choice') {
          setAllMcVotes((prev) => {
            const prevVotes = prev[idx] ?? {}
            return { ...prev, [idx]: { ...prevVotes, [payload.option]: (prevVotes[payload.option] ?? 0) + 1 } }
          })
        } else if (payload.type === 'react') {
          setAllReactionCounts((prev) => {
            const prevCounts = prev[idx] ?? {}
            const next: Record<string, Record<string, number>> = {}
            for (const [item, emojiMap] of Object.entries(prevCounts)) {
              next[item] = { ...emojiMap }
            }
            for (const { item, emoji } of payload.reactions) {
              if (!next[item]) next[item] = {}
              next[item][emoji] = (next[item][emoji] ?? 0) + 1
            }
            return { ...prev, [idx]: next }
          })
        }
      })
      .subscribe((status) => console.log('[host] game channel:', status))

    gameChannelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [code])

  function buildPayload(index: number, qs: Question[]): QuestionStartPayload {
    return { ...qs[index], questionIndex: index, totalQuestions: qs.length } as QuestionStartPayload
  }

  async function startSession() {
    const payload = buildPayload(0, questions)
    console.log('[host] session start — question:start', payload)
    await gameChannelRef.current?.send({ type: 'broadcast', event: EVENTS.QUESTION_START, payload })
    currentPayloadRef.current = payload
    currentIndexRef.current = 0
    setCurrentIndex(0)
    setCompareOpen(false)
    setPhase('active')
  }

  async function resetSession() {
    // Wipe all responses
    setAllWordCloudWords({})
    setAllTokenTotals({})
    setAllPictionaryDrawings({})
    setAllCoordPoints({})
    setAllRankingScores({})
    setAllReactionCounts({})
    setAllMcVotes({})
    setComparisonChoices({})
    setCompareOpen(false)
    // Re-broadcast question 1 to participants
    const payload = buildPayload(0, questions)
    await gameChannelRef.current?.send({ type: 'broadcast', event: EVENTS.QUESTION_START, payload })
    currentPayloadRef.current = payload
    currentIndexRef.current = 0
    setCurrentIndex(0)
    setPhase('active')
  }

  async function goToIndex(newIndex: number) {
    if (newIndex < 0 || newIndex >= questions.length) return
    const payload = buildPayload(newIndex, questions)
    console.log('[host] question:start', payload)
    await gameChannelRef.current?.send({ type: 'broadcast', event: EVENTS.QUESTION_START, payload })
    currentPayloadRef.current = payload
    currentIndexRef.current = newIndex
    setCurrentIndex(newIndex)
    // Reset compare panel for this question index (undefined = no comparison yet)
    // We do NOT reset comparisonChoices — they are preserved per-index
    setCompareOpen(false)
  }

  async function advance() {
    const nextIndex = currentIndex + 1
    if (nextIndex >= questions.length) {
      console.log('[host] session:end')
      await gameChannelRef.current?.send({ type: 'broadcast', event: EVENTS.SESSION_END, payload: {} })
      currentPayloadRef.current = null
      setPhase('ended')
      return
    }
    await goToIndex(nextIndex)
  }

  async function previous() {
    if (currentIndex === 0) return
    await goToIndex(currentIndex - 1)
  }

  // Comparison helpers
  const comparisonIndex = comparisonChoices[currentIndex] ?? null

  function openCompare() {
    setCompareOpen(true)
    // Auto-select the nearest other question if none chosen yet
    if (comparisonChoices[currentIndex] === undefined) {
      const auto = currentIndex > 0 ? currentIndex - 1 : 1
      setComparisonChoices((prev) => ({ ...prev, [currentIndex]: auto }))
    }
  }

  function closeCompare() {
    setCompareOpen(false)
  }

  function selectComparison(idx: number) {
    setComparisonChoices((prev) => ({ ...prev, [currentIndex]: idx }))
  }

  // Render a result panel for a given question index (used for both top and bottom halves)
  function renderResults(qIdx: number) {
    const q = questions[qIdx] as Question | undefined
    if (!q) return null
    if (q.type === 'word_cloud') {
      return <HostWordCloud prompt={q.prompt} words={allWordCloudWords[qIdx] ?? []} />
    }
    if (q.type === 'token_allocation') {
      return (
        <HostTokenAllocation
          prompt={q.prompt}
          buckets={q.buckets}
          totals={allTokenTotals[qIdx] ?? {}}
          participantCount={participants.length}
        />
      )
    }
    if (q.type === 'pictionary') {
      return <HostPictionary prompt={q.prompt} drawings={allPictionaryDrawings[qIdx] ?? []} />
    }
    if (q.type === 'coord_plot') {
      return (
        <HostCoordPlot
          prompt={q.prompt}
          xLow={q.xLow}
          xHigh={q.xHigh}
          yLow={q.yLow}
          yHigh={q.yHigh}
          points={allCoordPoints[qIdx] ?? []}
        />
      )
    }
    if (q.type === 'ranking') {
      return <HostRanking prompt={q.prompt} options={q.options} scores={allRankingScores[qIdx] ?? {}} />
    }
    if (q.type === 'react') {
      return <HostReact prompt={q.prompt} items={q.items} counts={allReactionCounts[qIdx] ?? {}} />
    }
    if (q.type === 'multiple_choice') {
      return <HostMultipleChoice prompt={q.prompt} options={q.options} votes={allMcVotes[qIdx] ?? {}} />
    }
    return null
  }

  const currentQuestion = questions[currentIndex] as Question | undefined
  const isLastQuestion = currentIndex === questions.length - 1

  // ── LOBBY PHASE ──────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <main className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          <div className="text-center">
            <h1 className="text-3xl font-black text-[#FFE600]">Event Lobby</h1>
            <p className="text-zinc-500 font-mono tracking-widest mt-1 text-sm">{code}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center gap-4">
              <p className="text-white font-bold text-lg">Scan to Join</p>
              {joinUrl && (
                <div className="bg-white p-3 rounded-xl">
                  <QRCode value={joinUrl} size={200} />
                </div>
              )}
              <p className="text-zinc-500 text-xs break-all text-center">{joinUrl}</p>
            </div>

            {/* Participants */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-white font-bold text-lg">Participants</p>
                <span className="bg-zinc-800 text-[#FFE600] font-bold text-sm px-3 py-1 rounded-full">
                  {participants.length}
                </span>
              </div>
              {participants.length === 0 ? (
                <p className="text-zinc-500 text-center py-6">Waiting for participants...</p>
              ) : (
                <ul className="space-y-2 overflow-y-auto max-h-48">
                  {participants.map((p) => (
                    <li key={p.presence_ref} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                      <span className="w-2 h-2 bg-[#FFE600] rounded-full shrink-0" />
                      <span className="text-white text-sm">{p.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Question preview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3">
            <p className="text-zinc-500 text-xs uppercase tracking-widest">
              {questions.length} question{questions.length !== 1 ? 's' : ''} queued
            </p>
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-center gap-3 text-sm">
                <span className="text-[#FFE600] font-bold w-5 shrink-0">{i + 1}</span>
                <span className="text-zinc-500 shrink-0">{TYPE_LABELS[q.type]}</span>
                <span className="text-white">— {q.prompt}</span>
              </div>
            ))}
          </div>

          <button
            onClick={startSession}
            disabled={participants.length === 0 || questions.length === 0}
            className="w-full bg-[#FFE600] text-zinc-900 font-black text-xl rounded-2xl py-4 hover:bg-[#FFD900] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {participants.length === 0 ? 'Waiting for participants...' : 'Start Session →'}
          </button>

        </div>
      </main>
    )
  }

  // ── ENDED PHASE ──────────────────────────────────────────────────────────────
  if (phase === 'ended') {
    return (
      <main className="min-h-screen bg-zinc-950 p-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">

          {/* Screen header — hidden when printing */}
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h1 className="text-3xl font-black text-[#FFE600]">Session Complete 🎉</h1>
              <p className="text-zinc-400 mt-1">
                {participants.length} participant{participants.length !== 1 ? 's' : ''} ·{' '}
                {questions.length} question{questions.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  const payload = buildPayload(currentIndex, questions)
                  await gameChannelRef.current?.send({ type: 'broadcast', event: EVENTS.QUESTION_START, payload })
                  currentPayloadRef.current = payload
                  setPhase('active')
                }}
                className="bg-zinc-800 text-white font-bold px-5 py-3 rounded-xl hover:bg-zinc-700 transition-colors border border-zinc-700"
              >
                ← Back to Questions
              </button>
              <button
                onClick={resetSession}
                className="bg-zinc-800 text-red-400 font-bold px-5 py-3 rounded-xl hover:bg-zinc-700 transition-colors border border-zinc-700"
              >
                Reset Session
              </button>
              <button
                onClick={() => window.print()}
                className="bg-[#FFE600] text-zinc-900 font-black px-6 py-3 rounded-xl hover:bg-[#FFD900] transition-colors text-lg"
              >
                Save as PDF ↓
              </button>
            </div>
          </div>

          {/* Print-only header */}
          <div className="hidden print:block">
            <h1 className="text-3xl font-black text-[#FFE600]">Session Summary</h1>
            <p className="text-zinc-400 mt-1">
              Code: {code} · {participants.length} participants · {questions.length} questions
            </p>
          </div>

          {/* One card per question */}
          {questions.map((q, i) => (
            <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 break-inside-avoid">
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-4">
                Q{i + 1} · {TYPE_LABELS[q.type]}
              </p>
              {renderResults(i)}
            </div>
          ))}

        </div>
      </main>
    )
  }

  // ── ACTIVE PHASE ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-zinc-950 flex overflow-hidden">

      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col gap-4 h-screen sticky top-0 overflow-y-auto">
        <div className="text-center">
          <p className="text-[#FFE600] font-black">Event Lobby</p>
          <p className="text-zinc-500 font-mono text-xs tracking-widest">{code}</p>
        </div>

        {joinUrl && (
          <div className="bg-white p-2 rounded-xl">
            <QRCode value={joinUrl} size={152} />
          </div>
        )}

        <div className="flex justify-between bg-zinc-800 rounded-xl px-3 py-2 text-sm">
          <span className="text-zinc-400">Participants</span>
          <span className="text-[#FFE600] font-bold">{participants.length}</span>
        </div>

        {/* Question progress list */}
        <div className="flex flex-col gap-1 mt-auto">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`text-xs px-2 py-1.5 rounded-lg leading-snug ${
                i === currentIndex
                  ? 'bg-[#FFE600] text-zinc-900 font-bold'
                  : i < currentIndex
                  ? 'text-zinc-600'
                  : 'text-zinc-500'
              }`}
            >
              {i + 1}. {q.prompt.length > 28 ? q.prompt.slice(0, 28) + '…' : q.prompt}
            </div>
          ))}
        </div>
      </aside>

      {/* Main — fixed height, split into top and bottom halves */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-zinc-800">
          <div>
            <span className="text-[#FFE600] text-xs font-bold uppercase tracking-wider">
              {currentQuestion ? TYPE_LABELS[currentQuestion.type] : ''}
            </span>
            <p className="text-zinc-400 text-sm mt-0.5">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Compare toggle */}
            {questions.length > 1 && (
              compareOpen ? (
                <button
                  onClick={closeCompare}
                  className="bg-zinc-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-zinc-600 transition-colors text-sm"
                >
                  Hide Compare
                </button>
              ) : (
                <button
                  onClick={openCompare}
                  className="bg-zinc-800 text-[#FFE600] font-bold px-4 py-2 rounded-xl hover:bg-zinc-700 transition-colors text-sm border border-zinc-700"
                >
                  Compare ↔
                </button>
              )
            )}
            {/* Navigation */}
            {currentIndex > 0 && (
              <button
                onClick={previous}
                className="bg-zinc-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-zinc-600 transition-colors text-sm"
              >
                ← Prev
              </button>
            )}
            <button
              onClick={advance}
              className="bg-[#FFE600] text-zinc-900 font-black px-6 py-2 rounded-xl hover:bg-[#FFD900] transition-colors"
            >
              {isLastQuestion ? 'End Session →' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Content area — horizontal split (left = current, right = compare) */}
        <div className="flex-1 flex min-h-0">

          {/* Left half — current question results (always visible) */}
          <div
            className={`${compareOpen ? 'w-1/2' : 'flex-1'} min-w-0 overflow-y-auto p-8 ${
              compareOpen ? 'border-r-2 border-[#FFE600]/30' : ''
            }`}
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              {renderResults(currentIndex)}
            </div>
          </div>

          {/* Right half — comparison panel (shown only when compareOpen) */}
          {compareOpen && (
            <div className="w-1/2 min-w-0 flex flex-col">
              {/* Comparison question selector */}
              <div className="shrink-0 flex items-center gap-2 px-6 py-3 bg-zinc-900/50 border-b border-zinc-800 overflow-x-auto">
                <span className="text-zinc-500 text-xs uppercase tracking-widest shrink-0 mr-2">Compare with:</span>
                {questions.map((q, i) => {
                  if (i === currentIndex) return null
                  return (
                    <button
                      key={q.id}
                      onClick={() => selectComparison(i)}
                      className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        comparisonIndex === i
                          ? 'bg-[#FFE600] text-zinc-900'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      Q{i + 1}: {q.prompt.length > 24 ? q.prompt.slice(0, 24) + '…' : q.prompt}
                    </button>
                  )
                })}
              </div>

              {/* Comparison results */}
              <div className="flex-1 min-h-0 overflow-y-auto p-8">
                {comparisonIndex !== null ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <p className="text-zinc-500 text-xs uppercase tracking-widest mb-4">
                      Q{comparisonIndex + 1} · {questions[comparisonIndex] ? TYPE_LABELS[questions[comparisonIndex].type] : ''}
                    </p>
                    {renderResults(comparisonIndex)}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-600 text-sm">Select a question to compare</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
