import type { EventStatus, TaskStatus } from '@/lib/types'

const eventStatusStyles: Record<EventStatus, string> = {
  planning: 'bg-blue-50 text-blue-600 border-blue-100',
  'in-progress': 'bg-amber-50 text-amber-600 border-amber-100',
  confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  complete: 'bg-violet-50 text-violet-600 border-violet-100',
}

const eventStatusLabels: Record<EventStatus, string> = {
  planning: 'Planning',
  'in-progress': 'In Progress',
  confirmed: 'Confirmed',
  complete: 'Complete',
}

const taskStatusStyles: Record<TaskStatus, string> = {
  'not-started': 'bg-gray-50 text-gray-500 border-gray-100',
  'in-progress': 'bg-amber-50 text-amber-600 border-amber-100',
  complete: 'bg-emerald-50 text-emerald-600 border-emerald-100',
}

const taskStatusLabels: Record<TaskStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  complete: 'Done',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${eventStatusStyles[status]}`}
    >
      {eventStatusLabels[status]}
    </span>
  )
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${taskStatusStyles[status]}`}
    >
      {taskStatusLabels[status]}
    </span>
  )
}
