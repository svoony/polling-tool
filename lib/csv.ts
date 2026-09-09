import type { Question } from './questions'

// Every collected result, keyed the same way the host page stores them: questionIndex → data.
export type ResultsSnapshot = {
  wordCloudWords: Record<number, string[]>
  tokenTotals: Record<number, Record<string, number>>
  coordPoints: Record<number, Array<{ x: number; y: number }>>
  rankingScores: Record<number, Record<string, number>>
  reactionCounts: Record<number, Record<string, Record<string, number>>>
  mcVotes: Record<number, Record<string, number>>
}

const HEADER = ['question_number', 'question_type', 'prompt', 'item', 'sub_item', 'metric', 'value'] as const

type Row = [number, Question['type'], string, string, string, string, number]

// A leading =, +, -, @ (or tab/CR) makes Excel treat a cell as a formula. Prompts and
// word-cloud answers are participant-typed, so neutralise them with a leading quote.
function escapeText(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

function toLine(cells: readonly (string | number)[]): string {
  return cells.map((c) => (typeof c === 'number' ? String(c) : escapeText(c))).join(',')
}

/**
 * Flattens session results into one tidy CSV — a row per (question, item, metric).
 *
 * Pictionary questions are deliberately omitted: their answers are canvas images,
 * which have no meaningful text representation in a spreadsheet.
 */
export function buildResultsCsv(questions: Question[], data: ResultsSnapshot): string {
  const rows: Row[] = []

  questions.forEach((q, i) => {
    const n = i + 1
    const add = (item: string, subItem: string, metric: string, value: number) =>
      rows.push([n, q.type, q.prompt, item, subItem, metric, value])

    if (q.type === 'pictionary') return // drawings aren't exportable — skip entirely

    if (q.type === 'word_cloud') {
      // Match the cloud's own aggregation: lowercased, trimmed, blanks dropped.
      const freq: Record<string, number> = {}
      for (const raw of data.wordCloudWords[i] ?? []) {
        const word = raw.toLowerCase().trim()
        if (word) freq[word] = (freq[word] ?? 0) + 1
      }
      Object.entries(freq)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .forEach(([word, count]) => add(word, '', 'count', count))
      return
    }

    if (q.type === 'token_allocation') {
      const totals = data.tokenTotals[i] ?? {}
      q.buckets.forEach((bucket) => add(bucket, '', 'tokens', totals[bucket] ?? 0))
      return
    }

    if (q.type === 'coord_plot') {
      // One row per axis so the value column stays numeric and pivots cleanly.
      // Answers are anonymous, so each point is labelled by its arrival order.
      ;(data.coordPoints[i] ?? []).forEach((p, pIdx) => {
        const label = `response ${pIdx + 1}`
        add(label, '', 'x', p.x)
        add(label, '', 'y', p.y)
      })
      return
    }

    if (q.type === 'ranking') {
      const scores = data.rankingScores[i] ?? {}
      q.options.forEach((opt) => add(opt, '', 'score', scores[opt] ?? 0))
      return
    }

    if (q.type === 'react') {
      const counts = data.reactionCounts[i] ?? {}
      q.items.forEach((item) => {
        Object.entries(counts[item] ?? {})
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .forEach(([emoji, count]) => add(item, emoji, 'count', count))
      })
      return
    }

    if (q.type === 'multiple_choice') {
      const votes = data.mcVotes[i] ?? {}
      // Multi-select counts are selections, not one-per-person votes — name them accordingly
      const metric = q.multiSelect ? 'selections' : 'votes'
      q.options.forEach((opt) => add(opt, '', metric, votes[opt] ?? 0))
    }
  })

  return [toLine(HEADER), ...rows.map(toLine)].join('\r\n')
}
