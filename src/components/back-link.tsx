import Link from 'next/link'

export function BackLink({ href = '/', label = 'Back' }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white transition-colors"
    >
      <span>&larr;</span> {label}
    </Link>
  )
}
