'use client'

import { useState } from 'react'
import type { Event, EventTask, EventStatus } from '@/lib/types'
import { getProgress } from '@/lib/data'

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

const dayOrder = ['wednesday', 'thursday', 'all-weekend', 'friday', 'saturday', 'sunday']

const dayMeta: Record<string, { title: string; subtitle: string; color: string }> = {
  wednesday: { title: 'WEDNESDAY', subtitle: 'AUG 26', color: 'bg-green text-white' },
  thursday: { title: 'THURSDAY', subtitle: 'AUG 27', color: 'bg-red text-white' },
  'all-weekend': { title: 'ALL WEEKEND', subtitle: 'FRI\u2013SUN', color: 'bg-gold text-white' },
  friday: { title: 'FRIDAY', subtitle: 'AUG 28', color: 'bg-blue text-white' },
  saturday: { title: 'SATURDAY', subtitle: 'AUG 29', color: 'bg-orange text-white' },
  sunday: { title: 'SUNDAY', subtitle: 'AUG 30', color: 'bg-green text-white' },
}

const filters: { label: string; value: EventStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Planning', value: 'planning' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Confirmed', value: 'confirmed' },
]

const accessLabels: Record<string, string> = {
  founders: 'Founders',
  'founders-premium': 'Founders + Premium',
  'all-access': 'All Access',
  'sponsor-private': 'Sponsor Private',
}

