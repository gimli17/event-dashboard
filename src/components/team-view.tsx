'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import type { EventTask, TaskStatus } from '@/lib/types'

interface TaskRow extends EventTask {
  event_title: string
  event_day_label: string
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

const teamMembers = ['Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

export function TeamView() {
  const { displayName } = useUser()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<string>('all')
  const [showComplete, setShowComplete] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data: eventTasks } = await supabase
        .from('event_tasks')
        .select('*')
        .not('assignee', 'is', null)
        .order('created_at', { ascending: false })

      if (!eventTasks) { setLoading(false); return }

      const eventIds = [...new Set((eventTasks as EventTask[]).map((t) => t.event_id).filter(Boolean))]
      const { data: events } = await supabase
        .from('events')
        .select('id, title, day_label')
        .in('id', eventIds)

      const eventMap: Record<string, { title: string; day_label: string }> = {}
      if (events) {
        for (const e of events as { id: string; title: string; day_label: string }[]) {
          eventMap[e.id] = { title: e.title, day_label: e.day_label }
        }
      }

      const rows: TaskRow[] = (eventTasks as EventTask[]).map((t) => ({
        ...t,
        event_title: eventMap[t.event_id]?.title ?? 'General',
        event_day_label: eventMap[t.event_id]?.day_label ?? '',
      }))

      setTasks(rows)
      setLoading(false)
    }
    fetch()
  }, [])

  const handleStatusCycle = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || !displayName) return
    const newStatus = nextStatus[task.status]
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    await supabase.from('event_tasks').update({ status: newStatus } as never).eq('id', taskId)
  }

  // Filter
  let filtered = selectedPerson === 'all'
    ? tasks
    : tasks.filter((t) => t.assignee === selectedPerson)

  if (!showComplete) {
    filtered = filtered.filter((t) => t.status !== 'complete')
  }

  // Group by person
  const byPerson: Record<string, TaskRow[]> = {}
  for (const t of filtered) {
    const person = t.assignee || 'Unassigned'
    if (!byPerson[person]) byPerson[person] = []
    byPerson[person].push(t)
  }

  // Sort people by task count (most first)
  const sortedPeople = Object.entries(byPerson).sort((a, b) => b[1].length - a[1].length)

  // Stats
  const assignedPeople = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))]
  const totalAssigned = tasks.filter((t) => t.status !== 'complete').length
  const overdueCount = tasks.filter((t) => t.deadline && t.status !== 'complete').length // simplified

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading...</p></div>
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Stats */}
      <div className="flex items-center gap-8 mb-8 flex-wrap">
        <div><p className="text-3xl font-bold">{assignedPeople.length}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Team Members</p></div>
        <div><p className="text-3xl font-bold text-red">{totalAssigned}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Active Tasks</p></div>
        <div><p className="text-3xl font-bold text-orange">{overdueCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">With Deadlines</p></div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Person:</span>
          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer"
          >
            <option value="all">Everyone</option>
            {teamMembers.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowComplete(!showComplete)}
          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border-2 transition-all ${showComplete ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}
        >
          {showComplete ? 'Hide Complete' : 'Show Complete'}
        </button>
      </div>

      {/* Task list by person */}
      {sortedPeople.length === 0 ? (
        <p className="text-muted text-center py-12 uppercase tracking-widest text-xs font-bold">No assigned tasks found.</p>
      ) : (
        <div className="space-y-6">
          {sortedPeople.map(([person, personTasks]) => {
            const active = personTasks.filter((t) => t.status !== 'complete').length
            const done = personTasks.filter((t) => t.status === 'complete').length

            return (
              <div key={person}>
                <div className="bg-blue text-white px-6 py-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold tracking-widest uppercase">{person}</h2>
                  <span className="text-xs font-bold tracking-wider opacity-70">
                    {active} active{done > 0 ? ` · ${done} done` : ''}
                  </span>
                </div>

                <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                  {personTasks.map((task, i) => (
                    <div key={task.id} className={`px-5 py-3 flex items-start justify-between gap-4 hover:bg-cream-dark transition-colors ${i > 0 ? 'border-t border-black/5' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold leading-tight ${task.status === 'complete' ? 'line-through text-muted' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-muted uppercase tracking-wider">{task.category}</span>
                          {task.event_title && (
                            <a href={`/events/${task.event_id}`} className="text-[10px] font-bold text-blue uppercase tracking-wider hover:text-red transition-colors">
                              {task.event_title}
                            </a>
                          )}
                          {task.deadline && (
                            <span className="text-[10px] font-bold text-red uppercase tracking-wider">
                              Due {task.deadline}
                            </span>
                          )}
                          {task.assigned_at && (
                            <span className="text-[10px] text-muted uppercase tracking-wider">
                              Assigned {new Date(task.assigned_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {task.notes && <p className="text-xs text-muted italic mt-1">{task.notes}</p>}
                      </div>

                      <button
                        onClick={() => handleStatusCycle(task.id)}
                        disabled={!displayName}
                        className={`shrink-0 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase cursor-pointer transition-all disabled:opacity-40 ${statusColors[task.status]}`}
                      >
                        {statusLabels[task.status]}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
