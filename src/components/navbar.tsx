'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSidebar } from '@/lib/sidebar-context'
import { supabase } from '@/lib/supabase'

export function Navbar() {
  const sidebar = useSidebar()
  const [reviewCount, setReviewCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from('master_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'review')
      setReviewCount(count || 0)
    }
    fetchCount()
  }, [])

  return (
    <nav className="bg-blue text-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-widest uppercase">
          Boulder Roots 2026
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/tasks" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Tasks
          </Link>
          <Link href="/schedule" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Schedule
          </Link>
          <Link href="/bold-conversations" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Bold Conversations
          </Link>
          <Link href="/private-parties" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
            Private Parties
          </Link>
          <Link href="/team" className="text-xs font-bold tracking-widest uppercase bg-purple-light/30 hover:bg-purple-light/50 px-3 py-1.5 transition-colors relative">
            Team Workspace
            {reviewCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-red text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {reviewCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  )
}
