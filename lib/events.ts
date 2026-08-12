import type { Question } from './questions'

export const EVENTS = {
  QUESTION_START: 'question:start',
  ANSWER_SUBMIT:  'answer:submit',
  SESSION_END:    'session:end',
  SESSION_RESET:  'session:reset',
} as const

/**
 * Realtime topics, one set per session. A topic delivers every message to every
 * subscriber, so the two directions must not share one — keep them split:
 *
 *  - `presence` / `game`: host → participants. Everyone subscribes; fan-out is the point.
 *  - `answers`: participants → host. ONLY the host (or an extra results screen) subscribes.
 *    Participants publish without subscribing, so an answer costs one delivery instead of
 *    one per phone in the room.
 */
export const topics = {
  presence: (code: string) => `room:${code}`,
  game:     (code: string) => `game:${code}`,
  answers:  (code: string) => `answers:${code}`,
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

export type CoordPlotAnswerPayload = {
  type: 'coord_plot'
  questionId: string
  x: number
  y: number
  participantName: string
}

export type RankingAnswerPayload = {
  type: 'ranking'
  questionId: string
  orderedOptions: string[]
  participantName: string
}

export type ReactAnswerPayload = {
  type: 'react'
  questionId: string
  reactions: Array<{ item: string; emoji: string }>
  participantName: string
}

export type MultipleChoiceAnswerPayload = {
  type: 'multiple_choice'
  questionId: string
  /** One entry for a single-answer question, one or more when the question is multi-select */
  options: string[]
  participantName: string
}

export type AnswerPayload =
  | WordCloudAnswerPayload
  | TokenAllocationAnswerPayload
  | PictionaryAnswerPayload
  | CoordPlotAnswerPayload
  | RankingAnswerPayload
  | ReactAnswerPayload
  | MultipleChoiceAnswerPayload
