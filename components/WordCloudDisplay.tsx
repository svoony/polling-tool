type Props = {
  answers: Record<string, string>
}

// Deterministic pseudo-random from a string so positions are stable across renders
function seededRandom(word: string, seed: number): number {
  let hash = seed * 31
  for (let i = 0; i < word.length; i++) {
    hash = ((hash << 5) - hash) + word.charCodeAt(i)
    hash = hash & hash
  }
  return (Math.abs(hash) % 1000) / 1000
}

export function WordCloudDisplay({ answers }: Props) {
  const words = Object.values(answers)

  const freq = words.reduce<Record<string, number>>((acc, word) => {
    const w = word.toLowerCase().trim()
    if (w) acc[w] = (acc[w] || 0) + 1
    return acc
  }, {})

  const max = Math.max(...Object.values(freq), 1)
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) {
    return <p className="text-zinc-500 text-center py-8">Waiting for answers...</p>
  }

  return (
    <div className="flex flex-wrap items-center justify-center">
      {sorted.map(([word, count]) => {
        const mt = seededRandom(word, 2) * 20             // 0–20px top margin
        const mb = seededRandom(word, 3) * 20             // 0–20px bottom margin
        const mx = seededRandom(word, 4) * 16             // 0–16px horizontal margin
        const fontSize = 0.85 + (count / max) * 1.6      // 0.85–2.45rem

        return (
          <span
            key={word}
            style={{
              fontSize: `${fontSize}rem`,
              margin: `${mt}px ${mx}px ${mb}px`,
              display: 'inline-block',
            }}
            className="bg-[#FFE600] text-zinc-900 font-black px-3 py-1 rounded-full whitespace-nowrap"
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}
