'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EVENTS, type AnswerPayload, type QuestionPayload } from '@/lib/events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Question state
  const [question, setQuestion] = useState<QuestionPayload | null>(null)
  const [answer, setAnswer] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)

  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const gameChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Presence channel — keeps participant in lobby while tab is open
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

  // Game channel — receives questions, sends answers
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

  // Waiting screen — shown after joining
  if (joined) {
    // Active question
    if (question) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <CardTitle>{question.prompt}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {hasAnswered ? (
                <p className="text-center text-gray-500 py-4">Answer submitted!</p>
              ) : (
                <>
                  <Input
                    placeholder="Your answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                    maxLength={60}
                    autoFocus
                  />
                  <Button onClick={submitAnswer} disabled={!answer.trim()} className="w-full">
                    Submit
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      )
    }

    // Lobby waiting screen
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-3 pt-8 pb-8">
            <div className="text-5xl">👋</div>
            <p className="text-xl font-semibold">You&apos;re in, {name}!</p>
            <p className="text-gray-500">Waiting for the host to start...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Join form
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Join Session</CardTitle>
          <p className="text-gray-500 font-mono text-lg tracking-widest">{code}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinSession()}
            maxLength={50}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button onClick={joinSession} disabled={loading || !name.trim()} className="w-full">
            {loading ? 'Joining...' : 'Join'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
