'use client'

import Link from 'next/link'
import { useSidebar } from '@/lib/sidebar-context'

export function Navbar() {
  const sidebar = useSidebar()

  return (
    <nav className="bg-blue text-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-widest uppercase">
          Boulder Roots 2026
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/schedule" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Schedule
          </Link>
          <Link href="/tasks" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Tasks
          </Link>
          <Link href="/bold-conversations" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Bold Conversations
          </Link>
          <Link href="/private-parties" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Private Parties
          </Link>
          <Link href="/team" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Team
          </Link>
        </div>
      </div>
    </nav>
  )
}
