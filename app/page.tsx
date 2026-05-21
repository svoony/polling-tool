'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TYPE_LABELS, type Question } from '@/lib/questions'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

type QType = Question['type']

const PLACEHOLDERS: Record<QType, string> = {
  word_cloud: 'e.g. Describe today in one word',
  token_allocation: 'e.g. How would you allocate your week?',
  pictionary: 'e.g. Draw a cat',
}

export default function Home() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])

  // Form state for the question currently being built
  const [type, setType] = useState<QType>('word_cloud')
  const [prompt, setPrompt] = useState('')
  const [buckets, setBuckets] = useState(['', ''])

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  function isFormValid(): boolean {
    if (!prompt.trim()) return false
    if (type === 'token_allocation') {
      return buckets.filter((b) => b.trim()).length >= 2
    }
    return true
  }

  function addQuestion() {
    if (!isFormValid()) return
    let q: Question
    if (type === 'word_cloud') {
      q = { id: crypto.randomUUID(), type: 'word_cloud', prompt: prompt.trim() }
    } else if (type === 'token_allocation') {
      q = { id: crypto.randomUUID(), type: 'token_allocation', prompt: prompt.trim(), buckets: buckets.filter((b) => b.trim()) }
    } else {
      q = { id: crypto.randomUUID(), type: 'pictionary', prompt: prompt.trim() }
    }
    setQuestions((prev) => [...prev, q])
    setPrompt('')
    setBuckets(['', ''])
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  async function startLobby() {
    if (questions.length === 0 || creating) return
    setCreating(true)
    setError('')
    const code = generateCode()
    const { error: err } = await supabase.from('sessions').insert({ code })
    if (err) {
      setError('Failed to create session. Check your connection.')
      setCreating(false)
      return
    }
    sessionStorage.setItem(`session_${code}`, JSON.stringify(questions))
    router.push(`/host/${code}`)
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-4">
      <div className="max-w-2xl mx-auto py-8 flex flex-col gap-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#FFE600]">Event Lobby</h1>
          <p className="text-zinc-400 mt-1">Build your question set, then start the lobby.</p>
        </div>

        {/* Added questions */}
        {questions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-zinc-500 text-xs uppercase tracking-widest">Questions added</p>
            {questions.map((q, i) => (
              <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-start justify-between gap-4">
                <div>
                  <span className="text-[#FFE600] text-xs font-bold uppercase tracking-wider">
                    {i + 1}. {TYPE_LABELS[q.type]}
                  </span>
                  <p className="text-white text-sm mt-0.5">{q.prompt}</p>
                  {q.type === 'token_allocation' && (
                    <p className="text-zinc-500 text-xs mt-0.5">{q.buckets.join(' · ')}</p>
                  )}
                </div>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors shrink-0 mt-0.5"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Question builder */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">
          <p className="text-white font-bold text-lg">
            {questions.length === 0 ? 'Add your first question' : 'Add another question'}
          </p>

          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {(['word_cloud', 'token_allocation', 'pictionary'] as QType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setPrompt(''); setBuckets(['', '']) }}
                className={`py-2 px-3 rounded-xl text-sm font-bold transition-colors ${
                  type === t
                    ? 'bg-[#FFE600] text-zinc-900'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Prompt */}
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
            placeholder={PLACEHOLDERS[type]}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && type !== 'token_allocation' && addQuestion()}
            maxLength={120}
          />

          {/* Bucket inputs — token allocation only */}
          {type === 'token_allocation' && (
            <div className="flex flex-col gap-2">
              <p className="text-zinc-400 text-sm">Buckets (min 2, max 5)</p>
              {buckets.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm"
                    placeholder={`Bucket ${i + 1}`}
                    value={b}
                    onChange={(e) => {
                      const next = [...buckets]
                      next[i] = e.target.value
                      setBuckets(next)
                    }}
                    maxLength={40}
                  />
                  {buckets.length > 2 && (
                    <button
                      onClick={() => setBuckets((prev) => prev.filter((_, j) => j !== i))}
                      className="text-zinc-500 hover:text-red-400 px-2 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {buckets.length < 5 && (
                <button
                  onClick={() => setBuckets((prev) => [...prev, ''])}
                  className="text-[#FFE600] text-sm text-left hover:underline"
                >
                  + Add bucket
                </button>
              )}
            </div>
          )}

          <button
            onClick={addQuestion}
            disabled={!isFormValid()}
            className="w-full bg-zinc-700 text-white font-bold rounded-xl py-3 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Add Question
          </button>
        </div>

        {/* Start lobby */}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button
          onClick={startLobby}
          disabled={questions.length === 0 || creating}
          className="w-full bg-[#FFE600] text-zinc-900 font-black text-xl rounded-2xl py-4 hover:bg-[#FFD900] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? 'Creating...' : 'Start Lobby →'}
        </button>

      </div>
    </main>
  )
}
