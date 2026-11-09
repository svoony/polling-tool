export type WordCloudQuestion = {
  id: string
  type: 'word_cloud'
  prompt: string
}

export type TokenAllocationQuestion = {
  id: string
  type: 'token_allocation'
  prompt: string
  buckets: string[]
}

export type PictionaryQuestion = {
  id: string
  type: 'pictionary'
  prompt: string
}

export type CoordPlotQuestion = {
  id: string
  type: 'coord_plot'
  prompt: string
  xLow: string
  xHigh: string
  yLow: string
  yHigh: string
}

export type RankingQuestion = {
  id: string
  type: 'ranking'
  prompt: string
  options: string[]
}

export type ReactQuestion = {
  id: string
  type: 'react'
  prompt: string
  items: string[]
}

export type MultipleChoiceQuestion = {
  id: string
  type: 'multiple_choice'
  prompt: string
  options: string[]
  /** When true participants may pick several options. Absent on questions built before this existed. */
  multiSelect?: boolean
  /** When true an extra "Other" choice lets participants type their own answer. Absent on older questions. */
  allowOther?: boolean
}

/** Max length of a participant's "Other" write-in — enforced on the phone and again on the host. */
export const OTHER_MAX_LENGTH = 80

/** Collapses write-ins that differ only by case/spacing; keeps the first spelling seen. Most common first. */
export function groupWriteIns(writeIns: string[]): Array<{ text: string; count: number }> {
  const groups = new Map<string, { text: string; count: number }>()
  for (const raw of writeIns) {
    const text = raw.trim().replace(/\s+/g, ' ')
    if (!text) continue
    const key = text.toLowerCase()
    const g = groups.get(key)
    if (g) g.count++
    else groups.set(key, { text, count: 1 })
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
}

export type Question =
  | WordCloudQuestion
  | TokenAllocationQuestion
  | PictionaryQuestion
  | CoordPlotQuestion
  | RankingQuestion
  | ReactQuestion
  | MultipleChoiceQuestion

/** One-line summary of a question's options/labels — '' for types that have none. */
export function questionDetail(q: Question): string {
  if (q.type === 'token_allocation') return q.buckets.join(' · ')
  if (q.type === 'coord_plot') return `X: ${q.xLow} → ${q.xHigh} · Y: ${q.yLow} → ${q.yHigh}`
  if (q.type === 'ranking') return q.options.join(' · ')
  if (q.type === 'react') return q.items.join(' · ')
  if (q.type === 'multiple_choice') {
    const options = q.allowOther ? [...q.options, 'Other (write-in)'] : q.options
    return options.join(' · ') + (q.multiSelect ? '  —  multi-select' : '')
  }
  return ''
}

export const TYPE_LABELS: Record<Question['type'], string> = {
  word_cloud: 'Word Cloud',
  token_allocation: 'Token Allocation',
  pictionary: 'Pictionary',
  coord_plot: 'Coordinate Plot',
  ranking: 'Ranking',
  react: 'React',
  multiple_choice: 'Multiple Choice',
}
