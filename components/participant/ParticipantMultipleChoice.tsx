'use client'

import { useState } from 'react'

type Props = {
  prompt: string
  options: string[]
  onSubmit: (option: string) => Promise<void>
}

export function ParticipantMultipleChoice({ prompt, options, onSubmit }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!selected || loading) return
    setLoading(true)
    await onSubmit(selected)
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>

      {submitted ? (
        <p className="text-[#FFE600] font-black text-center text-lg">Response submitted ✓</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => setSelected(option)}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors border-2 ${
                  selected === option
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
            disabled={!selected || loading}
            className="w-full bg-[#FFE600] text-zinc-900 font-black text-lg rounded-xl py-3 hover:bg-[#FFD900] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </>
      )}
    </div>
  )
}
