import Link from 'next/link'

export function BackLink({ href = '/', label = 'Back' }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 text-xs font-bold tracking-widest uppercase text-white mb-6 transition-colors"
    >
      <span>&larr;</span> {label}
    </Link>
  )
}
