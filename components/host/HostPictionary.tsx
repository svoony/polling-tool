type Drawing = { url: string }

type Props = {
  prompt: string
  drawings: Drawing[]
}

export function HostPictionary({ prompt, drawings }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl">{prompt}</h2>
        <span className="text-ey-muted text-sm">{drawings.length} drawing{drawings.length !== 1 ? 's' : ''}</span>
      </div>
      {drawings.length === 0 ? (
        <p className="text-ey-subtle text-center py-8">Waiting for drawings...</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {drawings.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.url}
                alt={`Drawing ${i + 1}`}
                className="w-36 h-36 rounded-none border-2 border-ey-yellow object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
