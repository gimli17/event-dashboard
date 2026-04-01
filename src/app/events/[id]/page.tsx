import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEvent, getEventTasks, getProgress } from '@/lib/data'
import { Navbar } from '@/components/navbar'
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

const categoryColors: Record<EventTask['category'], string> = {
  venue: 'bg-blue',
  talent: 'bg-red',
  sponsorship: 'bg-gold',
  logistics: 'bg-green',
  marketing: 'bg-orange',
  production: 'bg-black',
}

const statusLabels: Record<string, string> = {
  'not-started': 'NOT STARTED',
  'in-progress': 'IN PROGRESS',
  complete: 'DONE',
}

const statusColors: Record<string, string> = {
  'not-started': 'text-muted',
  'in-progress': 'text-orange',
  complete: 'text-green',
}

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
  const progress = getProgress(tasks)

  const grouped: Record<string, EventTask[]> = {}
  for (const task of tasks) {
    if (!grouped[task.category]) grouped[task.category] = []
    grouped[task.category].push(task)
  }

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

          <div className="flex items-start justify-between gap-6">
            <div>
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
                  {event.start_time} \u2013 {event.end_time}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-5xl font-bold">{progress}%</p>
              <p className="text-xs text-white/50 uppercase tracking-wider font-bold mt-1">Complete</p>
            </div>
          </div>
        </div>
      </section>

      {/* Info */}
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
          <span className="text-xs text-muted">
            {tasks.filter((t) => t.status === 'complete').length}/{tasks.length} tasks done
          </span>
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

      {/* Progress bar */}
      <section className="bg-cream">
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-2 bg-black/5">
            <div
              className={`h-2 transition-all ${progress === 100 ? 'bg-green' : 'bg-red'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {/* Tasks */}
      <section className="bg-cream flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-bold uppercase tracking-tight mb-8">
            Activities & Tasks
          </h2>

          {Object.keys(grouped).length === 0 ? (
            <p className="text-muted">No tasks yet.</p>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([category, catTasks]) => {
                const catKey = category as EventTask['category']
                const catDone = catTasks.filter((t) => t.status === 'complete').length

                return (
                  <div key={category}>
                    {/* Category header */}
                    <div className={`${categoryColors[catKey]} text-white px-5 py-3 flex items-center justify-between`}>
                      <h3 className="text-sm font-bold tracking-widest uppercase">
                        {categoryLabels[catKey]}
                      </h3>
                      <span className="text-xs font-bold tracking-wider opacity-70">
                        {catDone}/{catTasks.length} DONE
                      </span>
                    </div>

                    {/* Task list */}
                    <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                      {catTasks.map((task, i) => (
                        <div
                          key={task.id}
                          className={`px-5 py-4 flex items-center justify-between gap-4 ${
                            i > 0 ? 'border-t border-black/5' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-bold ${
                                task.status === 'complete' ? 'line-through text-muted' : ''
                              }`}
                            >
                              {task.title}
                            </p>
                            {(task.assignee || task.notes) && (
                              <p className="text-xs text-muted mt-0.5">
                                {task.assignee && <span>{task.assignee}</span>}
                                {task.assignee && task.notes && <span> &middot; </span>}
                                {task.notes && <span className="italic">{task.notes}</span>}
                              </p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold tracking-widest uppercase shrink-0 ${statusColors[task.status]}`}>
                            {statusLabels[task.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
