'use client'

type Props = {
  prompt: string
  options: string[]
  votes: Record<string, number>
}

export function HostMultipleChoice({ prompt, options, votes }: Props) {
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0)
  const maxVotes = Math.max(...options.map((o) => votes[o] ?? 0), 1)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <h2 className="text-white font-black text-2xl">{prompt}</h2>
        <span className="text-zinc-500 text-sm shrink-0 ml-4">
          {totalVotes} response{totalVotes !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const count = votes[option] ?? 0
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0
          const barPct = (count / maxVotes) * 100
          return (
            <div key={option} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-200 text-sm font-bold">{option}</span>
                <span className="text-zinc-400 text-sm shrink-0">
                  {count} {totalVotes > 0 && `(${Math.round(pct)}%)`}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full bg-[#FFE600] rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
