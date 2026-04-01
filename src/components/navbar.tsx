import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="bg-white border-b border-card-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">Boulder Roots</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-muted hover:text-foreground transition-colors">
            Schedule
          </Link>
          <span className="text-sm font-medium text-muted/50 cursor-default">
            Sponsors
          </span>
          <span className="text-sm font-medium text-muted/50 cursor-default">
            Team
          </span>
        </div>
      </div>
    </nav>
  )
}
