'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import { useSidebar } from '@/lib/sidebar-context'
import type { EventTask, TaskStatus, Priority } from '@/lib/types'

const categoryLabels: Record<EventTask['category'], string> = {
  venue: 'Venue',
  talent: 'Talent',
  sponsorship: 'Sponsorship',
  logistics: 'Logistics',
  marketing: 'Marketing',
  production: 'Production',
}

const categoryColors: Record<EventTask['category'], string> = {
  venue: 'bg-blue',
  talent: 'bg-red',
  sponsorship: 'bg-gold',
  logistics: 'bg-green',
  marketing: 'bg-orange',
  production: 'bg-black',
}

const statusLabels: Record<TaskStatus, string> = {
  'not-started': 'NOT STARTED',
  'in-progress': 'IN PROGRESS',
  complete: 'DONE',
}

const statusColors: Record<TaskStatus, string> = {
  'not-started': 'text-muted bg-black/5 hover:bg-black/10',
  'in-progress': 'text-orange bg-orange/10 hover:bg-orange/20',
  complete: 'text-green bg-green/10 hover:bg-green/20',
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  'not-started': 'in-progress',
  'in-progress': 'complete',
  complete: 'not-started',
}

const priorityLabels: Record<Priority, string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
}

const priorityColors: Record<Priority, string> = {
  high: 'text-red bg-red/10 hover:bg-red/20',
  medium: 'text-gold bg-gold/10 hover:bg-gold/20',
  low: 'text-muted bg-black/5 hover:bg-black/10',
}

const nextPriority: Record<Priority, Priority> = {
  low: 'medium',
  medium: 'high',
  high: 'low',
}

function getProgress(tasks: EventTask[]): number {
  if (tasks.length === 0) return 0
  return Math.round((tasks.filter((t) => t.status === 'complete').length / tasks.length) * 100)
}

