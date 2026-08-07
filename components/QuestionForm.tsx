'use client'

import { TYPE_LABELS, type Question } from '@/lib/questions'

type QType = Question['type']

// Editable shape of a question. Fields for every type live side by side so switching
// type is cheap; questionFromDraft() picks out only the ones that type needs.
export type QuestionDraft = {
  type: QType
  prompt: string
  buckets: string[]
  xLow: string
  xHigh: string
  yLow: string
  yHigh: string
  rankOptions: string[]
  reactItems: string[]
  mcOptions: string[]
}

export const QUESTION_TYPES: QType[] = [
  'word_cloud',
  'token_allocation',
  'pictionary',
  'coord_plot',
  'ranking',
  'react',
  'multiple_choice',
]

const PLACEHOLDERS: Record<QType, string> = {
  word_cloud: 'e.g. Describe today in one word',
  token_allocation: 'e.g. How would you allocate your week?',
  pictionary: 'e.g. Draw a cat',
  coord_plot: 'e.g. Where do you fall on this scale?',
  ranking: 'e.g. Rank these from best to worst',
  react: 'e.g. React to each of these items',
  multiple_choice: 'e.g. Which option do you prefer?',
}

// Types where Enter in the prompt field submits (the others still need list fields filled in)
const SUBMIT_ON_ENTER: QType[] = ['word_cloud', 'pictionary']

export function emptyDraft(type: QType): QuestionDraft {
  return {
    type,
    prompt: '',
    buckets: ['', ''],
    xLow: '',
    xHigh: '',
    yLow: '',
    yHigh: '',
    rankOptions: ['', ''],
    reactItems: [''],
    mcOptions: ['', ''],
  }
}

export function draftFromQuestion(q: Question): QuestionDraft {
  const draft = emptyDraft(q.type)
  draft.prompt = q.prompt
  if (q.type === 'token_allocation') draft.buckets = [...q.buckets]
  if (q.type === 'coord_plot') {
    draft.xLow = q.xLow
    draft.xHigh = q.xHigh
    draft.yLow = q.yLow
    draft.yHigh = q.yHigh
  }
  if (q.type === 'ranking') draft.rankOptions = [...q.options]
  if (q.type === 'react') draft.reactItems = [...q.items]
  if (q.type === 'multiple_choice') draft.mcOptions = [...q.options]
  return draft
}

export function isDraftValid(d: QuestionDraft): boolean {
  if (!d.prompt.trim()) return false
  if (d.type === 'token_allocation') return d.buckets.filter((b) => b.trim()).length >= 2
  if (d.type === 'coord_plot') return !!(d.xLow.trim() && d.xHigh.trim() && d.yLow.trim() && d.yHigh.trim())
  if (d.type === 'ranking') return d.rankOptions.filter((o) => o.trim()).length >= 2
  if (d.type === 'react') return d.reactItems.filter((i) => i.trim()).length >= 1
  if (d.type === 'multiple_choice') return d.mcOptions.filter((o) => o.trim()).length >= 2
  return true
}

/** Builds the stored question. Pass an existing id when editing so it stays stable. */
export function questionFromDraft(d: QuestionDraft, id: string): Question {
  const prompt = d.prompt.trim()
  if (d.type === 'token_allocation') {
    return { id, type: 'token_allocation', prompt, buckets: d.buckets.filter((b) => b.trim()) }
  }
  if (d.type === 'coord_plot') {
    return {
      id,
      type: 'coord_plot',
      prompt,
      xLow: d.xLow.trim(),
      xHigh: d.xHigh.trim(),
      yLow: d.yLow.trim(),
      yHigh: d.yHigh.trim(),
    }
  }
  if (d.type === 'ranking') {
    return { id, type: 'ranking', prompt, options: d.rankOptions.filter((o) => o.trim()) }
  }
  if (d.type === 'react') {
    return { id, type: 'react', prompt, items: d.reactItems.filter((i) => i.trim()) }
  }
  if (d.type === 'multiple_choice') {
    return { id, type: 'multiple_choice', prompt, options: d.mcOptions.filter((o) => o.trim()) }
  }
  return { id, type: d.type, prompt }
}

const inputClass =
  'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm'
const axisClass =
  'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-sm resize-none'

type ListFieldProps = {
  label: string
  values: string[]
  min: number
  max: number
  addLabel: string
  itemLabel: string
  maxLength: number
  onChange: (next: string[]) => void
}

