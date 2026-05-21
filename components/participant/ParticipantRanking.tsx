'use client'

import { useState } from 'react'

type Props = {
  prompt: string
  options: string[]
  onSubmit: (orderedOptions: string[]) => Promise<void>
}

export function ParticipantRanking({ prompt, options, onSubmit }: Props) {
  const [ordered, setOrdered] = useState([...options])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function move(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= ordered.length) return
    const next = [...ordered]
    ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
    setOrdered(next)
  }

  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    await onSubmit(ordered)
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
        <p className="text-[#FFE600] font-black text-center text-lg">Ranking submitted ✓</p>
        <div className="flex flex-col gap-2 mt-1">
          {ordered.map((opt, i) => (
            <div key={opt} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
              <span className="text-[#FFE600] font-black text-sm w-7">#{i + 1}</span>
              <span className="text-white text-sm">{opt}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
      <p className="text-zinc-400 text-sm text-center">Use the arrows to rank — #1 is your top pick.</p>

      <div className="flex flex-col gap-2">
        {ordered.map((opt, i) => (
          <div key={opt} className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2.5">
            <span className="text-[#FFE600] font-black text-sm w-7 shrink-0">#{i + 1}</span>
            <span className="text-white text-sm flex-1">{opt}</span>
            <div className="flex flex-col">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-zinc-400 hover:text-white disabled:opacity-20 text-xs leading-tight px-1 py-0.5"
              >
                ▲
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === ordered.length - 1}
                className="text-zinc-400 hover:text-white disabled:opacity-20 text-xs leading-tight px-1 py-0.5"
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-[#FFE600] text-zinc-900 font-black text-lg rounded-xl py-3 hover:bg-[#FFD900] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Submit Ranking
      </button>
    </div>
  )
}
