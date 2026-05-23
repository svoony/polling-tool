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

export const TYPE_LABELS: Record<Question['type'], string> = {
  word_cloud: 'Word Cloud',
  token_allocation: 'Token Allocation',
  pictionary: 'Pictionary',
  coord_plot: 'Coordinate Plot',
  ranking: 'Ranking',
  react: 'React',
  multiple_choice: 'Multiple Choice',
}
