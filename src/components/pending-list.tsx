'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import type { EventTask, Priority, TaskStatus } from '@/lib/types'

interface PendingTask extends EventTask {
  event_title: string
  event_date: string
  event_day_label: string
}

const priorityLabels: Record<Priority, string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
}

const priorityColors: Record<Priority, string> = {
  high: 'bg-red text-white',
  medium: 'bg-gold text-white',
  low: 'bg-black/10 text-muted',
}

const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

const statusLabels: Record<TaskStatus, string> = {
  'not-started': 'NOT STARTED',
  'in-progress': 'IN PROGRESS',
  complete: 'DONE',
}

const statusColors: Record<TaskStatus, string> = {
  'not-started': 'text-muted',
  'in-progress': 'text-orange',
  complete: 'text-green',
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  'not-started': 'in-progress',
  'in-progress': 'complete',
  complete: 'not-started',
}

const nextPriority: Record<Priority, Priority> = {
  low: 'medium',
  medium: 'high',
  high: 'low',
}

type SortBy = 'priority' | 'date' | 'category' | 'assignee'

export function PendingList() {
  const { displayName } = useUser()
  const [tasks, setTasks] = useState<PendingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>('priority')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)
    const { data: taskData } = await supabase
      .from('event_tasks')
      .select('*')
      .in('status', ['not-started', 'in-progress'])

    if (!taskData) { setLoading(false); return }

    const eventIds = [...new Set((taskData as EventTask[]).map((t) => t.event_id))]
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, date, day_label')
      .in('id', eventIds)

    const eventMap: Record<string, { title: string; date: string; day_label: string }> = {}
    if (eventsData) {
      for (const e of eventsData as { id: string; title: string; date: string; day_label: string }[]) {
        eventMap[e.id] = { title: e.title, date: e.date, day_label: e.day_label }
      }
    }

    const enriched: PendingTask[] = (taskData as EventTask[]).map((t) => ({
      ...t,
      priority: t.priority || 'medium',
      event_title: eventMap[t.event_id]?.title ?? '',
      event_date: eventMap[t.event_id]?.date ?? '',
      event_day_label: eventMap[t.event_id]?.day_label ?? '',
    }))

    setTasks(enriched)
    setLoading(false)
  }

  const handleStatusCycle = async (task: PendingTask) => {
    if (!displayName) return
    const newStatus = nextStatus[task.status]
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))
    await supabase.from('event_tasks').update({ status: newStatus } as never).eq('id', task.id)
    await supabase.from('comments').insert({
      author: displayName,
      message: `Changed "${task.title}" to ${statusLabels[newStatus]}`,
      event_id: task.event_id,
      task_id: task.id,
      type: 'task-update',
    } as never)
    // Remove if completed
    if (newStatus === 'complete') {
      setTimeout(() => setTasks((prev) => prev.filter((t) => t.id !== task.id)), 500)
    }
  }

  const handlePriorityCycle = async (task: PendingTask) => {
    if (!displayName) return
    const newPriority = nextPriority[task.priority || 'medium']
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: newPriority } : t)))
    await supabase.from('event_tasks').update({ priority: newPriority } as never).eq('id', task.id)
  }

  // Filter
  let filtered = filterCategory === 'all'
    ? tasks
    : tasks.filter((t) => t.category === filterCategory)

  if (filterAssignee === 'unassigned') {
    filtered = filtered.filter((t) => !t.assignee)
  } else if (filterAssignee !== 'all') {
    filtered = filtered.filter((t) => t.assignee === filterAssignee)
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      const pDiff = priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']
      if (pDiff !== 0) return pDiff
      // Secondary: in-progress before not-started
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1
      if (a.status !== 'in-progress' && b.status === 'in-progress') return 1
      return a.event_date.localeCompare(b.event_date)
    }
    if (sortBy === 'date') {
      const dDiff = a.event_date.localeCompare(b.event_date)
      if (dDiff !== 0) return dDiff
      return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']
    }
    if (sortBy === 'assignee') {
      const aName = a.assignee ?? 'zzz'
      const bName = b.assignee ?? 'zzz'
      const nDiff = aName.localeCompare(bName)
      if (nDiff !== 0) return nDiff
      return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']
    }
    // category
    const cDiff = a.category.localeCompare(b.category)
    if (cDiff !== 0) return cDiff
    return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']
  })

  const categories = ['all', ...new Set(tasks.map((t) => t.category))]
  const assignees = ['all', 'unassigned', ...new Set(tasks.map((t) => t.assignee).filter(Boolean) as string[])]

  const highCount = tasks.filter((t) => t.priority === 'high').length
  const inProgressCount = tasks.filter((t) => t.status === 'in-progress').length

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading tasks...</p></div>
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Stats */}
      <div className="flex items-center gap-8 mb-8 flex-wrap">
        <div>
          <p className="text-3xl font-bold">{tasks.length}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Pending</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-red">{highCount}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">High Priority</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-orange">{inProgressCount}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">In Progress</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Sort:</span>
          {(['priority', 'date', 'category', 'assignee'] as SortBy[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${
                sortBy === s ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Filter:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${
                filterCategory === cat ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Assignee:</span>
          {assignees.map((a) => (
            <button
              key={a}
              onClick={() => setFilterAssignee(a)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${
                filterAssignee === a ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <p className="text-muted text-center py-12 uppercase tracking-widest text-xs font-bold">
          {tasks.length === 0 ? 'All tasks complete!' : 'No tasks match this filter.'}
        </p>
      ) : (
        <div className="border-2 border-black/10">
          {sorted.map((task, i) => (
            <div
              key={task.id}
              className={`px-5 py-4 flex items-start gap-4 hover:bg-cream-dark transition-colors ${
                i > 0 ? 'border-t border-black/5' : ''
              }`}
            >
              {/* Priority badge */}
              <button
                onClick={() => handlePriorityCycle(task)}
                disabled={!displayName}
                className={`shrink-0 w-12 py-1 text-[9px] font-bold tracking-widest uppercase text-center cursor-pointer disabled:opacity-40 ${priorityColors[task.priority || 'medium']}`}
                title="Click to change priority"
              >
                {priorityLabels[task.priority || 'medium']}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">{task.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <a
                    href={`/events/${task.event_id}`}
                    className="text-[10px] font-bold text-blue uppercase tracking-wider hover:text-red transition-colors"
                  >
                    {task.event_day_label} &middot; {task.event_title}
                  </a>
                  <span className="text-[10px] text-muted uppercase tracking-wider">{task.category}</span>
                  {task.assignee && (
                    <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{task.assignee}</span>
                  )}
                  {!task.assignee && (
                    <span className="text-[10px] text-muted/40 uppercase tracking-wider">Unassigned</span>
                  )}
                </div>
                {task.notes && (
                  <p className="text-xs text-muted italic mt-1">{task.notes}</p>
                )}
              </div>

              {/* Status */}
              <button
                onClick={() => handleStatusCycle(task)}
                disabled={!displayName}
                className={`shrink-0 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase cursor-pointer disabled:opacity-40 ${
                  task.status === 'in-progress' ? 'text-orange bg-orange/10 hover:bg-orange/20' : 'text-muted bg-black/5 hover:bg-black/10'
                }`}
                title="Click to change status"
              >
                {statusLabels[task.status]}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
