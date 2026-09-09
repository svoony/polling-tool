'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EVENTS, topics, type AnswerPayload, type QuestionStartPayload } from '@/lib/events'
import { ParticipantWordCloud } from '@/components/participant/ParticipantWordCloud'
import { ParticipantTokenAllocation } from '@/components/participant/ParticipantTokenAllocation'
import { ParticipantPictionary } from '@/components/participant/ParticipantPictionary'
import { ParticipantCoordPlot } from '@/components/participant/ParticipantCoordPlot'
import { ParticipantRanking } from '@/components/participant/ParticipantRanking'
import { ParticipantReact } from '@/components/participant/ParticipantReact'
import { ParticipantMultipleChoice } from '@/components/participant/ParticipantMultipleChoice'
import { Wordmark } from '@/components/Wordmark'

/** How long a tab must stay hidden before the participant drops off the host's count. */
const AWAY_UNTRACK_MS = 60_000

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const [currentQuestion, setCurrentQuestion] = useState<QuestionStartPayload | null>(null)
  const [sessionEnded, setSessionEnded] = useState(false)

  // Send-only: never subscribed, so answers go out over HTTP (see sendAnswer)
  const answersChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Presence channel — opening the link is enough to be in the lobby. No name, no form:
  // the guest is counted as a participant the moment this page mounts.
  useEffect(() => {
    const channel = supabase.channel(topics.presence(code))
    channel.subscribe(async (status) => {
      console.log('[participant] presence:', status)
      if (status === 'SUBSCRIBED') await channel.track({})
    })

    // Untracking the moment the tab hides removes people who really left, but a phone
    // locking in someone's hand fires the same event — and every track/untrack is a
    // presence message to the whole room. Only drop someone who stays away.
    let awayTimer: ReturnType<typeof setTimeout> | null = null
    let isUntracked = false
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        if (awayTimer) return
        awayTimer = setTimeout(() => {
          awayTimer = null
          isUntracked = true
          channel.untrack()
        }, AWAY_UNTRACK_MS)
        return
      }
      if (awayTimer) {
        clearTimeout(awayTimer)
        awayTimer = null
      }
      if (isUntracked) {
        isUntracked = false
        channel.track({})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (awayTimer) clearTimeout(awayTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [code])

  // Game channel — receives questions and session end
  useEffect(() => {
    const channel = supabase.channel(topics.game(code))
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
    return () => { supabase.removeChannel(channel) }
  }, [code])

  async function sendAnswer(payload: AnswerPayload) {
    console.log('[participant] answer:submit', payload)
    // Deliberately NOT subscribed: supabase-js posts over HTTP when a channel has not
    // been joined, so this reaches the host without putting this phone on the receiving
    // end of everyone else's answers.
    if (!answersChannelRef.current) {
      answersChannelRef.current = supabase.channel(topics.answers(code))
    }
    await answersChannelRef.current.send({
      type: 'broadcast',
      event: EVENTS.ANSWER_SUBMIT,
      payload,
    })
  }

  // ── SESSION ENDED ─────────────────────────────────────────────────────────
  if (sessionEnded) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-ey-ink">
        <div className="text-center">
          <p className="text-5xl mb-4">🎉</p>
          <h1 className="text-2xl font-black text-ey-yellow">Session Complete</h1>
          <p className="text-ey-muted mt-2">Thanks for participating!</p>
        </div>
      </main>
    )
  }

  // ── ACTIVE QUESTION ───────────────────────────────────────────────────────
  if (currentQuestion) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-ey-ink p-4">
        <div className="w-full max-w-sm bg-ey-panel border border-ey-line rounded-none p-6">
          <p className="text-ey-subtle text-xs mb-4 text-center">
            Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}
          </p>

          {currentQuestion.type === 'word_cloud' && (
            <ParticipantWordCloud
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              onSubmit={(word) =>
                sendAnswer({ type: 'word_cloud', questionId: currentQuestion.id, word })
              }
            />
          )}

          {currentQuestion.type === 'token_allocation' && (
            <ParticipantTokenAllocation
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              buckets={currentQuestion.buckets}
              onSubmit={(allocations) =>
                sendAnswer({ type: 'token_allocation', questionId: currentQuestion.id, allocations })
              }
            />
          )}

          {currentQuestion.type === 'pictionary' && (
            <ParticipantPictionary
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              onSubmit={(imageDataUrl) =>
                sendAnswer({ type: 'pictionary', questionId: currentQuestion.id, imageDataUrl })
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
                sendAnswer({ type: 'coord_plot', questionId: currentQuestion.id, x, y })
              }
            />
          )}

          {currentQuestion.type === 'ranking' && (
            <ParticipantRanking
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              options={currentQuestion.options}
              onSubmit={(orderedOptions) =>
                sendAnswer({ type: 'ranking', questionId: currentQuestion.id, orderedOptions })
              }
            />
          )}

          {currentQuestion.type === 'react' && (
            <ParticipantReact
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              items={currentQuestion.items}
              onSubmit={(reactions) =>
                sendAnswer({ type: 'react', questionId: currentQuestion.id, reactions })
              }
            />
          )}

          {currentQuestion.type === 'multiple_choice' && (
            <ParticipantMultipleChoice
              key={currentQuestion.id}
              prompt={currentQuestion.prompt}
              options={currentQuestion.options}
              multiSelect={currentQuestion.multiSelect}
              onSubmit={(options) =>
                sendAnswer({ type: 'multiple_choice', questionId: currentQuestion.id, options })
              }
            />
          )}
        </div>
      </main>
    )
  }

  // ── WAITING ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex items-center justify-center bg-ey-ink p-4">
      <div className="w-full max-w-sm bg-ey-panel border border-ey-line rounded-none p-8 text-center flex flex-col items-center gap-4">
        <Wordmark className="text-2xl" />
        <div className="text-5xl">👋</div>
        <p className="text-white font-black text-xl">You&apos;re in!</p>
        <p className="text-ey-muted font-mono tracking-widest text-sm">{code}</p>
        <p className="text-ey-muted">Waiting for the host to start...</p>
      </div>
    </main>
  )
}
