export type EventStatus = 'planning' | 'in-progress' | 'confirmed' | 'complete'
export type TaskStatus = 'not-started' | 'in-progress' | 'complete'
export type AccessLevel = 'founders' | 'founders-premium' | 'all-access' | 'sponsor-private'

export interface Event {
  id: string
  title: string
  day: string
  day_label: string
  date: string
  start_time: string
  end_time: string
  location: string
  description: string | null
  status: EventStatus
  access: AccessLevel
  sponsorship_available: boolean
  sponsor_name: string | null
  time_block: 'morning' | 'early-afternoon' | 'mid-afternoon' | 'late-afternoon' | 'evening' | 'prime-time' | 'after-hours' | 'all-day'
  created_at: string
}

export interface EventTask {
  id: string
  event_id: string
  title: string
  category: 'venue' | 'talent' | 'sponsorship' | 'logistics' | 'marketing' | 'production'
  status: TaskStatus
  assignee: string | null
  notes: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at'>
        Update: Partial<Omit<Event, 'id' | 'created_at'>>
      }
      event_tasks: {
        Row: EventTask
        Insert: Omit<EventTask, 'id' | 'created_at'>
        Update: Partial<Omit<EventTask, 'id' | 'created_at'>>
      }
    }
  }
}
