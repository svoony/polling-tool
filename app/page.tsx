'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TYPE_LABELS, questionDetail, type Question } from '@/lib/questions'
import {
  QuestionForm,
  emptyDraft,
  isDraftValid,
  questionFromDraft,
  type QuestionDraft,
} from '@/components/QuestionForm'
import { Wordmark } from '@/components/Wordmark'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Home() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [draft, setDraft] = useState<QuestionDraft>(() => emptyDraft('word_cloud'))

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  function addQuestion() {
    if (!isDraftValid(draft)) return
    setQuestions((prev) => [...prev, questionFromDraft(draft, crypto.randomUUID())])
    setDraft(emptyDraft(draft.type))
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  async function startLobby() {
    if (questions.length === 0 || creating) return
    setCreating(true)
    setError('')
    const code = generateCode()
    const { error: err } = await supabase.from('sessions').insert({ code, questions })
    if (err) {
      setError('Failed to create session. Check your connection.')
      setCreating(false)
      return
    }
    sessionStorage.setItem(`session_${code}`, JSON.stringify(questions))
    router.push(`/host/${code}`)
  }

  return (
    <main className="min-h-screen bg-ey-ink p-4">
      <div className="max-w-2xl mx-auto py-8 flex flex-col gap-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl flex justify-center"><Wordmark /></h1>
          <p className="text-ey-muted mt-1">Add your questions, then start the lobby.</p>
        </div>

        {/* Added questions */}
        {questions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-ey-subtle text-xs uppercase tracking-widest">Questions added</p>
            {questions.map((q, i) => (
              <div key={q.id} className="bg-ey-panel border border-ey-line rounded-none px-4 py-3 flex items-start justify-between gap-4">
                <div>
                  <span className="text-ey-yellow text-xs font-bold uppercase tracking-wider">
                    {i + 1}. {TYPE_LABELS[q.type]}
                  </span>
                  <p className="text-white text-sm mt-0.5">{q.prompt}</p>
                  {questionDetail(q) && (
                    <p className="text-ey-subtle text-xs mt-0.5">{questionDetail(q)}</p>
                  )}
                </div>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="text-ey-faint hover:text-red-400 text-xs transition-colors shrink-0 mt-0.5"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Question builder */}
        <div className="bg-ey-panel border border-ey-line rounded-none p-6 flex flex-col gap-5">
          <p className="text-white font-bold text-lg">
            {questions.length === 0 ? 'Add your first question' : 'Add another question'}
          </p>

          <QuestionForm draft={draft} onChange={setDraft} onSubmit={addQuestion} />

          <button
            onClick={addQuestion}
            disabled={!isDraftValid(draft)}
            className="w-full bg-ey-line text-white font-bold rounded-none py-3 hover:bg-ey-line-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Add Question
          </button>
        </div>

        {/* Start lobby */}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button
          onClick={startLobby}
          disabled={questions.length === 0 || creating}
          className="w-full bg-ey-yellow text-ey-ink font-black text-xl rounded-none py-4 hover:bg-ey-yellow-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? 'Creating...' : 'Start Lobby →'}
        </button>

      </div>
    </main>
  )
}
