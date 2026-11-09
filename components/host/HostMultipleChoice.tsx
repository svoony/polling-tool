'use client'

import { groupWriteIns } from '@/lib/questions'

type Props = {
  prompt: string
  options: string[]
  votes: Record<string, number>
  multiSelect?: boolean
  /** Shows an "Other" bar plus the write-ins themselves */
  allowOther?: boolean
  writeIns?: string[]
}

export function HostMultipleChoice({
  prompt,
  options,
  votes,
  multiSelect = false,
  allowOther = false,
  writeIns = [],
}: Props) {
  // "Other" is counted from the write-ins, never from `votes`, so a listed option named "Other" stays separate
  const rows = options.map((o) => ({ key: `opt:${o}`, label: o, count: votes[o] ?? 0 }))
  if (allowOther) rows.push({ key: 'other', label: 'Other', count: writeIns.length })

  const totalVotes = rows.reduce((a, r) => a + r.count, 0)
  const maxVotes = Math.max(...rows.map((r) => r.count), 1)
  // With multi-select one person contributes several votes, so a share of the total
  // no longer reads as "share of the room" — show plain counts instead.
  const showPct = !multiSelect && totalVotes > 0
  const grouped = groupWriteIns(writeIns)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <h2 className="text-white font-black text-2xl">{prompt}</h2>
        <span className="text-ey-subtle text-sm shrink-0 ml-4">
          {multiSelect
            ? `${totalVotes} selection${totalVotes !== 1 ? 's' : ''}`
            : `${totalVotes} response${totalVotes !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map(({ key, label, count }) => {
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0
          const barPct = (count / maxVotes) * 100
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className={`text-sm font-bold ${key === 'other' ? 'text-ey-muted italic' : 'text-white'}`}>
                  {label}
                </span>
                <span className="text-ey-muted text-sm shrink-0">
                  {count} {showPct && `(${Math.round(pct)}%)`}
                </span>
              </div>
              <div className="w-full bg-ey-field rounded-full h-5 overflow-hidden">
                <div
                  className="h-full bg-ey-yellow rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {allowOther && grouped.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-ey-line pt-4">
          <p className="text-ey-muted text-sm">Write-in answers</p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {grouped.map(({ text, count }) => (
              <span
                key={text.toLowerCase()}
                className="bg-ey-field border border-ey-line-strong text-white text-sm px-3 py-1 rounded-none"
              >
                {text}
                {count > 1 && <span className="text-ey-yellow font-bold ml-2">×{count}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
