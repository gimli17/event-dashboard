import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEvent, getEventTasks } from '@/lib/data'
import { getSponsors, getSponsorsByEvent } from '@/lib/sponsor-data'
import { Navbar } from '@/components/navbar'
import { TaskList } from '@/components/task-list'
import { SidebarButtons } from '@/components/sidebar-buttons'

export const dynamic = 'force-dynamic'

const accessLabels: Record<string, string> = {
  founders: 'Founders',
  'founders-premium': 'Founders + Premium',
  'all-access': 'All Access',
  'sponsor-private': 'Sponsor Private',
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [event, sponsors] = await Promise.all([getEvent(id), getSponsors()])

  if (!event) notFound()

  // Overlay sponsor from portal
  const sponsorMap = getSponsorsByEvent(sponsors)
  const portalSponsor = sponsorMap[id]
  if (portalSponsor) {
    event.sponsor_name = portalSponsor.name
    event.sponsorship_available = false
  }

  const tasks = await getEventTasks(id)
  const isBoldSummit = (event as { initiative?: string }).initiative === 'bold-summit'
  const backHref = isBoldSummit ? '/bold-summit/events' : '/schedule'
  const headerColor = isBoldSummit ? 'bg-[#d4a838]' : 'bg-[#4478b8]'

  return (
    <>
      <Navbar initiative={isBoldSummit ? 'bold-summit' : 'brmf'} />

      {/* Hero */}
      <section className={`${headerColor} text-white py-6`}>
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white transition-colors"
            >
              <span>&larr;</span> Back
            </Link>
            <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">
              {event.title}
            </h1>
          </div>
          <SidebarButtons />
        </div>
      </section>

      {/* Info bar */}
      <section className="bg-cream-dark border-b-2 border-black/10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-6 flex-wrap text-sm">
          <span className="text-muted">{event.location}</span>
          <span className="text-xs font-bold text-blue uppercase tracking-wider">
            {accessLabels[event.access]}
          </span>
          {event.sponsorship_available && !event.sponsor_name && (
            <span className="text-xs font-bold text-red uppercase tracking-wider">
              Open for Sponsorship
            </span>
          )}
          {event.sponsor_name && (
            <span className="text-xs font-bold text-green uppercase tracking-wider">
              Sponsored: {event.sponsor_name}
            </span>
          )}
        </div>
      </section>

      {/* Description */}
      {event.description && (
        <section className="bg-cream">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <p className="text-sm text-muted leading-relaxed max-w-2xl">{event.description}</p>
          </div>
        </section>
      )}

      {/* Interactive task list */}
      <section className="bg-cream flex-1">
        <TaskList initialTasks={tasks} eventId={event.id} eventTitle={event.title} />
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Boulder Roots Music Fest &middot; 2026
        </p>
      </footer>
    </>
  )
}
