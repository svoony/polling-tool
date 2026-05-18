'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { supabase } from '@/lib/supabase'
import { EVENTS, type AnswerPayload, type QuestionPayload } from '@/lib/events'
import { WordCloudDisplay } from '@/components/WordCloudDisplay'

type Participant = {
  name: string
  presence_ref: string
}

export default function HostPage() {
  const { code } = useParams<{ code: string }>()
  const searchParams = useSearchParams()
  const prompt = searchParams.get('prompt') ?? ''

  const [joinUrl, setJoinUrl] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [question, setQuestion] = useState<QuestionPayload | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const gameChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join/${code}`)
  }, [code])

  // Presence channel — lobby participant list
  useEffect(() => {
    const channel = supabase.channel(`room:${code}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ name: string }>()
        const all = Object.values(state)
          .flat()
          .map((p) => ({ name: p.name, presence_ref: p.presence_ref }))
        setParticipants(all)
      })
      .subscribe((status) => {
        console.log('[host] presence channel status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [code])

  // Game channel — receives answers
  useEffect(() => {
    const channel = supabase.channel(`game:${code}`)
      .on('broadcast', { event: EVENTS.ANSWER_SUBMIT }, ({ payload }: { payload: AnswerPayload }) => {
        console.log('[host] received answer:submit', payload)
        setAnswers((prev) => {
          if (prev[payload.participantName] !== undefined) {
            console.log('[host] duplicate answer ignored from', payload.participantName)
            return prev
          }
          return { ...prev, [payload.participantName]: payload.answer }
        })
      })
      .subscribe((status) => {
        console.log('[host] game channel status:', status)
      })

    gameChannelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [code])

  async function startQuestion() {
    const q: QuestionPayload = {
      questionId: crypto.randomUUID(),
      type: 'word_cloud',
      prompt,
    }
    console.log('[host] sending question:start', q)
    await gameChannelRef.current?.send({
      type: 'broadcast',
      event: EVENTS.QUESTION_START,
      payload: q,
    })
    setQuestion(q)
    setAnswers({})
  }

  async function endQuestion() {
    console.log('[host] sending question:end', question?.questionId)
    await gameChannelRef.current?.send({
      type: 'broadcast',
      event: EVENTS.QUESTION_END,
      payload: { questionId: question?.questionId },
    })
    setQuestion(null)
  }

  const canStart = participants.length > 0 && !question

  return (
    <main className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-yellow-400 tracking-tight">Event Lobby</h1>
          <p className="text-zinc-400 mt-1 text-sm font-mono tracking-widest">{code}</p>
        </div>

        {/* Lobby row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center gap-4">
            <p className="text-white font-bold text-lg">Scan to Join</p>
            {joinUrl && (
              <div className="bg-white p-3 rounded-xl">
                <QRCode value={joinUrl} size={200} />
              </div>
            )}
            <p className="text-zinc-400 text-xs break-all text-center">{joinUrl}</p>
          </div>

          {/* Participants card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-white font-bold text-lg">Participants</p>
              <span className="bg-zinc-800 text-yellow-400 font-bold text-sm px-3 py-1 rounded-full">
                {participants.length}
              </span>
            </div>
            {participants.length === 0 ? (
              <p className="text-zinc-500 text-center py-6">Waiting for participants...</p>
            ) : (
              <ul className="space-y-2 overflow-y-auto max-h-48">
                {participants.map((p) => (
                  <li key={p.presence_ref} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full shrink-0" />
                    <span className="text-white text-sm">{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Question card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
          {!question ? (
            <div className="flex flex-col gap-3">
              <p className="text-white font-bold text-lg">Question</p>
              <p className="text-zinc-300 text-xl">{prompt}</p>
              <button
                onClick={startQuestion}
                disabled={!canStart}
                className="w-full bg-yellow-400 text-zinc-900 font-black text-lg rounded-xl py-3 hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {participants.length === 0 ? 'Waiting for participants...' : 'Start Question →'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-white font-bold text-xl">{question.prompt}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={endQuestion}
                    className="bg-zinc-700 text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-zinc-600 transition-colors"
                  >
                    End Question
                  </button>
                </div>
              </div>
              <WordCloudDisplay answers={answers} />
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
