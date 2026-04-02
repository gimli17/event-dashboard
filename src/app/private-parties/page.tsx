import { Navbar } from '@/components/navbar'
import { BackLink } from '@/components/back-link'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { getEvents, getEventTasks } from '@/lib/data'
import { getSponsors, getSponsorsByEvent } from '@/lib/sponsor-data'
import type { Event, EventTask } from '@/lib/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const privateEventIds = [
  'fri-endeavor',
  'sat-sponsor-early',
  'sat-sponsor-late',
  'sun-sponsor-early',
  'sun-sponsor',
]

export default async function PrivatePartiesPage() {
  const [events, sponsors] = await Promise.all([getEvents(), getSponsors()])
  const sponsorMap = getSponsorsByEvent(sponsors)

  const privateEvents = events
    .filter((e) => privateEventIds.includes(e.id))
    .sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date)
      if (dateComp !== 0) return dateComp
      return parseTime(a.start_time) - parseTime(b.start_time)
    })

  // Fetch tasks for each
  const tasksByEvent: Record<string, EventTask[]> = {}
  for (const event of privateEvents) {
    tasksByEvent[event.id] = await getEventTasks(event.id)
  }

  const totalSlots = 9 // 1 Endeavor + 2+2+2+2
  const filledSlots = privateEvents.filter((e) => sponsorMap[e.id]).length
  const openSlots = totalSlots - filledSlots

  return (
    <>
      <Navbar />

      <section className="bg-gold text-white py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">
              Private Parties
            </h1>
          </div>
          <SidebarButtons />
        </div>
      </section>

      {/* Stats */}
      <section className="bg-cream-dark border-b-2 border-black/10">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center gap-12">
          <div className="text-center">
            <p className="text-3xl font-bold">{totalSlots}</p>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Total Slots</p>
          </div>
          <div className="w-px h-12 bg-black/10" />
          <div className="text-center">
            <p className="text-3xl font-bold text-green">{filledSlots}</p>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Claimed</p>
          </div>
          <div className="w-px h-12 bg-black/10" />
          <div className="text-center">
            <p className="text-3xl font-bold text-red">{openSlots}</p>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Open</p>
          </div>
        </div>
      </section>

      <section className="bg-cream flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="space-y-0">
            {privateEvents.map((event, i) => {
              const sponsor = sponsorMap[event.id]
              const tasks = tasksByEvent[event.id] ?? []
              const done = tasks.filter((t) => t.status === 'complete').length
              const isClaimed = !!sponsor

              return (
                <div key={event.id} className={i > 0 ? 'border-t-2 border-black/5' : ''}>
                  <div className={`${isClaimed ? 'bg-green' : 'bg-red'} text-white px-6 py-3 flex items-center justify-between`}>
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-sm font-bold tracking-widest uppercase">
                        {event.day_label}
                      </h2>
                      <span className="text-xs font-bold tracking-wider opacity-70">
                        {event.start_time} — {event.end_time}
                      </span>
                    </div>
                    <span className="text-xs font-bold tracking-widest uppercase">
                      {isClaimed ? 'CLAIMED' : 'OPEN'}
                    </span>
                  </div>

                  <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-6 py-5">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        {isClaimed ? (
                          <>
                            <h3 className="text-lg font-bold">{sponsor.name}</h3>
                            {sponsor.partyName && (
                              <p className="text-sm text-muted mt-1">{sponsor.partyName}</p>
                            )}
                            <p className="text-[10px] font-bold uppercase tracking-widest text-green mt-2">
                              {sponsor.tier ? `${sponsor.tier} tier` : 'Sponsor confirmed'}
                            </p>
                          </>
                        ) : (
                          <>
                            <h3 className="text-lg font-bold text-muted/50">No Sponsor Yet</h3>
                            <p className="text-xs text-muted mt-1">
                              {event.access === 'sponsor-private' ? 'Visionary Tier: 80 invites / Champion Tier: 40 invites' : ''}
                            </p>
                          </>
                        )}

                        <p className="text-xs text-muted mt-2">{event.location}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold">{done}/{tasks.length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Tasks Done</p>
                        <Link
                          href={`/events/${event.id}`}
                          className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest text-blue hover:text-red transition-colors border-2 border-current px-3 py-1"
                        >
                          Manage Event &rarr;
                        </Link>
                      </div>
                    </div>

                    {/* Task summary */}
                    {tasks.length > 0 && (
                      <div className="mt-4 border-t border-black/5 pt-3">
                        {tasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between py-1">
                            <span className={`text-xs ${task.status === 'complete' ? 'line-through text-muted' : ''}`}>
                              {task.title}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${
                              task.status === 'complete' ? 'text-green' : task.status === 'in-progress' ? 'text-orange' : 'text-muted'
                            }`}>
                              {task.status === 'complete' ? 'DONE' : task.status === 'in-progress' ? 'IN PROG' : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Boulder Roots Music Fest &middot; 2026
        </p>
      </footer>
    </>
  )
}

function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 0
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && hours !== 12) hours += 12
  if (ampm === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}
