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

  // In-memory answer state — reset on each question advance
  const [wordCloudWords, setWordCloudWords] = useState<string[]>([])
  const [tokenTotals, setTokenTotals] = useState<Record<string, number>>({})
  const [pictionaryDrawings, setPictionaryDrawings] = useState<Drawing[]>([])

  const gameChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  // Ref mirrors the current broadcast payload so the presence join handler is never stale
  const currentPayloadRef = useRef<QuestionStartPayload | null>(null)

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join/${code}`)
  }, [code])

  // Load questions from sessionStorage (written by home page before navigating here)
  useEffect(() => {
    const stored = sessionStorage.getItem(`session_${code}`)
    if (stored) setQuestions(JSON.parse(stored))
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
        if (payload.type === 'word_cloud') {
          setWordCloudWords((prev) => [...prev, payload.word])
        } else if (payload.type === 'token_allocation') {
          setTokenTotals((prev) => {
            const next = { ...prev }
            for (const [bucket, amount] of Object.entries(payload.allocations)) {
              next[bucket] = (next[bucket] ?? 0) + amount
            }
            return next
          })
        } else if (payload.type === 'pictionary') {
          setPictionaryDrawings((prev) => [...prev, { name: payload.participantName, url: payload.imageDataUrl }])
        }
      })
      .subscribe((status) => console.log('[host] game channel:', status))

    gameChannelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [code])

  function buildPayload(index: number): QuestionStartPayload {
    return { ...questions[index], questionIndex: index, totalQuestions: questions.length } as QuestionStartPayload
  }

  function resetAnswers() {
    setWordCloudWords([])
    setTokenTotals({})
    setPictionaryDrawings([])
  }

  async function startSession() {
    const payload = buildPayload(0)
    console.log('[host] session start — question:start', payload)
    await gameChannelRef.current?.send({ type: 'broadcast', event: EVENTS.QUESTION_START, payload })
    currentPayloadRef.current = payload
    setCurrentIndex(0)
    setPhase('active')
    resetAnswers()
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
    const payload = buildPayload(nextIndex)
    console.log('[host] question:start', payload)
    await gameChannelRef.current?.send({ type: 'broadcast', event: EVENTS.QUESTION_START, payload })
    currentPayloadRef.current = payload
    setCurrentIndex(nextIndex)
    resetAnswers()
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
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🎉</p>
          <h1 className="text-3xl font-black text-[#FFE600]">Session Complete</h1>
          <p className="text-zinc-400 mt-2">Thanks for participating!</p>
        </div>
      </main>
    )
  }

  // ── ACTIVE PHASE ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-zinc-950 flex overflow-hidden">

      {/* Sidebar — fixed, not scrollable with content */}
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

      {/* Main — scrollable */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#FFE600] text-xs font-bold uppercase tracking-wider">
              {currentQuestion ? TYPE_LABELS[currentQuestion.type] : ''}
            </span>
            <p className="text-zinc-400 text-sm mt-0.5">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <button
            onClick={advance}
            className="bg-[#FFE600] text-zinc-900 font-black px-6 py-2 rounded-xl hover:bg-[#FFD900] transition-colors"
          >
            {isLastQuestion ? 'End Session →' : 'Next Question →'}
          </button>
        </div>

        {/* Results */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {currentQuestion?.type === 'word_cloud' && (
            <HostWordCloud prompt={currentQuestion.prompt} words={wordCloudWords} />
          )}
          {currentQuestion?.type === 'token_allocation' && (
            <HostTokenAllocation
              prompt={currentQuestion.prompt}
              buckets={currentQuestion.buckets}
              totals={tokenTotals}
              participantCount={participants.length}
            />
          )}
          {currentQuestion?.type === 'pictionary' && (
            <HostPictionary prompt={currentQuestion.prompt} drawings={pictionaryDrawings} />
          )}
        </div>

      </div>
    </main>
  )
}
