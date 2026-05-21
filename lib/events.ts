import type { Question } from './questions'

export const EVENTS = {
  QUESTION_START: 'question:start',
  ANSWER_SUBMIT:  'answer:submit',
  SESSION_END:    'session:end',
} as const

// Sent by host when starting or advancing to a question
export type QuestionStartPayload = Question & {
  questionIndex: number
  totalQuestions: number
}

// Answer variants — discriminated by type
export type WordCloudAnswerPayload = {
  type: 'word_cloud'
  questionId: string
  word: string
  participantName: string
}

export type TokenAllocationAnswerPayload = {
  type: 'token_allocation'
  questionId: string
  allocations: Record<string, number>
  participantName: string
}

export type PictionaryAnswerPayload = {
  type: 'pictionary'
  questionId: string
  imageDataUrl: string
  participantName: string
}

export type AnswerPayload =
  | WordCloudAnswerPayload
  | TokenAllocationAnswerPayload
  | PictionaryAnswerPayload
