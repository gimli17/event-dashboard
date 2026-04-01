import type { EventStatus, TaskStatus } from '@/lib/types'

const eventStatusStyles: Record<EventStatus, string> = {
  planning: 'bg-info-light text-info',
  'in-progress': 'bg-warning-light text-warning',
  confirmed: 'bg-success-light text-success',
  complete: 'bg-accent-light text-accent',
}

const eventStatusLabels: Record<EventStatus, string> = {
  planning: 'Planning',
  'in-progress': 'In Progress',
  confirmed: 'Confirmed',
  complete: 'Complete',
}

const taskStatusStyles: Record<TaskStatus, string> = {
  'not-started': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-warning-light text-warning',
  complete: 'bg-success-light text-success',
}

const taskStatusLabels: Record<TaskStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  complete: 'Done',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${eventStatusStyles[status]}`}
    >
      {eventStatusLabels[status]}
    </span>
  )
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${taskStatusStyles[status]}`}
    >
      {taskStatusLabels[status]}
    </span>
  )
}
