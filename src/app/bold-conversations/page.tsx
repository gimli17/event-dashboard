import { Navbar } from '@/components/navbar'
import { BoldConversationsList } from '@/components/bold-conversations-list'
import { BackLink } from '@/components/back-link'

export const dynamic = 'force-dynamic'

export default function BoldConversationsPage() {
  return (
    <>
      <Navbar />

      <section className="bg-green text-white py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">
              Bold Conversations
            </h1>
          </div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">
            3 Tracks &middot; Indicate Interest
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
