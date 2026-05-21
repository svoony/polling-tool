'use client'

type Point = { x: number; y: number; name: string }

type Props = {
  prompt: string
  xLow: string
  xHigh: string
  yLow: string
  yHigh: string
  points: Point[]
}

export function HostCoordPlot({ prompt, xLow, xHigh, yLow, yHigh, points }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <h2 className="text-white font-black text-2xl">{prompt}</h2>
        <span className="text-zinc-500 text-sm shrink-0 ml-4">
          {points.length} response{points.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Y-high label */}
      <div className="flex justify-center">
        <span className="text-zinc-400 text-sm">{yHigh} ↑</span>
      </div>

      {/* Plot area */}
      <div
        className="w-full border border-zinc-700 rounded-xl overflow-hidden"
        style={{ aspectRatio: '1 / 1' }}
      >
        <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {/* Background */}
          <rect width="100" height="100" fill="#27272a" />
          {/* Grid lines */}
          <line x1="50" y1="0" x2="50" y2="100" stroke="#3f3f46" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#3f3f46" strokeWidth="0.5" />
          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x * 100}
              cy={(1 - p.y) * 100}
              r="2.5"
              fill="#FFE600"
              fillOpacity="0.85"
              stroke="#18181b"
              strokeWidth="0.8"
            />
          ))}
        </svg>
      </div>

      {/* X / Y-low labels */}
      <div className="flex justify-between">
        <span className="text-zinc-400 text-sm">{xLow}</span>
        <span className="text-zinc-400 text-sm">↓ {yLow}</span>
        <span className="text-zinc-400 text-sm">{xHigh}</span>
      </div>
    </div>
  )
}
