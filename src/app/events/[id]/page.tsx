import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEvent, getEventTasks } from '@/lib/data'
import { Navbar } from '@/components/navbar'
import { TaskList } from '@/components/task-list'

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
  const event = await getEvent(id)

  if (!event) notFound()

  const tasks = await getEventTasks(id)

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-blue text-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-white/50 hover:text-white mb-8 transition-colors"
          >
            <span>&larr;</span> Back to Schedule
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-none uppercase">
            {event.title}
          </h1>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="bg-red px-3 py-1.5">
              <span className="text-xs font-bold tracking-widest uppercase">
                {event.day_label}
              </span>
            </div>
            <span className="text-sm text-white/60">
              {event.start_time} &ndash; {event.end_time}
            </span>
          </div>
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
