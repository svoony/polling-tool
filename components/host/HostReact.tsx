'use client'

const EMOJIS = ['❤️', '👍', '👎', '❓']

type Props = {
  prompt: string
  items: string[]
  // counts[item][emoji] = reaction count
  counts: Record<string, Record<string, number>>
}

export function HostReact({ prompt, items, counts }: Props) {
  const totalReactions = Object.values(counts).reduce(
    (sum, emojiMap) => sum + Object.values(emojiMap).reduce((s, n) => s + n, 0),
    0
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <h2 className="text-white font-black text-2xl">{prompt}</h2>
        <span className="text-zinc-500 text-sm shrink-0 ml-4">
          {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item} className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-white font-bold">{item}</p>
            <div className="flex gap-6">
              {EMOJIS.map((emoji) => (
                <div key={emoji} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-[#FFE600] font-black text-xl leading-none">
                    {counts[item]?.[emoji] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
