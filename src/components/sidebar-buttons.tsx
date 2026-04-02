'use client'

import { useSidebar } from '@/lib/sidebar-context'

export function SidebarButtons() {
  const sidebar = useSidebar()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => { sidebar.setTab('chat'); sidebar.openSidebar() }}
        className="text-xs font-bold tracking-widest uppercase bg-white/15 hover:bg-white/25 px-4 py-2 transition-colors flex items-center gap-2 text-white"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Board
      </button>
      <button
        onClick={() => { sidebar.setTab('add-task'); sidebar.openSidebar() }}
        className="text-xs font-bold tracking-widest uppercase bg-red hover:bg-orange px-4 py-2 transition-colors flex items-center gap-2 text-white"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Actions
      </button>
    </div>
  )
}
