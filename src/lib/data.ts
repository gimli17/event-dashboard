import { sampleEvents, sampleTasks } from './sample-data'
import type { Event, EventTask } from './types'

const USE_SUPABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function getEvents(): Promise<Event[]> {
  if (USE_SUPABASE) {
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
    if (error) throw error
    return data as Event[]
  }
  return [...sampleEvents]
}

export async function getEvent(id: string): Promise<Event | null> {
  if (USE_SUPABASE) {
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data as Event
  }
  return sampleEvents.find((e) => e.id === id) ?? null
}

export async function getEventTasks(eventId: string): Promise<EventTask[]> {
  if (USE_SUPABASE) {
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .from('event_tasks')
      .select('*')
      .eq('event_id', eventId)
      .order('category', { ascending: true })
    if (error) throw error
    return data as EventTask[]
  }
  return sampleTasks.filter((t) => t.event_id === eventId)
}

export function getProgress(tasks: EventTask[]): number {
  if (tasks.length === 0) return 0
  const completed = tasks.filter((t) => t.status === 'complete').length
  return Math.round((completed / tasks.length) * 100)
}
