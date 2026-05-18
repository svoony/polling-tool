export const EVENTS = {
  QUESTION_START: 'question:start',
  ANSWER_SUBMIT: 'answer:submit',
  QUESTION_END: 'question:end',
} as const

export type QuestionPayload = {
  questionId: string
  type: 'word_cloud'
  prompt: string
}

export type AnswerPayload = {
  questionId: string
  answer: string
  participantName: string
}
