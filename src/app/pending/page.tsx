import { Navbar } from '@/components/navbar'
import { PendingList } from '@/components/pending-list'
import { BackLink } from '@/components/back-link'

export const dynamic = 'force-dynamic'

export default function PendingPage() {
  return (
    <>
      <Navbar />

      <section className="bg-red text-white py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">
              Pending Activities
            </h1>
          </div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">
            Ranked by Priority
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
