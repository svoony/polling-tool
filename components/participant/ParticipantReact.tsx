'use client'

import { useState } from 'react'

const EMOJIS = ['❤️', '👍', '👎', '❓'] as const

type Props = {
  prompt: string
  items: string[]
  onSubmit: (reactions: Array<{ item: string; emoji: string }>) => Promise<void>
}

export function ParticipantReact({ prompt, items, onSubmit }: Props) {
  // selected[item][emoji] = toggled on/off
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function toggle(item: string, emoji: string) {
    setSelected((prev) => ({
      ...prev,
      [item]: { ...(prev[item] ?? {}), [emoji]: !(prev[item]?.[emoji]) },
    }))
  }

  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    const reactions: Array<{ item: string; emoji: string }> = []
    for (const item of items) {
      for (const emoji of EMOJIS) {
        if (selected[item]?.[emoji]) reactions.push({ item, emoji })
      }
    }
    await onSubmit(reactions)
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4 items-center">
        <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
        <p className="text-[#FFE600] font-black text-center text-lg">Reactions submitted ✓</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
      <p className="text-zinc-400 text-sm text-center">Tap any emoji to react to each item.</p>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item} className="bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-white font-bold text-sm">{item}</p>
            <div className="flex gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggle(item, emoji)}
                  className={`flex-1 py-2 rounded-lg text-xl transition-all ${
                    selected[item]?.[emoji]
                      ? 'bg-[#FFE600] scale-110 shadow-md'
                      : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-[#FFE600] text-zinc-900 font-black text-lg rounded-xl py-3 hover:bg-[#FFD900] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Submit
      </button>
    </div>
  )
}
