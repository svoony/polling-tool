type Props = {
  answers: Record<string, string> // participantName -> answer
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
    return <p className="text-gray-400 text-center py-4">Waiting for answers...</p>
  }

  return (
    <div className="flex flex-wrap gap-3 items-center justify-center p-4 min-h-24">
      {sorted.map(([word, count]) => (
        <span
          key={word}
          className="font-bold"
          style={{ fontSize: `${0.875 + (count / max) * 1.75}rem` }}
        >
          {word}
        </span>
      ))}
    </div>
  )
}
