import { getEventsByInitiative, getEventTasks } from '@/lib/data'
import { Dashboard } from '@/components/dashboard'
import { Navbar } from '@/components/navbar'
import type { EventTask } from '@/lib/types'

export const dynamic = 'force-dynamic'

const bsDayMeta: Record<string, { title: string; subtitle: string; color: string }> = {
  Sunday: { title: 'SUNDAY', subtitle: 'AUG 30', color: 'bg-[#d4a020] text-white' },
  Monday: { title: 'MONDAY', subtitle: 'AUG 31', color: 'bg-[#c89820] text-white' },
  Tuesday: { title: 'TUESDAY', subtitle: 'SEP 1', color: 'bg-[#b88818] text-white' },
}

export default async function BoldSummitSchedulePage() {
  const events = await getEventsByInitiative('bold-summit')

  const taskEntries = await Promise.all(
    events.map(async (event) => {
      const tasks = await getEventTasks(event.id)
      return [event.id, tasks] as [string, EventTask[]]
    })
  )
  const tasksByEvent: Record<string, EventTask[]> = Object.fromEntries(taskEntries)

  return (
    <>
      <Navbar initiative="bold-summit" />
      <Dashboard
        events={events}
        tasksByEvent={tasksByEvent}
        title="Bold Summit Events"
        headerColor="bg-[#d4a020]"
        backHref="/bold-summit"
        footerText="Caruso Ventures · Bold Summit"
        dayMetaOverride={bsDayMeta}
      />
    </>
  )
}