export function TaskList({
  initialTasks,
  eventId,
  eventTitle,
}: {
  initialTasks: EventTask[]
  eventId: string
  eventTitle: string
}) {
  const { displayName } = useUser()
  const { openForEvent } = useSidebar()
  const [tasks, setTasks] = useState(initialTasks)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [titleValue, setTitleValue] = useState('')

  // Realtime subscription for task updates from other users
  useEffect(() => {
    const channel = supabase
      .channel(`tasks-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_tasks', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as EventTask
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as EventTask
            setTasks((prev) => {
              if (prev.some((t) => t.id === inserted.id)) return prev
              return [...prev, inserted]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const progress = getProgress(tasks)
  const doneCount = tasks.filter((t) => t.status === 'complete').length

  const handleStatusCycle = async (task: EventTask) => {
    if (!displayName) return
    const newStatus = nextStatus[task.status]
    const oldStatus = task.status

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))

    const { error } = await supabase
      .from('event_tasks')
      .update({ status: newStatus } as never)
      .eq('id', task.id)

    if (error) {
      // Revert
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: oldStatus } : t)))
      return
    }

    // Log the change
    await supabase.from('comments').insert({
      author: displayName,
      message: `Changed "${task.title}" from ${statusLabels[oldStatus]} to ${statusLabels[newStatus]}`,
      event_id: eventId,
      task_id: task.id,
      type: 'task-update',
    } as never)
  }

  const handleNotesEdit = (task: EventTask) => {
    setEditingNotes(task.id)
    setNotesValue(task.notes ?? '')
  }

  const handleNotesSave = async (taskId: string) => {
    const newNotes = notesValue.trim() || null
    setEditingNotes(null)

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, notes: newNotes } : t)))

    await supabase
      .from('event_tasks')
      .update({ notes: newNotes } as never)
      .eq('id', taskId)
  }

  const handleTitleEdit = (task: EventTask) => {
    setEditingTitle(task.id)
    setTitleValue(task.title)
  }

  const handleTitleSave = async (taskId: string) => {
    const newTitle = titleValue.trim()
    if (!newTitle || !displayName) {
      setEditingTitle(null)
      return
    }
    setEditingTitle(null)

    const oldTitle = tasks.find((t) => t.id === taskId)?.title ?? ''
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t)))

    await supabase
      .from('event_tasks')
      .update({ title: newTitle } as never)
      .eq('id', taskId)

    if (newTitle !== oldTitle) {
      await supabase.from('comments').insert({
        author: displayName,
        message: `Renamed task "${oldTitle}" to "${newTitle}"`,
        event_id: eventId,
        task_id: taskId,
        type: 'task-update',
      } as never)
    }
  }

  const handleDelete = async (task: EventTask) => {
    if (!displayName) return
    if (!confirm(`Delete "${task.title}"?`)) return

    setTasks((prev) => prev.filter((t) => t.id !== task.id))

    await supabase.from('event_tasks').delete().eq('id', task.id)

    await supabase.from('comments').insert({
      author: displayName,
      message: `Removed task "${task.title}" [${task.category}]`,
      event_id: eventId,
      type: 'task-update',
    } as never)
  }

  const handlePriorityCycle = async (task: EventTask) => {
    if (!displayName) return
    const newPriority = nextPriority[task.priority || 'medium']
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: newPriority } : t)))
    await supabase
      .from('event_tasks')
      .update({ priority: newPriority } as never)
      .eq('id', task.id)
  }

  // Group tasks by category
  const grouped: Record<string, EventTask[]> = {}
  for (const task of tasks) {
    if (!grouped[task.category]) grouped[task.category] = []
    grouped[task.category].push(task)
  }

  return (
    <>
      {/* Progress section */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">
            {doneCount}/{tasks.length} tasks done
          </span>
          <span className="text-2xl font-bold">{progress}%</span>
        </div>
        <div className="h-2 bg-black/5">
          <div
            className={`h-2 transition-all duration-500 ${progress === 100 ? 'bg-green' : 'bg-red'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Activities & Tasks
          </h2>
          <button
            onClick={() => openForEvent(eventId)}
            className="text-xs font-bold uppercase tracking-widest text-blue hover:text-red transition-colors border-2 border-current px-3 py-1.5"
          >
            Event Chat
          </button>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <p className="text-muted">No tasks yet.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, catTasks]) => {
              const catKey = category as EventTask['category']
              const catDone = catTasks.filter((t) => t.status === 'complete').length

              return (
                <div key={category}>
                  <div className={`${categoryColors[catKey]} text-white px-5 py-3 flex items-center justify-between`}>
                    <h3 className="text-sm font-bold tracking-widest uppercase">
                      {categoryLabels[catKey]}
                    </h3>
                    <span className="text-xs font-bold tracking-wider opacity-70">
                      {catDone}/{catTasks.length} DONE
                    </span>
                  </div>

                  <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                    {catTasks.map((task, i) => (
                      <div
                        key={task.id}
                        className={`px-5 py-4 ${i > 0 ? 'border-t border-black/5' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Title display/edit */}
                            {editingTitle === task.id ? (
                              <input
                                type="text"
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                                onBlur={() => handleTitleSave(task.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTitleSave(task.id)
                                  if (e.key === 'Escape') setEditingTitle(null)
                                }}
                                autoFocus
                                className="w-full border-2 border-black bg-white px-2 py-1 text-sm font-bold text-black focus:outline-none focus:border-blue"
                              />
                            ) : (
                              <p
                                onClick={() => handleTitleEdit(task)}
                                className={`text-sm font-bold cursor-pointer hover:text-blue transition-colors ${
                                  task.status === 'complete' ? 'line-through text-muted' : ''
                                }`}
                                title="Click to edit title"
                              >
                                {task.title}
                              </p>
                            )}

                            {/* Notes display/edit */}
                            {editingNotes === task.id ? (
                              <input
                                type="text"
                                value={notesValue}
                                onChange={(e) => setNotesValue(e.target.value)}
                                onBlur={() => handleNotesSave(task.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleNotesSave(task.id)
                                  if (e.key === 'Escape') setEditingNotes(null)
                                }}
                                autoFocus
                                placeholder="Add notes..."
                                className="mt-1 w-full border-2 border-black bg-white px-2 py-1 text-xs text-black focus:outline-none focus:border-blue"
                              />
                            ) : (
                              <button
                                onClick={() => handleNotesEdit(task)}
                                className="mt-1 text-xs text-muted italic hover:text-black transition-colors text-left"
                              >
                                {task.notes || '+ Add notes'}
                              </button>
                            )}

                            {task.assignee && (
                              <span className="text-xs text-muted mt-1 block">{task.assignee}</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handlePriorityCycle(task)}
                              disabled={!displayName}
                              className={`px-2 py-1.5 text-[9px] font-bold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${priorityColors[task.priority || 'medium']}`}
                              title="Click to change priority"
                            >
                              {priorityLabels[task.priority || 'medium']}
                            </button>
                            <button
                              onClick={() => handleStatusCycle(task)}
                              disabled={!displayName}
                              className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${statusColors[task.status]}`}
                              title="Click to change status"
                            >
                              {statusLabels[task.status]}
                            </button>
                            <button
                              onClick={() => handleDelete(task)}
                              disabled={!displayName}
                              className="text-muted/40 hover:text-red transition-colors text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Delete task"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
