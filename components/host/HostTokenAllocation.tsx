type Props = {
  prompt: string
  buckets: string[]
  totals: Record<string, number>  // bucketName -> sum of all tokens allocated to it
  participantCount: number
}

export function HostTokenAllocation({ prompt, buckets, totals, participantCount }: Props) {
  const maxPossible = Math.max(participantCount * 100, 1)

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-white font-bold text-xl">{prompt}</h2>
      <div className="flex flex-col gap-4">
        {buckets.map((bucket) => {
          const total = totals[bucket] ?? 0
          const pct = Math.min((total / maxPossible) * 100, 100)
          return (
            <div key={bucket} className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-white font-bold">{bucket}</span>
                <span className="text-ey-yellow font-black">{total} tokens</span>
              </div>
              <div className="bg-ey-field rounded-full h-5 overflow-hidden">
                <div
                  className="bg-ey-yellow h-5 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
