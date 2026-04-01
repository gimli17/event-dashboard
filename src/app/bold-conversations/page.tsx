import { Navbar } from '@/components/navbar'
import { BoldConversationsList } from '@/components/bold-conversations-list'

export const dynamic = 'force-dynamic'

export default function BoldConversationsPage() {
  return (
    <>
      <Navbar />

      <section className="bg-green text-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-none uppercase">
            Bold<br />Conversations
          </h1>
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-white/50 mt-4">
            3 Tracks &middot; Indicate Your Interest &middot; Topics Assigned to Sessions Later
          </p>
        </div>
      </section>

      <section className="bg-cream flex-1">
        <BoldConversationsList />
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Boulder Roots Music Fest &middot; 2026
        </p>
      </footer>
    </>
  )
}
