'use client'

import { useState } from 'react'

type Props = {
  prompt: string
  onSubmit: (word: string) => Promise<void>
}

export function ParticipantWordCloud({ prompt, onSubmit }: Props) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    const word = input.trim()
    if (!word) return
    setLoading(true)
    await onSubmit(word)
    setSubmitted((prev) => [...prev, word])
    setInput('')
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
      <p className="text-zinc-500 text-sm text-center">You can submit as many words as you like.</p>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
          placeholder="Type a word..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          maxLength={60}
          autoFocus
          disabled={loading}
        />
        <button
          onClick={handleAdd}
          disabled={loading || !input.trim()}
          className="bg-[#FFE600] text-zinc-900 font-black px-5 py-3 rounded-xl hover:bg-[#FFD900] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>

      {submitted.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {submitted.map((word, i) => (
            <span key={i} className="bg-zinc-800 text-zinc-300 text-sm px-3 py-1 rounded-full">
              ✓ {word}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
