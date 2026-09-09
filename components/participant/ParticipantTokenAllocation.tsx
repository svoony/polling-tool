'use client'

import { useState } from 'react'

type Props = {
  prompt: string
  buckets: string[]
  onSubmit: (allocations: Record<string, number>) => Promise<void>
}

export function ParticipantTokenAllocation({ prompt, buckets, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(buckets.map((b) => [b, '']))
  )
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const total = Object.values(values).reduce((sum, v) => sum + (parseInt(v) || 0), 0)
  const remaining = 100 - total
  const isValid = total === 100

  async function handleSubmit() {
    if (!isValid || loading) return
    setLoading(true)
    const allocations = Object.fromEntries(
      buckets.map((b) => [b, parseInt(values[b]) || 0])
    )
    await onSubmit(allocations)
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
        <p className="text-ey-yellow font-black text-center text-xl">Tokens allocated!</p>
        <div className="flex flex-col gap-2 mt-2">
          {buckets.map((b) => (
            <div key={b} className="flex justify-between text-sm">
              <span className="text-ey-muted">{b}</span>
              <span className="text-white font-bold">{values[b] || 0} tokens</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
      <p className="text-ey-muted text-sm text-center">Distribute exactly 100 tokens across the buckets below.</p>

      <div className="flex flex-col gap-3">
        {buckets.map((bucket) => (
          <div key={bucket} className="flex items-center gap-3">
            <label className="text-white text-sm flex-1">{bucket}</label>
            <input
              type="number"
              min="0"
              max="100"
              className="w-20 bg-ey-field border border-ey-line-strong rounded-none px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-ey-yellow"
              value={values[bucket]}
              onChange={(e) => setValues((prev) => ({ ...prev, [bucket]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <p className={`text-center font-bold text-sm ${
        remaining === 0 ? 'text-ey-yellow' :
        remaining < 0 ? 'text-red-400' :
        'text-ey-muted'
      }`}>
        {remaining > 0
          ? `${remaining} tokens remaining`
          : remaining === 0
          ? 'All 100 tokens allocated!'
          : `${Math.abs(remaining)} tokens over budget`}
      </p>

      <button
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="w-full bg-ey-yellow text-ey-ink font-black text-lg rounded-none py-3 hover:bg-ey-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Submit
      </button>
    </div>
  )
}
