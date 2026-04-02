import { Navbar } from '@/components/navbar'
import { MasterTaskList } from '@/components/master-task-list'
import { BackLink } from '@/components/back-link'
import { SidebarButtons } from '@/components/sidebar-buttons'

export const dynamic = 'force-dynamic'

export default function TasksPage() {
  return (
    <>
      <Navbar />

      <section className="bg-red text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">
              BRMF Priorities
            </h1>
          </div>
          <SidebarButtons />
        </div>
      </section>

      <section className="bg-cream flex-1">
        <MasterTaskList />
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Boulder Roots Music Fest &middot; 2026
        </p>
      </footer>
    </>
  )
}