function ListField({ label, values, min, max, addLabel, itemLabel, maxLength, onChange }: ListFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-zinc-400 text-sm">{label}</p>
      {values.map((value, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={inputClass}
            placeholder={`${itemLabel} ${i + 1}`}
            value={value}
            onChange={(e) => onChange(values.map((v, j) => (j === i ? e.target.value : v)))}
            maxLength={maxLength}
          />
          {values.length > min && (
            <button
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-zinc-500 hover:text-red-400 px-2 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {values.length < max && (
        <button onClick={() => onChange([...values, ''])} className="text-[#FFE600] text-sm text-left hover:underline">
          {addLabel}
        </button>
      )}
    </div>
  )
}

type Props = {
  draft: QuestionDraft
  onChange: (draft: QuestionDraft) => void
  /** Called when Enter is pressed in the prompt field of a type that has no list fields */
  onSubmit?: () => void
}

/** The type selector + every type-specific field. Shared by the home-page builder and the lobby editor. */
export function QuestionForm({ draft, onChange, onSubmit }: Props) {
  const set = (patch: Partial<QuestionDraft>) => onChange({ ...draft, ...patch })

  return (
    <>
      {/* Type selector — switching type starts a fresh draft, same as picking it from scratch */}
      <div className="grid grid-cols-3 gap-2">
        {QUESTION_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => onChange(emptyDraft(t))}
            className={`py-2 px-3 rounded-xl text-sm font-bold transition-colors ${
              draft.type === t ? 'bg-[#FFE600] text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <input
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
        placeholder={PLACEHOLDERS[draft.type]}
        value={draft.prompt}
        onChange={(e) => set({ prompt: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && SUBMIT_ON_ENTER.includes(draft.type)) onSubmit?.()
        }}
        maxLength={120}
      />

      {draft.type === 'token_allocation' && (
        <ListField
          label="Buckets (min 2, max 5)"
          values={draft.buckets}
          min={2}
          max={5}
          addLabel="+ Add bucket"
          itemLabel="Bucket"
          maxLength={40}
          onChange={(buckets) => set({ buckets })}
        />
      )}

      {draft.type === 'coord_plot' && (
        <div className="flex flex-col gap-2">
          <p className="text-zinc-400 text-sm">Label each end of each axis</p>

          {/* Row: Y-label column + grid */}
          <div className="flex gap-3 items-stretch">
            {/* Y labels — left of grid, top = high, bottom = low */}
            <div className="flex flex-col w-24 shrink-0 gap-2">
              <textarea
                className={`flex-1 ${axisClass}`}
                placeholder="Y high (top)"
                value={draft.yHigh}
                onChange={(e) => set({ yHigh: e.target.value })}
                maxLength={50}
              />
              <textarea
                className={`flex-1 ${axisClass}`}
                placeholder="Y low (bottom)"
                value={draft.yLow}
                onChange={(e) => set({ yLow: e.target.value })}
                maxLength={50}
              />
            </div>

            {/* Grid preview */}
            <div className="flex-1 aspect-square border border-zinc-700 rounded-xl bg-zinc-800/40 relative shrink-0 min-w-0">
              <div className="absolute top-0 bottom-0 left-1/2 border-l border-zinc-700/50 pointer-events-none" />
              <div className="absolute left-0 right-0 top-1/2 border-t border-zinc-700/50 pointer-events-none" />
            </div>
          </div>

          {/* X labels — below grid, offset to align with grid left/right edges */}
          <div className="flex gap-3">
            <div className="w-24 shrink-0" />{/* spacer matching Y column */}
            <div className="flex-1 flex gap-2">
              <textarea
                className={`${axisClass} overflow-hidden`}
                placeholder="X low (left)"
                rows={1}
                value={draft.xLow}
                onChange={(e) => set({ xLow: e.target.value })}
                onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
                maxLength={50}
              />
              <textarea
                className={`${axisClass} overflow-hidden text-right`}
                placeholder="X high (right)"
                rows={1}
                value={draft.xHigh}
                onChange={(e) => set({ xHigh: e.target.value })}
                onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
                maxLength={50}
              />
            </div>
          </div>
        </div>
      )}

      {draft.type === 'ranking' && (
        <ListField
          label="Options to rank (min 2, max 10)"
          values={draft.rankOptions}
          min={2}
          max={10}
          addLabel="+ Add option"
          itemLabel="Option"
          maxLength={60}
          onChange={(rankOptions) => set({ rankOptions })}
        />
      )}

      {draft.type === 'react' && (
        <ListField
          label="Items to react to (max 4)"
          values={draft.reactItems}
          min={1}
          max={4}
          addLabel="+ Add item"
          itemLabel="Item"
          maxLength={80}
          onChange={(reactItems) => set({ reactItems })}
        />
      )}

      {draft.type === 'multiple_choice' && (
        <ListField
          label="Options (min 2, max 10)"
          values={draft.mcOptions}
          min={2}
          max={10}
          addLabel="+ Add option"
          itemLabel="Option"
          maxLength={80}
          onChange={(mcOptions) => set({ mcOptions })}
        />
      )}
    </>
  )
}
