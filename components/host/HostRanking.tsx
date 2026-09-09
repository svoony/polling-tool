'use client'

type Props = {
  prompt: string
  options: string[]
  // scores[option] = aggregate point total
  scores: Record<string, number>
}

export function HostRanking({ prompt, options, scores }: Props) {
  // Sort options by score descending
  const sorted = [...options].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
  const maxScore = Math.max(...sorted.map((o) => scores[o] ?? 0), 1)
  const totalSubmissions = Math.round(
    options.reduce((sum, o) => sum + (scores[o] ?? 0), 0) / options.length
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <h2 className="text-white font-black text-2xl">{prompt}</h2>
        <span className="text-ey-subtle text-sm shrink-0 ml-4">
          {totalSubmissions} response{totalSubmissions !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((option, i) => {
          const score = scores[option] ?? 0
          const pct = (score / maxScore) * 100
          return (
            <div key={option} className="flex flex-col gap-1">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-white font-bold">
                  <span className="text-ey-yellow mr-2">#{i + 1}</span>
                  {option}
                </span>
                <span className="text-ey-subtle text-xs">{score} pts</span>
              </div>
              <div className="h-7 bg-ey-field rounded-none overflow-hidden">
                <div
                  className="h-full bg-ey-yellow rounded-none transition-all duration-500"
                  style={{ width: `${pct}%`, minWidth: score > 0 ? '4px' : '0' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
