'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { supabase } from '@/lib/supabase'
import { EVENTS, type AnswerPayload, type QuestionPayload } from '@/lib/events'
import { WordCloudDisplay } from '@/components/WordCloudDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Participant = {
  name: string
  presence_ref: string
}

export default function HostPage() {
  const { code } = useParams<{ code: string }>()
  const [joinUrl, setJoinUrl] = useState('')

  // Lobby state
  const [participants, setParticipants] = useState<Participant[]>([])

  // Question state (in-memory only, never written to DB)
  const [question, setQuestion] = useState<QuestionPayload | null>(null)
  const [prompt, setPrompt] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({}) // participantName -> answer

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

  // Game channel — question and answer broadcasts
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
    if (!prompt.trim()) return
    const q: QuestionPayload = {
      questionId: crypto.randomUUID(),
      type: 'word_cloud',
      prompt: prompt.trim(),
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
    setPrompt('')
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Lobby row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Scan to Join</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {joinUrl && (
                <div className="bg-white p-4 rounded-lg border">
                  <QRCode value={joinUrl} size={220} />
                </div>
              )}
              <p className="text-3xl font-mono font-bold tracking-widest">{code}</p>
              {joinUrl && (
                <p className="text-xs text-gray-400 break-all text-center">{joinUrl}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Participants
                <Badge variant="secondary">{participants.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Waiting for participants...</p>
              ) : (
                <ul className="space-y-2">
                  {participants.map((p) => (
                    <li key={p.presence_ref} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                      <span className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                      <span className="text-sm">{p.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Question controls row */}
        <Card>
          {!question ? (
            <>
              <CardHeader>
                <CardTitle>Word Cloud</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Input
                  placeholder="Type a prompt, e.g. 'Describe today in one word'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startQuestion()}
                />
                <Button onClick={startQuestion} disabled={!prompt.trim()}>
                  Start
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{question.prompt}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {Object.keys(answers).length} / {participants.length} answered
                    </Badge>
                    <Button variant="outline" size="sm" onClick={endQuestion}>
                      End Question
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WordCloudDisplay answers={answers} />
              </CardContent>
            </>
          )}
        </Card>

      </div>
    </main>
  )
}
