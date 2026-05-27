'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EVENTS, type AnswerPayload, type QuestionStartPayload } from '@/lib/events'
import { ParticipantWordCloud } from '@/components/participant/ParticipantWordCloud'
import { ParticipantTokenAllocation } from '@/components/participant/ParticipantTokenAllocation'
import { ParticipantPictionary } from '@/components/participant/ParticipantPictionary'
import { ParticipantCoordPlot } from '@/components/participant/ParticipantCoordPlot'
import { ParticipantRanking } from '@/components/participant/ParticipantRanking'
import { ParticipantReact } from '@/components/participant/ParticipantReact'
import { ParticipantMultipleChoice } from '@/components/participant/ParticipantMultipleChoice'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState<QuestionStartPayload | null>(null)
  const [sessionEnded, setSessionEnded] = useState(false)

  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const gameChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Presence channel — keeps participant in lobby while tab is open
  useEffect(() => {
    if (!joined) return
    const channel = supabase.channel(`room:${code}`)
    presenceChannelRef.current = channel
    channel.subscribe(async (status) => {
      console.log('[participant] presence:', status)
      if (status === 'SUBSCRIBED') await channel.track({ name })
    })
    function handleVisibility() {
      if (document.visibilityState === 'hidden') channel.untrack()
      else channel.track({ name })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [joined, code, name])

  // Game channel — receives questions and session end
  useEffect(() => {
    if (!joined) return
    const channel = supabase.channel(`game:${code}`)
      .on('broadcast', { event: EVENTS.QUESTION_START }, ({ payload }: { payload: QuestionStartPayload }) => {
        console.log('[participant] question:start', payload)
        setCurrentQuestion(payload)
        setSessionEnded(false)
      })
      .on('broadcast', { event: EVENTS.SESSION_END }, () => {
        console.log('[participant] session:end')
        setCurrentQuestion(null)
        setSessionEnded(true)
      })
      .on('broadcast', { event: EVENTS.SESSION_RESET }, () => {
        console.log('[participant] session:reset')
        setCurrentQuestion(null)
        setSessionEnded(false)
      })
      .subscribe((status) => console.log('[participant] game channel:', status))
    gameChannelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [joined, code])

  async function joinSession() {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    const { data: session } = await supabase
      .from('sessions').select('id').eq('code', code).single()
    if (!session) {
      setError('Session not found. Check the code and try again.')
      setLoading(false)
      return
    }
    const { error: insertError } = await supabase
      .from('participants').insert({ session_id: session.id, name: name.trim() })
    if (insertError) {
      setError('Could not join. Please try again.')
    } else {
      setJoined(true)
    }
    setLoading(false)
  }

  async function sendAnswer(payload: AnswerPayload) {
    console.log('[participant] answer:submit', payload)
    await gameChannelRef.current?.send({
      type: 'broadcast',
      event: EVENTS.ANSWER_SUBMIT,
      payload,
    })
  }

  // ── SESSION ENDED ─────────────────────────────────────────────────────────
  if (sessionEnded) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-5xl mb-4">🎉</p>
          <h1 className="text-2xl font-black text-[#FFE600]">Session Complete</h1>
          <p className="text-zinc-400 mt-2">Thanks for participating, {name}!</p>
        </div>
      </main>
    )
  }

  // ── ACTIVE QUESTION ───────────────────────────────────────────────────────
  if (joined && currentQuestion) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-500 text-xs mb-4 text-center">
            Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}
          </p>

          {currentQuestion.type === 'word_cloud' && (
            <ParticipantWordCloud
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              onSubmit={(word) =>
                sendAnswer({ type: 'word_cloud', questionId: currentQuestion.id, word, participantName: name })
              }
            />
          )}

          {currentQuestion.type === 'token_allocation' && (
            <ParticipantTokenAllocation
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              buckets={currentQuestion.buckets}
              onSubmit={(allocations) =>
                sendAnswer({ type: 'token_allocation', questionId: currentQuestion.id, allocations, participantName: name })
              }
            />
          )}

          {currentQuestion.type === 'pictionary' && (
            <ParticipantPictionary
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              onSubmit={(imageDataUrl) =>
                sendAnswer({ type: 'pictionary', questionId: currentQuestion.id, imageDataUrl, participantName: name })
              }
            />
          )}

          {currentQuestion.type === 'coord_plot' && (
            <ParticipantCoordPlot
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              xLow={currentQuestion.xLow}
              xHigh={currentQuestion.xHigh}
              yLow={currentQuestion.yLow}
              yHigh={currentQuestion.yHigh}
              onSubmit={(x, y) =>
                sendAnswer({ type: 'coord_plot', questionId: currentQuestion.id, x, y, participantName: name })
              }
            />
          )}

          {currentQuestion.type === 'ranking' && (
            <ParticipantRanking
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              options={currentQuestion.options}
              onSubmit={(orderedOptions) =>
                sendAnswer({ type: 'ranking', questionId: currentQuestion.id, orderedOptions, participantName: name })
              }
            />
          )}

          {currentQuestion.type === 'react' && (
            <ParticipantReact
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              items={currentQuestion.items}
              onSubmit={(reactions) =>
                sendAnswer({ type: 'react', questionId: currentQuestion.id, reactions, participantName: name })
              }
            />
          )}

          {currentQuestion.type === 'multiple_choice' && (
            <ParticipantMultipleChoice
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              options={currentQuestion.options}
              onSubmit={(option) =>
                sendAnswer({ type: 'multiple_choice', questionId: currentQuestion.id, option, participantName: name })
              }
            />
          )}
        </div>
      </main>
    )
  }

  // ── WAITING ───────────────────────────────────────────────────────────────
  if (joined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
          <div className="text-5xl">👋</div>
          <p className="text-white font-black text-xl">You&apos;re in, {name}!</p>
          <p className="text-zinc-400">Waiting for the host to start...</p>
        </div>
      </main>
    )
  }

  // ── JOIN FORM ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-[#FFE600]">Join Session</h1>
          <p className="text-zinc-400 font-mono tracking-widest mt-1">{code}</p>
        </div>
        <input
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && joinSession()}
          maxLength={50}
          autoFocus
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={joinSession}
          disabled={loading || !name.trim()}
          className="w-full bg-[#FFE600] text-zinc-900 font-black text-lg rounded-xl py-3 hover:bg-[#FFD900] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Joining...' : 'Join →'}
        </button>
      </div>
    </main>
  )
}
