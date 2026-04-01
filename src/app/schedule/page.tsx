import { getEvents, getEventTasks } from '@/lib/data'
import { getSponsors, getSponsorsByEvent } from '@/lib/sponsor-data'
import { Dashboard } from '@/components/dashboard'
import { Navbar } from '@/components/navbar'
import type { Event, EventTask } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const [events, sponsors] = await Promise.all([getEvents(), getSponsors()])

  // Overlay sponsor names from sponsor portal onto events
  const sponsorMap = getSponsorsByEvent(sponsors)
  const enrichedEvents: Event[] = events.map((event) => {
    const sponsor = sponsorMap[event.id]
    if (sponsor) {
      return {
        ...event,
        sponsor_name: sponsor.name,
        sponsorship_available: false,
      }
    }
    return event
  })

  const taskEntries = await Promise.all(
    enrichedEvents.map(async (event) => {
      const tasks = await getEventTasks(event.id)
      return [event.id, tasks] as [string, EventTask[]]
    })
  )
  const tasksByEvent: Record<string, EventTask[]> = Object.fromEntries(taskEntries)

  return (
    <>
      <Navbar />
      <Dashboard events={enrichedEvents} tasksByEvent={tasksByEvent} />
    </>
  )
}
