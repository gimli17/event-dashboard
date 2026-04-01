import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="bg-blue text-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-widest uppercase">
          BRMF 2026
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Schedule
          </Link>
          <Link href="/pending" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Pending
          </Link>
          <span className="text-xs font-bold tracking-widest uppercase text-white/30 cursor-default">
            Sponsors
          </span>
        </div>
      </div>
    </nav>
  )
}
