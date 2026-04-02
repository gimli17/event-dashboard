export type EventStatus = 'planning' | 'in-progress' | 'confirmed' | 'complete'
export type TaskStatus = 'not-started' | 'in-progress' | 'complete'
export type AccessLevel = 'founders' | 'founders-premium' | 'all-access' | 'sponsor-private'
export type CommentType = 'chat' | 'task-update'

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
  time_block: string
  sponsor_slots_total?: number
  sponsor_slots_filled?: number
  created_at: string
}

export type Priority = 'high' | 'medium' | 'low'

export interface EventTask {
  id: string
  event_id: string
  title: string
  category: 'venue' | 'talent' | 'sponsorship' | 'logistics' | 'marketing' | 'production'
  status: TaskStatus
  priority?: Priority
  assignee: string | null
  notes: string | null
  deadline?: string | null
  assigned_at?: string | null
  created_at: string
}

export interface Comment {
  id: string
  author: string
  message: string
  event_id: string | null
  task_id: string | null
  type: CommentType
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at'>
        Update: Partial<Omit<Event, 'id' | 'created_at'>>
        Relationships: []
      }
      event_tasks: {
        Row: EventTask
        Insert: Omit<EventTask, 'id' | 'created_at'>
        Update: Partial<Omit<EventTask, 'id' | 'created_at'>>
        Relationships: []
      }
      comments: {
        Row: Comment
        Insert: Omit<Comment, 'id' | 'created_at'>
        Update: Partial<Omit<Comment, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
