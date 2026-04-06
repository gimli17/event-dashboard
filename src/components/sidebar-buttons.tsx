'use client'

import { useSidebar } from '@/lib/sidebar-context'

export function SidebarButtons() {
  const sidebar = useSidebar()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => { sidebar.setTab('add-task'); sidebar.openSidebar() }}
        className="text-xs font-bold tracking-widest uppercase bg-[#cc4444] hover:bg-[#d84848] px-4 py-2 transition-colors flex items-center gap-2 text-white"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Quick Add
      </button>
    </div>
  )
}
