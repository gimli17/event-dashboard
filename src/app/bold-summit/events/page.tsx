import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { BackLink } from '@/components/back-link'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { getEventsByInitiative, getEventTasks, getProgress } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function BoldSummitEventsPage() {
  const events = await getEventsByInitiative('bold-summit')

  const eventsWithProgress = await Promise.all(
    events.map(async (event) => {
      const tasks = await getEventTasks(event.id)
      return { ...event, progress: getProgress(tasks), taskCount: tasks.length }
    })
  )

  return (
    <>
      <Navbar initiative="bold-summit" />
      <section className="bg-[#d4a838] text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">Bold Summit Events</h1>
          </div>
          <SidebarButtons />
        </div>
      </section>

      <section className="bg-cream flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {eventsWithProgress.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted uppercase tracking-widest text-xs font-bold">No events yet</p>
              <p className="text-sm text-muted mt-2">Run the SQL migration to add Bold Summit events to the database.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventsWithProgress.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="group block">
                  <div className="border-2 border-black/10 bg-white hover:bg-cream-dark transition-colors">
                    <div className="flex items-center gap-6 px-6 py-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4a838]">{event.day_label}</span>
                          {event.start_time && (
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}</span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold">{event.title}</h3>
                        {event.location && <p className="text-xs text-muted mt-1">{event.location}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        {event.taskCount > 0 ? (
                          <>
                            <p className="text-lg font-bold">{event.progress}%</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted">{event.taskCount} tasks</p>
                          </>
                        ) : (
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">No tasks</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-muted opacity-50 group-hover:opacity-100 transition-opacity">&rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">Caruso Ventures &middot; Bold Summit</p>
      </footer>
    </>
  )
}
