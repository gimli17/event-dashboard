'use client'

import { useState } from 'react'
import type { Event, EventTask, EventStatus } from '@/lib/types'
import { EventCard } from './event-card'

const dayOrder = ['wednesday', 'thursday', 'all-weekend', 'friday', 'saturday', 'sunday']

const dayLabels: Record<string, { title: string; subtitle: string }> = {
  wednesday: { title: 'Wednesday, August 26', subtitle: 'Warm Up Day' },
  thursday: { title: 'Thursday, August 27', subtitle: 'Deepening the Work' },
  'all-weekend': { title: 'All Weekend', subtitle: 'Friday – Sunday' },
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
      <section className="bg-hero-bg text-hero-text">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-black tracking-tight mb-3">
            2026 Boulder Roots Music Fest
          </h1>
          <p className="text-lg font-light text-white/70 max-w-2xl mx-auto">
            The BRMF Founders Experience — August 26–30, 2026
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-card-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
            <StatCard icon={<CalendarIcon />} label="Total Events" value={`${events.length}`} />
            <StatCard icon={<VenueIcon />} label="Venues Confirmed" value={`${venueConfirmed} / ${venueTotal}`} />
            <StatCard icon={<MicIcon />} label="Talent Booked" value={`${talentBooked} / ${talentTotal}`} />
            <StatCard icon={<ClockIcon />} label="In Progress" value={`${events.filter((e) => e.status === 'in-progress').length}`} />
            <StatCard icon={<SparkleIcon />} label="Open Sponsorships" value={`${sponsorshipOpen}`} accent />
          </div>
        </div>
      </section>

      {/* Filters + Schedule */}
      <section className="bg-section-bg flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-10 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === f.value
                    ? 'bg-accent text-white shadow-md shadow-accent/25'
                    : 'bg-white text-muted border border-card-border hover:border-accent/30 hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Schedule */}
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
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-foreground">
                        {dayLabels[day].title}
                      </h2>
                      <p className="text-sm text-muted mt-1">
                        {dayLabels[day].subtitle} &middot; {grouped[day].length} event{grouped[day].length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Footer */}
      <footer className="bg-hero-bg text-white/50 text-center py-8 text-sm">
        <p>2026 Boulder Roots Music Fest &middot; Founders Experience Dashboard</p>
      </footer>
    </>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        accent ? 'bg-accent/10 text-accent' : 'bg-section-bg text-muted'
      }`}>
        {icon}
      </div>
      <div>
        <p className={`text-xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function VenueIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}
