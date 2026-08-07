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
  if (q.type === 'multiple_choice') return q.options.join(' · ')
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
