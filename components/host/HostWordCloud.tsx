import { WordCloudDisplay } from '@/components/WordCloudDisplay'

type Props = {
  prompt: string
  words: string[]
}

export function HostWordCloud({ prompt, words }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl">{prompt}</h2>
        <span className="text-zinc-400 text-sm">{words.length} response{words.length !== 1 ? 's' : ''}</span>
      </div>
      <WordCloudDisplay words={words} />
    </div>
  )
}
