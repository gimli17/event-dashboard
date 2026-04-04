import { Suspense } from 'react'
import { Navbar } from '@/components/navbar'
import { BackLink } from '@/components/back-link'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { ActivityLog } from '@/components/activity-log'

export const dynamic = 'force-dynamic'

export default function LogPage() {
  return (
    <>
      <Navbar />
      <section className="bg-black text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">Activity Log</h1>
          </div>
          <SidebarButtons />
        </div>
      </section>
      <section className="bg-cream flex-1">
        <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading...</p></div>}>
          <ActivityLog />
        </Suspense>
      </section>
      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">Boulder Roots Music Fest &middot; 2026</p>
      </footer>
    </>
  )
}
