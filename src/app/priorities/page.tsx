'use client'

import { Navbar } from '@/components/navbar'
import { BackLink } from '@/components/back-link'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { PriorityStreams } from '@/components/priority-streams'

export default function PrioritiesPage() {
  const owner = 'Sabrina'

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <Navbar />

      <section className="bg-black text-white py-6">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">
                {owner}&apos;s Priorities
              </h1>
              <p className="text-xs uppercase tracking-widest text-white/60 mt-1">{today}</p>
            </div>
          </div>
          <SidebarButtons />
        </div>
      </section>

      <section className="bg-cream flex-1">
        <PriorityStreams owner={owner} />
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Boulder Roots Music Fest &middot; 2026
        </p>
      </footer>
    </>
  )
}
