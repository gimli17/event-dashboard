'use client'

import { useState } from 'react'
import type { Event, EventTask, EventStatus } from '@/lib/types'
import { ScheduleHeader } from './schedule-header'
import { EventCard } from './event-card'

const dayOrder = ['wednesday', 'thursday', 'all-weekend', 'friday', 'saturday', 'sunday']

const dayLabels: Record<string, string> = {
  wednesday: 'Wednesday 8/26 — Warm Up Day',
  thursday: 'Thursday 8/27 — Deepening the Work',
  'all-weekend': 'All Weekend',
  friday: 'Friday 8/28 — Integration Before Expansion',
  saturday: 'Saturday 8/29 — Shared Cultural Momentum',
  sunday: 'Sunday 8/30 — Resolution & Reflection',
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

  // Group events by day
  const grouped: Record<string, Event[]> = {}
  for (const event of filtered) {
    const key = event.day
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(event)
  }

  const sponsorshipOpenCount = events.filter(
    (e) => e.sponsorship_available && !e.sponsor_name
  ).length

  const allTasks = Object.values(tasksByEvent).flat()
  const venueConfirmed = allTasks.filter((t) => t.category === 'venue' && t.status === 'complete').length
  const venueTotal = allTasks.filter((t) => t.category === 'venue').length
  const talentBooked = allTasks.filter((t) => t.category === 'talent' && t.status === 'complete').length
  const talentTotal = allTasks.filter((t) => t.category === 'talent').length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ScheduleHeader onFilterChange={setFilter} activeFilter={filter} />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Events" value={`${events.length}`} />
        <StatCard
          label="Venues Confirmed"
          value={`${venueConfirmed}/${venueTotal}`}
        />
        <StatCard
          label="Talent Booked"
          value={`${talentBooked}/${talentTotal}`}
        />
        <StatCard
          label="In Progress"
          value={`${events.filter((e) => e.status === 'in-progress').length}`}
        />
        <StatCard
          label="Open Sponsorships"
          value={`${sponsorshipOpenCount}`}
          highlight
        />
      </div>

      {/* Schedule by day */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-center text-muted py-12">
          No events match this filter.
        </p>
      ) : (
        <div className="space-y-10">
          {dayOrder
            .filter((day) => grouped[day])
            .map((day) => (
              <section key={day}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold whitespace-nowrap">
                    {dayLabels[day]}
                  </h2>
                  <div className="h-px flex-1 bg-card-border" />
                  <span className="text-xs text-muted whitespace-nowrap">
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
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? 'border-success bg-success-light'
          : 'border-card-border bg-card'
      }`}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  )
}
