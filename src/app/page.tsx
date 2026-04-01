import { getEvents, getEventTasks } from '@/lib/data'
import { Dashboard } from '@/components/dashboard'
import type { EventTask } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const events = await getEvents()

  const taskEntries = await Promise.all(
    events.map(async (event) => {
      const tasks = await getEventTasks(event.id)
      return [event.id, tasks] as [string, EventTask[]]
    })
  )
  const tasksByEvent: Record<string, EventTask[]> = Object.fromEntries(taskEntries)

  return <Dashboard events={events} tasksByEvent={tasksByEvent} />
}
