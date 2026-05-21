type Drawing = { name: string; url: string }

type Props = {
  prompt: string
  drawings: Drawing[]
}

export function HostPictionary({ prompt, drawings }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl">{prompt}</h2>
        <span className="text-zinc-400 text-sm">{drawings.length} drawing{drawings.length !== 1 ? 's' : ''}</span>
      </div>
      {drawings.length === 0 ? (
        <p className="text-zinc-500 text-center py-8">Waiting for drawings...</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {drawings.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.url}
                alt={`Drawing by ${d.name}`}
                className="w-36 h-36 rounded-2xl border-2 border-[#FFE600] object-cover"
              />
              <span className="text-zinc-400 text-xs">{d.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