export function Dashboard({
  events,
  tasksByEvent,
}: {
  events: Event[]
  tasksByEvent: Record<string, EventTask[]>
}) {
  const [filter, setFilter] = useState<EventStatus | 'all'>('all')

  const filtered =
    filter === 'all' ? events : events.filter((e) => e.status === filter)

  const grouped: Record<string, Event[]> = {}
  for (const event of filtered) {
    if (!grouped[event.day]) grouped[event.day] = []
    grouped[event.day].push(event)
  }
  // Sort events within each day by start time (chronological)
  for (const day of Object.keys(grouped)) {
    grouped[day].sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time))
  }

  const allTasks = Object.values(tasksByEvent).flat()
  const totalDone = allTasks.filter((t) => t.status === 'complete').length
  const totalTasks = allTasks.length
  const sponsorshipOpen = events.filter((e) => e.sponsorship_available && !e.sponsor_name).length

  // Bold Conversations slot tracking
  const boldEvents = events.filter((e) => e.id.includes('bold'))
  const slotsTotal = boldEvents.reduce((sum, e) => sum + (e.sponsor_slots_total ?? 0), 0)
  const slotsFilled = boldEvents.reduce((sum, e) => sum + (e.sponsor_slots_filled ?? 0), 0)

  return (
    <>
      {/* Hero */}
      <section className="bg-blue text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-white/50 mb-4">
            The Founders Experience
          </p>
          <h1 className="text-6xl sm:text-8xl font-bold tracking-tight leading-none uppercase">
            Boulder Roots
          </h1>
          <div className="flex items-center gap-6 mt-8">
            <div className="bg-red px-4 py-2">
              <span className="text-xs font-bold tracking-widest uppercase">Aug 26\u201330, 2026</span>
            </div>
            <div className="bg-green px-4 py-2">
              <span className="text-xs font-bold tracking-widest uppercase">{events.length} Events</span>
            </div>
            <div className="bg-orange px-4 py-2">
              <span className="text-xs font-bold tracking-widest uppercase">{sponsorshipOpen} Open Sponsorships</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-cream-dark border-b-2 border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-10 flex-wrap">
          <Stat label="Tasks Complete" value={`${totalDone}/${totalTasks}`} />
          <div className="w-px h-8 bg-black/10" />
          <Stat label="Venues Confirmed" value={`${allTasks.filter(t => t.category === 'venue' && t.status === 'complete').length}/${allTasks.filter(t => t.category === 'venue').length}`} />
          <div className="w-px h-8 bg-black/10" />
          <Stat label="Talent Booked" value={`${allTasks.filter(t => t.category === 'talent' && t.status === 'complete').length}/${allTasks.filter(t => t.category === 'talent').length}`} />
          <div className="w-px h-8 bg-black/10 hidden sm:block" />
          <Stat label="In Progress" value={`${events.filter(e => e.status === 'in-progress').length}`} />
          {slotsTotal > 0 && (
            <>
              <div className="w-px h-8 bg-black/10 hidden sm:block" />
              <Stat label="Bold Conversations Slots" value={`${slotsFilled}/${slotsTotal}`} highlight={slotsFilled < slotsTotal} />
            </>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="bg-cream">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
          <div className="flex items-center gap-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 text-xs font-bold tracking-widest uppercase border-2 transition-all ${
                  filter === f.value
                    ? 'bg-black text-white border-black'
                    : 'bg-transparent text-black border-black/20 hover:border-black'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="bg-cream flex-1">
        <div className="max-w-7xl mx-auto px-6 pb-16">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-muted text-center py-20 text-lg">No events match this filter.</p>
          ) : (
            <div className="space-y-0">
              {dayOrder
                .filter((day) => grouped[day])
                .map((day) => (
                  <div key={day}>
                    {/* Day header */}
                    {(() => {
                      const openSlots = grouped[day].filter(
                        (e) => e.sponsorship_available && !e.sponsor_name
                      ).length
                      return (
                        <div className={`${dayMeta[day].color} px-6 py-4 flex items-center justify-between mt-8`}>
                          <div className="flex items-baseline gap-4">
                            <h2 className="text-2xl font-bold tracking-tight uppercase">
                              {dayMeta[day].title}
                            </h2>
                            <span className="text-xs font-bold tracking-widest uppercase opacity-70">
                              {dayMeta[day].subtitle}
                            </span>
                          </div>
                          {openSlots > 0 && (
                            <span className="bg-white/20 px-3 py-1 text-xs font-bold tracking-widest uppercase">
                              {openSlots} Open Sponsorship{openSlots !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )
                    })()}

                    {/* Events list */}
                    <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                      {grouped[day].map((event, i) => {
                        const tasks = tasksByEvent[event.id] ?? []
                        const progress = getProgress(tasks)
                        const done = tasks.filter((t) => t.status === 'complete').length

                        return (
                          <a
                            key={event.id}
                            href={`/events/${event.id}`}
                            className={`group block px-6 py-5 hover:bg-cream-dark transition-colors ${
                              i > 0 ? 'border-t border-black/10' : ''
                            }`}
                          >
                            <div className="flex items-start gap-6">
                              {/* Time */}
                              <div className="w-28 shrink-0 pt-0.5">
                                <p className="text-xs font-bold text-muted tracking-wide">
                                  {event.start_time}
                                </p>
                                <p className="text-xs text-muted/60">
                                  {event.end_time}
                                </p>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold uppercase tracking-tight group-hover:text-red transition-colors leading-tight">
                                  {event.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  <span className="text-xs text-muted">{event.location}</span>
                                  <span className="text-xs font-bold text-blue uppercase tracking-wider">
                                    {accessLabels[event.access]}
                                  </span>
                                  {event.sponsorship_available && !event.sponsor_name && (
                                    <span className="text-[10px] font-bold text-red uppercase tracking-widest bg-red/10 px-2 py-0.5">
                                      Sponsor Slot Open
                                    </span>
                                  )}
                                  {event.sponsor_name && (
                                    <span className="text-xs font-bold text-green uppercase tracking-wider">
                                      Sponsored: {event.sponsor_name}
                                    </span>
                                  )}
                                  {(event.sponsor_slots_total ?? 0) > 0 && (
                                    <span className="text-[10px] font-bold text-gold uppercase tracking-widest bg-gold/10 px-2 py-0.5">
                                      Slots: {event.sponsor_slots_filled ?? 0}/{event.sponsor_slots_total}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Progress */}
                              <div className="w-32 shrink-0 text-right">
                                <p className="text-2xl font-bold tracking-tight">
                                  {progress}%
                                </p>
                                <p className="text-xs text-muted">
                                  {done}/{tasks.length} tasks
                                </p>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3 ml-34">
                              <div className="h-1 bg-black/5 w-full">
                                <div
                                  className={`h-1 transition-all ${
                                    progress === 100 ? 'bg-green' : progress > 0 ? 'bg-red' : 'bg-black/5'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Boulder Roots Music Fest &middot; 2026
        </p>
      </footer>
    </>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className={`text-xl font-bold tracking-tight ${highlight ? 'text-red' : ''}`}>{value}</p>
      <p className="text-xs text-muted uppercase tracking-wider font-bold">{label}</p>
    </div>
  )
}
