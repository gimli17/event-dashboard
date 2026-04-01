'use client'

import { useState } from 'react'
import type { Event, EventTask, EventStatus } from '@/lib/types'
import { EventCard } from './event-card'

const dayOrder = ['wednesday', 'thursday', 'all-weekend', 'friday', 'saturday', 'sunday']

const dayLabels: Record<string, { title: string; subtitle: string }> = {
  wednesday: { title: 'Wednesday, August 26', subtitle: 'Warm Up Day' },
  thursday: { title: 'Thursday, August 27', subtitle: 'Deepening the Work' },
  'all-weekend': { title: 'All Weekend', subtitle: 'Friday \u2013 Sunday' },
  friday: { title: 'Friday, August 28', subtitle: 'Integration Before Expansion' },
  saturday: { title: 'Saturday, August 29', subtitle: 'Shared Cultural Momentum' },
  sunday: { title: 'Sunday, August 30', subtitle: 'Resolution & Reflection' },
}

const filters: { label: string; value: EventStatus | 'all' }[] = [
  { label: 'All Events', value: 'all' },
  { label: 'Planning', value: 'planning' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Complete', value: 'complete' },
]

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
    const key = event.day
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(event)
  }

  const allTasks = Object.values(tasksByEvent).flat()
  const venueConfirmed = allTasks.filter((t) => t.category === 'venue' && t.status === 'complete').length
  const venueTotal = allTasks.filter((t) => t.category === 'venue').length
  const talentBooked = allTasks.filter((t) => t.category === 'talent' && t.status === 'complete').length
  const talentTotal = allTasks.filter((t) => t.category === 'talent').length
  const sponsorshipOpen = events.filter((e) => e.sponsorship_available && !e.sponsor_name).length

  return (
    <>
      {/* Hero */}
      <section className="bg-surface border-b border-divider">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-accent-glow border border-accent/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-semibold text-accent">August 26\u201330, 2026</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-3">
            Boulder Roots Music Fest
          </h1>
          <p className="text-lg font-light text-muted max-w-2xl mx-auto">
            The BRMF Founders Experience \u2014 Event Planning Dashboard
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-divider">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
            <StatCard label="Total Events" value={`${events.length}`} />
            <StatCard label="Venues Confirmed" value={`${venueConfirmed}/${venueTotal}`} />
            <StatCard label="Talent Booked" value={`${talentBooked}/${talentTotal}`} />
            <StatCard label="In Progress" value={`${events.filter((e) => e.status === 'in-progress').length}`} />
            <StatCard label="Open Sponsorships" value={`${sponsorshipOpen}`} accent />
          </div>
        </div>
      </section>

      {/* Filters + Schedule */}
      <section className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-10 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === f.value
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-surface text-muted border border-card-border hover:border-accent/30 hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted text-lg">No events match this filter.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {dayOrder
                .filter((day) => grouped[day])
                .map((day) => (
                  <section key={day}>
                    <div className="flex items-center gap-4 mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {dayLabels[day].title}
                        </h2>
                        <p className="text-sm text-muted mt-0.5">
                          {dayLabels[day].subtitle}
                        </p>
                      </div>
                      <div className="h-px flex-1 bg-divider" />
                      <span className="text-xs font-semibold text-muted bg-surface px-3 py-1 rounded-full border border-card-border">
                        {grouped[day].length} event{grouped[day].length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {grouped[day].map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          tasks={tasksByEvent[event.id] ?? []}
                        />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-divider text-muted text-center py-8 text-sm">
        <p>2026 Boulder Roots Music Fest &middot; Founders Experience Dashboard</p>
      </footer>
    </>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  )
}
