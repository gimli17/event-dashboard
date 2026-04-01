import { Navbar } from '@/components/navbar'
import { MasterTaskList } from '@/components/master-task-list'
import { BackLink } from '@/components/back-link'

export const dynamic = 'force-dynamic'

export default function TasksPage() {
  return (
    <>
      <Navbar />

      <section className="bg-red text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <BackLink />
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-white/50 mb-4">
            W/C March 30th
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-none uppercase">
            BRMF Priorities
          </h1>
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
