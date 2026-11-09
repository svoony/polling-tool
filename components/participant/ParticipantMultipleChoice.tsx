'use client'

import { useState } from 'react'
import { OTHER_MAX_LENGTH } from '@/lib/questions'

type Props = {
  prompt: string
  options: string[]
  multiSelect?: boolean
  /** Adds an "Other" choice with a text box for the participant's own answer */
  allowOther?: boolean
  onSubmit: (options: string[], otherText?: string) => Promise<void>
}

export function ParticipantMultipleChoice({
  prompt,
  options,
  multiSelect = false,
  allowOther = false,
  onSubmit,
}: Props) {
  const [selected, setSelected] = useState<string[]>([])
  // "Other" is tracked apart from `selected` so a host option literally named "Other" can't collide with it
  const [otherSelected, setOtherSelected] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function toggle(option: string) {
    if (!multiSelect) {
      setSelected([option])
      setOtherSelected(false)
      return
    }
    setSelected((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]))
  }

  function toggleOther() {
    if (!multiSelect) {
      setSelected([])
      setOtherSelected(true)
      return
    }
    setOtherSelected((prev) => !prev)
  }

  const trimmedOther = otherText.trim()
  // Picking "Other" only counts once something has been written in
  const canSubmit = (selected.length > 0 || otherSelected) && (!otherSelected || trimmedOther.length > 0)

  async function handleSubmit() {
    if (!canSubmit || loading) return
    setLoading(true)
    await onSubmit(selected, otherSelected ? trimmedOther : undefined)
    setSubmitted(true)
    setLoading(false)
  }

  const choiceClass = (active: boolean) =>
    `w-full text-left px-4 py-3 rounded-none font-bold transition-colors border-2 ${
      active
        ? 'bg-ey-yellow text-ey-ink border-ey-yellow'
        : 'bg-ey-field text-white border-ey-line-strong hover:bg-ey-line hover:border-ey-line-strong'
    }`

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
      {multiSelect && !submitted && (
        <p className="text-ey-muted text-sm text-center -mt-2">Pick as many as you like.</p>
      )}

      {submitted ? (
        <p className="text-ey-yellow font-black text-center text-lg">Response submitted ✓</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {options.map((option) => (
              <button key={option} onClick={() => toggle(option)} className={choiceClass(selected.includes(option))}>
                {option}
              </button>
            ))}

            {allowOther && (
              <>
                <button onClick={toggleOther} className={choiceClass(otherSelected)}>
                  Other
                </button>
                {otherSelected && (
                  <input
                    autoFocus
                    className="w-full bg-ey-field border border-ey-line-strong rounded-none px-4 py-3 text-white placeholder:text-ey-subtle focus:outline-none focus:ring-2 focus:ring-ey-yellow"
                    placeholder="Type your answer"
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit()
                    }}
                    maxLength={OTHER_MAX_LENGTH}
                  />
                )}
              </>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="w-full bg-ey-yellow text-ey-ink font-black text-lg rounded-none py-3 hover:bg-ey-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </>
      )}
    </div>
  )
}
