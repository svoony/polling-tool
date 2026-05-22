'use client'

import { useRef, useState } from 'react'

type Props = {
  prompt: string
  xLow: string
  xHigh: string
  yLow: string
  yHigh: string
  onSubmit: (x: number, y: number) => Promise<void>
}

export function ParticipantCoordPlot({ prompt, xLow, xHigh, yLow, yHigh, onSubmit }: Props) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function getCoords(clientX: number, clientY: number) {
    const rect = plotRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height)),
    }
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (submitted) return
    setPoint(getCoords(e.clientX, e.clientY))
  }

  function handleTouch(e: React.TouchEvent<HTMLDivElement>) {
    e.preventDefault()
    if (submitted) return
    const t = e.touches[0]
    setPoint(getCoords(t.clientX, t.clientY))
  }

  async function handleSubmit() {
    if (!point || loading) return
    setLoading(true)
    await onSubmit(point.x, point.y)
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>

      {submitted ? (
        <p className="text-[#FFE600] font-black text-center text-lg">Response submitted ✓</p>
      ) : (
        <p className="text-zinc-400 text-sm text-center">Tap the graph to place yourself.</p>
      )}

      {/* Row: Y labels (left, outside) + Plot */}
      <div className="flex gap-2 items-stretch">
        {/* Y labels column — spans the full height of the plot */}
        <div className="flex flex-col justify-between shrink-0 w-14 text-right">
          <span className="text-zinc-400 text-xs leading-tight break-words">{yHigh}</span>
          <span className="text-zinc-400 text-xs leading-tight break-words">{yLow}</span>
        </div>

        {/* Plot */}
        <div
          ref={plotRef}
          className="flex-1 aspect-square relative border border-zinc-600 rounded-xl bg-zinc-800"
          style={{ touchAction: 'none', cursor: submitted ? 'default' : 'crosshair' }}
          onClick={handleClick}
          onTouchStart={handleTouch}
        >
          {/* Centre grid lines */}
          <div className="absolute top-0 bottom-0 left-1/2 border-l border-zinc-700 pointer-events-none" />
          <div className="absolute left-0 right-0 top-1/2 border-t border-zinc-700 pointer-events-none" />

          {/* Dot */}
          {point && (
            <div
              className="absolute w-5 h-5 bg-[#FFE600] rounded-full border-2 border-zinc-900 shadow-lg pointer-events-none"
              style={{
                left: `${point.x * 100}%`,
                top: `${(1 - point.y) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </div>
      </div>

      {/* X labels row — below plot, offset by Y column width */}
      <div className="flex gap-2">
        <div className="w-14 shrink-0" />{/* spacer matching Y column */}
        <div className="flex-1 flex justify-between">
          <span className="text-zinc-400 text-xs leading-tight">{xLow}</span>
          <span className="text-zinc-400 text-xs leading-tight text-right">{xHigh}</span>
        </div>
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!point || loading}
          className="w-full bg-[#FFE600] text-zinc-900 font-black text-lg rounded-xl py-3 hover:bg-[#FFD900] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      )}
    </div>
  )
}
