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
          <div className="w-px h-6 bg-white/20" />
          <button
            onClick={() => { sidebar.setTab('chat'); sidebar.openSidebar() }}
            className="text-xs font-bold tracking-widest uppercase bg-white/15 hover:bg-white/25 px-3 py-1.5 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </button>
          <button
            onClick={() => { sidebar.setTab('add-task'); sidebar.openSidebar() }}
            className="text-xs font-bold tracking-widest uppercase bg-red hover:bg-orange px-3 py-1.5 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Actions
          </button>
        </div>
      </div>
    </nav>
  )
}
