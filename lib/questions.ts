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

export type Question = WordCloudQuestion | TokenAllocationQuestion | PictionaryQuestion

export const TYPE_LABELS: Record<Question['type'], string> = {
  word_cloud: 'Word Cloud',
  token_allocation: 'Token Allocation',
  pictionary: 'Pictionary',
}
