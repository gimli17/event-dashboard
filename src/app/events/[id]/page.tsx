import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEvent, getEventTasks, getProgress } from '@/lib/data'
import { Navbar } from '@/components/navbar'
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

  const grouped: Record<string, EventTask[]> = {}
  for (const task of tasks) {
    if (!grouped[task.category]) grouped[task.category] = []
    grouped[task.category].push(task)
  }

  return (
    <>
      <Navbar />

      {/* Hero bar */}
      <section className="bg-hero-bg text-hero-text">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Schedule
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight">{event.title}</h1>
              <p className="text-white/60 mt-2 text-sm">
                {event.day_label} &middot; {event.start_time} – {event.end_time}
              </p>
            </div>
            <EventStatusBadge status={event.status} />
          </div>
        </div>
      </section>

      <div className="bg-section-bg flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Info card */}
          <div className="bg-white rounded-2xl border border-card-border p-6 mb-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-4">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
              <p className="text-sm text-muted leading-relaxed mb-6">{event.description}</p>
            )}

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-foreground">Overall Progress</span>
                <span className="text-muted">
                  {tasks.filter((t) => t.status === 'complete').length} of{' '}
                  {tasks.length} tasks complete
                </span>
              </div>
              <ProgressBar percent={progress} />
            </div>
          </div>

          {/* Tasks */}
          <h2 className="text-xl font-bold mb-5">Activities & Tasks</h2>

          {Object.keys(grouped).length === 0 ? (
            <p className="text-muted text-sm">No tasks yet for this event.</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([category, catTasks]) => {
                const catKey = category as EventTask['category']
                const catDone = catTasks.filter((t) => t.status === 'complete').length
                const catTotal = catTasks.length

                return (
                  <div
                    key={category}
                    className="bg-white rounded-2xl border border-card-border overflow-hidden shadow-sm"
                  >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{categoryIcons[catKey]}</span>
                        <h3 className="font-bold text-sm text-foreground">
                          {categoryLabels[catKey]}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-muted">
                        {catDone}/{catTotal} done
                      </span>
                    </div>
                    <ul className="divide-y divide-card-border">
                      {catTasks.map((task) => (
                        <li
                          key={task.id}
                          className="px-6 py-4 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                task.status === 'complete'
                                  ? 'line-through text-muted'
                                  : 'text-foreground'
                              }`}
                            >
                              {task.title}
                            </p>
                            {(task.assignee || task.notes) && (
                              <div className="flex items-center gap-3 mt-1">
                                {task.assignee && (
                                  <span className="text-xs text-muted font-medium">
                                    {task.assignee}
                                  </span>
                                )}
                                {task.notes && (
                                  <span className="text-xs text-muted/70 italic">
                                    {task.notes}
                                  </span>
                                )}
                              </div>
                            )}
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
      </div>

      <footer className="bg-hero-bg text-white/50 text-center py-8 text-sm">
        <p>2026 Boulder Roots Music Fest &middot; Founders Experience Dashboard</p>
      </footer>
    </>
  )
}
