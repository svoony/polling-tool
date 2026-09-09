type Props = {
  /** Sizing/utility classes; the mark inherits font-size, so pass e.g. "text-3xl". */
  className?: string
}

/**
 * The product wordmark, styled after the EY-Parthenon lockup: the yellow EY "beam"
 * followed by "EY" in white and "Poll" in Parthenon blue. The beam scales with the
 * surrounding font-size (em units), so one component works at every size.
 */
export function Wordmark({ className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-[0.35em] font-black tracking-tight leading-none ${className}`}>
      <svg viewBox="0 0 28 18" className="h-[0.62em] w-auto shrink-0" aria-hidden="true">
        <polygon points="6,16 16,2 26,2 16,16" fill="#FFE600" />
      </svg>
      <span>
        <span className="text-white">EY</span>
        <span className="text-ey-blue">Poll</span>
      </span>
    </span>
  )
}
