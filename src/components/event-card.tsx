import Link from 'next/link'
import type { Event, EventTask } from '@/lib/types'
import { getProgress } from '@/lib/data'
import { EventStatusBadge } from './status-badge'
import { ProgressBar } from './progress-bar'
import { SponsorshipBadge } from './sponsorship-badge'
import { AccessBadge } from './access-badge'

export function EventCard({
  event,
  tasks,
}: {
  event: Event
  tasks: EventTask[]
}) {
  const progress = getProgress(tasks)
  const completedTasks = tasks.filter((t) => t.status === 'complete').length

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-card rounded-xl border border-card-border p-5 hover:bg-card-hover hover:border-accent/20 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-accent transition-colors">
          {event.title}
        </h3>
        <EventStatusBadge status={event.status} />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
        <svg className="w-3.5 h-3.5 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {event.start_time} \u2013 {event.end_time}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted mb-4">
        <svg className="w-3.5 h-3.5 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="truncate">{event.location}</span>
      </div>

      <ProgressBar percent={progress} />

      <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {completedTasks}/{tasks.length} tasks
          </span>
          <AccessBadge access={event.access} />
        </div>
        <SponsorshipBadge
          available={event.sponsorship_available}
          sponsorName={event.sponsor_name}
        />
      </div>
    </Link>
  )
}
