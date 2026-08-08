'use client'

import { useState } from 'react'

type Props = {
  prompt: string
  options: string[]
  multiSelect?: boolean
  onSubmit: (options: string[]) => Promise<void>
}

export function ParticipantMultipleChoice({ prompt, options, multiSelect = false, onSubmit }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function toggle(option: string) {
    if (!multiSelect) {
      setSelected([option])
      return
    }
    setSelected((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]))
  }

  async function handleSubmit() {
    if (selected.length === 0 || loading) return
    setLoading(true)
    await onSubmit(selected)
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
      {multiSelect && !submitted && (
        <p className="text-zinc-400 text-sm text-center -mt-2">Pick as many as you like.</p>
      )}

      {submitted ? (
        <p className="text-[#FFE600] font-black text-center text-lg">Response submitted ✓</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => toggle(option)}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors border-2 ${
                  selected.includes(option)
                    ? 'bg-[#FFE600] text-zinc-900 border-[#FFE600]'
                    : 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={selected.length === 0 || loading}
            className="w-full bg-[#FFE600] text-zinc-900 font-black text-lg rounded-xl py-3 hover:bg-[#FFD900] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </>
      )}
    </div>
  )
}
