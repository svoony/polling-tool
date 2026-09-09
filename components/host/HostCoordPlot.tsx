'use client'

type Point = { x: number; y: number }

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
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <h2 className="text-white font-black text-2xl">{prompt}</h2>
        <span className="text-ey-subtle text-sm shrink-0 ml-4">
          {points.length} response{points.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Fill the available width — height-capped via min(100%, 70vh) so the square never overflows the viewport */}
      <div className="w-full mx-auto" style={{ maxWidth: 'min(100%, 70vh)' }}>

        {/* Row: Y labels (left, outside) + Plot */}
        <div className="flex gap-3 items-stretch">
          {/* Y labels column */}
          <div className="flex flex-col justify-between shrink-0 w-16 text-right">
            <span className="text-ey-muted text-sm leading-tight break-words">{yHigh}</span>
            <span className="text-ey-muted text-sm leading-tight break-words">{yLow}</span>
          </div>

          {/* SVG Plot */}
          <div className="flex-1 border border-ey-line-strong rounded-none overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="#23232d" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="#4d4d59" strokeWidth="0.5" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#4d4d59" strokeWidth="0.5" />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x * 100}
                  cy={(1 - p.y) * 100}
                  r="2.5"
                  fill="#FFE600"
                  fillOpacity="0.85"
                  stroke="#2e2e38"
                  strokeWidth="0.8"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* X labels row — below plot, offset by Y column width */}
        <div className="flex gap-3 mt-1">
          <div className="w-16 shrink-0" />{/* spacer matching Y column */}
          <div className="flex-1 flex justify-between">
            <span className="text-ey-muted text-sm leading-tight">{xLow}</span>
            <span className="text-ey-muted text-sm leading-tight text-right">{xHigh}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
