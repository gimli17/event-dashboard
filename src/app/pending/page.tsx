import { Navbar } from '@/components/navbar'
import { PendingList } from '@/components/pending-list'
import { BackLink } from '@/components/back-link'

export const dynamic = 'force-dynamic'

export default function PendingPage() {
  return (
    <>
      <Navbar />

      <section className="bg-red text-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <BackLink />
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-none uppercase">
            Pending<br />Activities
          </h1>
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-white/50 mt-4">
            All incomplete tasks ranked by priority
          </p>
        </div>
      </section>

      <section className="bg-cream flex-1">
        <PendingList />
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Boulder Roots Music Fest &middot; 2026
        </p>
      </footer>
    </>
  )
}
