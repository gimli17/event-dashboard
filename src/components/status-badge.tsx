import type { EventStatus, TaskStatus } from '@/lib/types'

const eventStatusStyles: Record<EventStatus, string> = {
  planning: 'bg-info-light text-info border-info/20',
  'in-progress': 'bg-warning-light text-warning border-warning/20',
  confirmed: 'bg-success-light text-success border-success/20',
  complete: 'bg-accent-glow text-accent border-accent/20',
}

const eventStatusLabels: Record<EventStatus, string> = {
  planning: 'Planning',
  'in-progress': 'In Progress',
  confirmed: 'Confirmed',
  complete: 'Complete',
}

const taskStatusStyles: Record<TaskStatus, string> = {
  'not-started': 'bg-muted/10 text-muted border-muted/20',
  'in-progress': 'bg-warning-light text-warning border-warning/20',
  complete: 'bg-success-light text-success border-success/20',
}

const taskStatusLabels: Record<TaskStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  complete: 'Done',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${eventStatusStyles[status]}`}
    >
      {eventStatusLabels[status]}
    </span>
  )
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${taskStatusStyles[status]}`}
    >
      {taskStatusLabels[status]}
    </span>
  )
}
