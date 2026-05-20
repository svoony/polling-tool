'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EVENTS, type AnswerPayload, type QuestionPayload } from '@/lib/events'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [question, setQuestion] = useState<QuestionPayload | null>(null)
  const [answer, setAnswer] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)

  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const gameChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Presence channel
  useEffect(() => {
    if (!joined) return

    const channel = supabase.channel(`room:${code}`)
    presenceChannelRef.current = channel

    channel.subscribe(async (status) => {
      console.log('[participant] presence channel status:', status)
      if (status === 'SUBSCRIBED') {
        await channel.track({ name })
      }
    })

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        channel.untrack()
      } else {
        channel.track({ name })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [joined, code, name])

  // Game channel
  useEffect(() => {
    if (!joined) return

    const channel = supabase.channel(`game:${code}`)
      .on('broadcast', { event: EVENTS.QUESTION_START }, ({ payload }: { payload: QuestionPayload }) => {
        console.log('[participant] received question:start', payload)
        setQuestion(payload)
        setAnswer('')
        setHasAnswered(false)
      })
      .on('broadcast', { event: EVENTS.QUESTION_END }, ({ payload }) => {
        console.log('[participant] received question:end', payload)
        setQuestion(null)
        setAnswer('')
        setHasAnswered(false)
      })
      .subscribe((status) => {
        console.log('[participant] game channel status:', status)
      })

    gameChannelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [joined, code])

  async function joinSession() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { data: session } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('code', code)
      .single()

    if (!session) {
      setError('Session not found. Check the code and try again.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('participants')
      .insert({ session_id: session.id, name: name.trim() })

    if (insertError) {
      setError('Could not join. Please try again.')
    } else {
      setJoined(true)
    }
    setLoading(false)
  }

  async function submitAnswer() {
    if (!answer.trim() || hasAnswered || !question) return
    const payload: AnswerPayload = {
      questionId: question.questionId,
      answer: answer.trim(),
      participantName: name,
    }
    console.log('[participant] sending answer:submit', payload)
    await gameChannelRef.current?.send({
      type: 'broadcast',
      event: EVENTS.ANSWER_SUBMIT,
      payload,
    })
    setHasAnswered(true)
  }

  // Active question screen
  if (joined && question) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col gap-6">
          <h2 className="text-white font-black text-2xl text-center">{question.prompt}</h2>
          {hasAnswered ? (
            <div className="text-center py-4">
              <p className="text-[#FFE600] font-bold text-xl">Answer submitted!</p>
              <p className="text-zinc-400 mt-2 text-sm">Waiting for others...</p>
            </div>
          ) : (
            <>
              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
                placeholder="Your answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                maxLength={60}
                autoFocus
              />
              <button
                onClick={submitAnswer}
                disabled={!answer.trim()}
                className="w-full bg-[#FFE600] text-zinc-900 font-black text-lg rounded-xl py-3 hover:bg-[#FFD900] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </>
          )}
        </div>
      </main>
    )
  }

  // Waiting screen
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

  // Join form
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
