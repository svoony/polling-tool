'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  prompt: string
  onSubmit: (imageDataUrl: string) => Promise<void>
}

export function ParticipantPictionary({ prompt, onSubmit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initCanvas()
  }, [])

  function initCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#FFE600'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  function getXY(clientX: number, clientY: number) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    isDrawingRef.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getXY(e.clientX, e.clientY)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getXY(e.clientX, e.clientY)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    isDrawingRef.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const t = e.touches[0]
    const { x, y } = getXY(t.clientX, t.clientY)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const t = e.touches[0]
    const { x, y } = getXY(t.clientX, t.clientY)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function endDraw() {
    isDrawingRef.current = false
  }

  async function submitDrawing() {
    const canvas = canvasRef.current!
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.5)
    setLoading(true)
    await onSubmit(imageDataUrl)
    setSubmittedCount((c) => c + 1)
    setLoading(false)
    initCanvas()
  }

  return (
    <div className="flex flex-col gap-4 items-center">
      <h2 className="text-white font-black text-2xl text-center">{prompt}</h2>
      <p className="text-zinc-500 text-sm text-center">Draw below, then submit. You can submit multiple drawings.</p>

      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="rounded-xl border-2 border-zinc-700 cursor-crosshair"
        style={{ touchAction: 'none', width: '100%', maxWidth: '300px', aspectRatio: '1' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={endDraw}
      />

      <div className="flex gap-3 w-full max-w-[300px]">
        <button
          onClick={initCanvas}
          className="flex-1 bg-zinc-700 text-white font-bold py-2 rounded-xl hover:bg-zinc-600 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={submitDrawing}
          disabled={loading}
          className="flex-1 bg-[#FFE600] text-zinc-900 font-black py-2 rounded-xl hover:bg-[#FFD900] disabled:opacity-40 transition-colors"
        >
          {loading ? 'Sending...' : 'Submit'}
        </button>
      </div>

      {submittedCount > 0 && (
        <p className="text-zinc-400 text-sm">
          {submittedCount} drawing{submittedCount !== 1 ? 's' : ''} submitted ✓
        </p>
      )}
    </div>
  )
}
