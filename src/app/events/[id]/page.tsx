import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEvent, getEventTasks, getProgress } from '@/lib/data'
import { EventStatusBadge, TaskStatusBadge } from '@/components/status-badge'
import { ProgressBar } from '@/components/progress-bar'
import { SponsorshipBadge } from '@/components/sponsorship-badge'
import { AccessBadge } from '@/components/access-badge'
import type { EventTask } from '@/lib/types'

export const dynamic = 'force-dynamic'

const categoryLabels: Record<EventTask['category'], string> = {
  venue: 'Venue',
  talent: 'Talent',
  sponsorship: 'Sponsorship',
  logistics: 'Logistics',
  marketing: 'Marketing',
  production: 'Production',
}

const categoryIcons: Record<EventTask['category'], string> = {
  venue: '\u{1F3DB}',
  talent: '\u{1F3A4}',
  sponsorship: '\u{1F91D}',
  logistics: '\u{1F4E6}',
  marketing: '\u{1F4E3}',
  production: '\u{1F3AC}',
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
  const progress = getProgress(tasks)

  // Group tasks by category
  const grouped: Record<string, EventTask[]> = {}
  for (const task of tasks) {
    if (!grouped[task.category]) grouped[task.category] = []
    grouped[task.category].push(task)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Schedule
      </Link>

      {/* Event header */}
      <div className="bg-card rounded-xl border border-card-border p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <p className="text-muted mt-1">
              {event.day_label} &middot; {event.start_time} – {event.end_time}
            </p>
          </div>
          <EventStatusBadge status={event.status} />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-4">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {event.location}
          </span>
          <AccessBadge access={event.access} />
          <SponsorshipBadge
            available={event.sponsorship_available}
            sponsorName={event.sponsor_name}
          />
        </div>

        {event.description && (
          <p className="text-sm text-muted mb-5 leading-relaxed">{event.description}</p>
        )}

        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted">
              {tasks.filter((t) => t.status === 'complete').length} of{' '}
              {tasks.length} tasks complete
            </span>
          </div>
          <ProgressBar percent={progress} />
        </div>
      </div>

      {/* Tasks grouped by category */}
      <h2 className="text-lg font-semibold mb-4">Activities & Tasks</h2>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-muted text-sm">No tasks yet for this event.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, catTasks]) => {
            const catKey = category as EventTask['category']
            const catDone = catTasks.filter((t) => t.status === 'complete').length
            const catTotal = catTasks.length

            return (
              <div
                key={category}
                className="bg-card rounded-xl border border-card-border overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-card-border bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryIcons[catKey]}</span>
                    <h3 className="font-medium text-sm">
                      {categoryLabels[catKey]}
                    </h3>
                  </div>
                  <span className="text-xs text-muted">
                    {catDone}/{catTotal} done
                  </span>
                </div>
                <ul className="divide-y divide-card-border">
                  {catTasks.map((task) => (
                    <li
                      key={task.id}
                      className="px-5 py-3 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            task.status === 'complete'
                              ? 'line-through text-muted'
                              : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {task.assignee && (
                            <span className="text-xs text-muted">
                              {task.assignee}
                            </span>
                          )}
                          {task.notes && (
                            <span className="text-xs text-muted italic">
                              {task.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      <TaskStatusBadge status={task.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
