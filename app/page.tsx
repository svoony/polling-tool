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
  coord_plot: 'e.g. Where do you fall on this scale?',
  ranking: 'e.g. Rank these from best to worst',
  react: 'e.g. React to each of these items',
  multiple_choice: 'e.g. Which option do you prefer?',
}

export default function Home() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])

  // Question type
  const [type, setType] = useState<QType>('word_cloud')

  // Shared
  const [prompt, setPrompt] = useState('')

  // Token allocation
  const [buckets, setBuckets] = useState(['', ''])

  // Coordinate plot
  const [xLow, setXLow] = useState('')
  const [xHigh, setXHigh] = useState('')
  const [yLow, setYLow] = useState('')
  const [yHigh, setYHigh] = useState('')

  // Ranking
  const [rankOptions, setRankOptions] = useState(['', ''])

  // React
  const [reactItems, setReactItems] = useState([''])

  // Multiple choice
  const [mcOptions, setMcOptions] = useState(['', ''])

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  function resetFields() {
    setPrompt('')
    setBuckets(['', ''])
    setXLow('')
    setXHigh('')
    setYLow('')
    setYHigh('')
    setRankOptions(['', ''])
    setReactItems([''])
    setMcOptions(['', ''])
  }

  function isFormValid(): boolean {
    if (!prompt.trim()) return false
    if (type === 'token_allocation') return buckets.filter((b) => b.trim()).length >= 2
    if (type === 'coord_plot') return !!(xLow.trim() && xHigh.trim() && yLow.trim() && yHigh.trim())
    if (type === 'ranking') return rankOptions.filter((o) => o.trim()).length >= 2
    if (type === 'react') return reactItems.filter((i) => i.trim()).length >= 1
    if (type === 'multiple_choice') return mcOptions.filter((o) => o.trim()).length >= 2
    return true
  }

  function addQuestion() {
    if (!isFormValid()) return
    let q: Question
    if (type === 'word_cloud') {
      q = { id: crypto.randomUUID(), type: 'word_cloud', prompt: prompt.trim() }
    } else if (type === 'token_allocation') {
      q = { id: crypto.randomUUID(), type: 'token_allocation', prompt: prompt.trim(), buckets: buckets.filter((b) => b.trim()) }
    } else if (type === 'pictionary') {
      q = { id: crypto.randomUUID(), type: 'pictionary', prompt: prompt.trim() }
    } else if (type === 'coord_plot') {
      q = { id: crypto.randomUUID(), type: 'coord_plot', prompt: prompt.trim(), xLow: xLow.trim(), xHigh: xHigh.trim(), yLow: yLow.trim(), yHigh: yHigh.trim() }
    } else if (type === 'ranking') {
      q = { id: crypto.randomUUID(), type: 'ranking', prompt: prompt.trim(), options: rankOptions.filter((o) => o.trim()) }
    } else if (type === 'react') {
      q = { id: crypto.randomUUID(), type: 'react', prompt: prompt.trim(), items: reactItems.filter((i) => i.trim()) }
    } else {
      q = { id: crypto.randomUUID(), type: 'multiple_choice', prompt: prompt.trim(), options: mcOptions.filter((o) => o.trim()) }
    }
    setQuestions((prev) => [...prev, q])
    resetFields()
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
                  {q.type === 'coord_plot' && (
                    <p className="text-zinc-500 text-xs mt-0.5">
                      X: {q.xLow} → {q.xHigh} · Y: {q.yLow} → {q.yHigh}
                    </p>
                  )}
                  {q.type === 'ranking' && (
                    <p className="text-zinc-500 text-xs mt-0.5">{q.options.join(' · ')}</p>
                  )}
                  {q.type === 'react' && (
                    <p className="text-zinc-500 text-xs mt-0.5">{q.items.join(' · ')}</p>
                  )}
                  {q.type === 'multiple_choice' && (
                    <p className="text-zinc-500 text-xs mt-0.5">{q.options.join(' · ')}</p>
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
            {(['word_cloud', 'token_allocation', 'pictionary', 'coord_plot', 'ranking', 'react', 'multiple_choice'] as QType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); resetFields() }}
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
            onKeyDown={(e) => {
              const noEnter: QType[] = ['token_allocation', 'coord_plot', 'ranking', 'react', 'multiple_choice']
              if (e.key === 'Enter' && !noEnter.includes(type)) addQuestion()
            }}
            maxLength={120}
          />

          {/* Token allocation buckets */}
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

          {/* Coordinate plot axis labels */}
          {type === 'coord_plot' && (
            <div className="flex flex-col gap-2">
              <p className="text-zinc-400 text-sm">Label each end of each axis</p>

              {/* Row: Y-label column + grid */}
              <div className="flex gap-3 items-stretch">
                {/* Y labels — left of grid, top = high, bottom = low */}
                <div className="flex flex-col justify-between w-24 shrink-0 gap-2">
                  <textarea
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm resize-none overflow-hidden"
                    placeholder="Y high (top)"
                    rows={1}
                    value={yHigh}
                    onChange={(e) => setYHigh(e.target.value)}
                    onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
                    maxLength={50}
                  />
                  <textarea
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm resize-none overflow-hidden"
                    placeholder="Y low (bottom)"
                    rows={1}
                    value={yLow}
                    onChange={(e) => setYLow(e.target.value)}
                    onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
                    maxLength={50}
                  />
                </div>

                {/* Grid preview */}
                <div className="flex-1 aspect-square border border-zinc-700 rounded-xl bg-zinc-800/40 relative shrink-0 min-w-0">
                  <div className="absolute top-0 bottom-0 left-1/2 border-l border-zinc-700/50 pointer-events-none" />
                  <div className="absolute left-0 right-0 top-1/2 border-t border-zinc-700/50 pointer-events-none" />
                </div>
              </div>

              {/* X labels — below grid, offset to align with grid left/right edges */}
              <div className="flex gap-3">
                <div className="w-24 shrink-0" />{/* spacer matching Y column */}
                <div className="flex-1 flex gap-2">
                  <textarea
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm resize-none overflow-hidden"
                    placeholder="X low (left)"
                    rows={1}
                    value={xLow}
                    onChange={(e) => setXLow(e.target.value)}
                    onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
                    maxLength={50}
                  />
                  <textarea
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm resize-none overflow-hidden text-right"
                    placeholder="X high (right)"
                    rows={1}
                    value={xHigh}
                    onChange={(e) => setXHigh(e.target.value)}
                    onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
                    maxLength={50}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ranking options */}
          {type === 'ranking' && (
            <div className="flex flex-col gap-2">
              <p className="text-zinc-400 text-sm">Options to rank (min 2, max 10)</p>
              {rankOptions.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm"
                    placeholder={`Option ${i + 1}`}
                    value={o}
                    onChange={(e) => {
                      const next = [...rankOptions]
                      next[i] = e.target.value
                      setRankOptions(next)
                    }}
                    maxLength={60}
                  />
                  {rankOptions.length > 2 && (
                    <button
                      onClick={() => setRankOptions((prev) => prev.filter((_, j) => j !== i))}
                      className="text-zinc-500 hover:text-red-400 px-2 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {rankOptions.length < 10 && (
                <button
                  onClick={() => setRankOptions((prev) => [...prev, ''])}
                  className="text-[#FFE600] text-sm text-left hover:underline"
                >
                  + Add option
                </button>
              )}
            </div>
          )}

          {/* React items */}
          {type === 'react' && (
            <div className="flex flex-col gap-2">
              <p className="text-zinc-400 text-sm">Items to react to (max 4)</p>
              {reactItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm"
                    placeholder={`Item ${i + 1}`}
                    value={item}
                    onChange={(e) => {
                      const next = [...reactItems]
                      next[i] = e.target.value
                      setReactItems(next)
                    }}
                    maxLength={80}
                  />
                  {reactItems.length > 1 && (
                    <button
                      onClick={() => setReactItems((prev) => prev.filter((_, j) => j !== i))}
                      className="text-zinc-500 hover:text-red-400 px-2 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {reactItems.length < 4 && (
                <button
                  onClick={() => setReactItems((prev) => [...prev, ''])}
                  className="text-[#FFE600] text-sm text-left hover:underline"
                >
                  + Add item
                </button>
              )}
            </div>
          )}

          {/* Multiple choice options */}
          {type === 'multiple_choice' && (
            <div className="flex flex-col gap-2">
              <p className="text-zinc-400 text-sm">Options (min 2, max 10)</p>
              {mcOptions.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm"
                    placeholder={`Option ${i + 1}`}
                    value={o}
                    onChange={(e) => {
                      const next = [...mcOptions]
                      next[i] = e.target.value
                      setMcOptions(next)
                    }}
                    maxLength={80}
                  />
                  {mcOptions.length > 2 && (
                    <button
                      onClick={() => setMcOptions((prev) => prev.filter((_, j) => j !== i))}
                      className="text-zinc-500 hover:text-red-400 px-2 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {mcOptions.length < 10 && (
                <button
                  onClick={() => setMcOptions((prev) => [...prev, ''])}
                  className="text-[#FFE600] text-sm text-left hover:underline"
                >
                  + Add option
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
