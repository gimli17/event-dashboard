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
  review: 'FOR REVIEW',
  complete: 'DONE',
}

const statusColors: Record<TaskStatus, string> = {
  'not-started': 'text-muted bg-black/5 hover:bg-black/10',
  'in-progress': 'text-orange bg-orange/10 hover:bg-orange/20',
  review: 'text-blue bg-blue/10 hover:bg-blue/20',
  complete: 'text-green bg-green/10 hover:bg-green/20',
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  'not-started': 'in-progress',
  'in-progress': 'review',
  review: 'complete',
  complete: 'not-started',
}

const teamMembers = ['Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

export function TeamView() {
  const { displayName } = useUser()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<string>('all')
  const [showComplete, setShowComplete] = useState(false)
  const [viewMode, setViewMode] = useState<'team' | 'review'>('team')
  const [masterTasks, setMasterTasks] = useState<{ id: string; title: string; status: string; assignee: string | null; priority: string; links: string | null; current_status: string | null; overview: string | null; action_items: string | null; dan_comments: string | null }[]>([])
  const [masterComments, setMasterComments] = useState<{ id: string; task_id: string; author: string; message: string; created_at: string }[]>([])
  const [expandedReview, setExpandedReview] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [sendingReview, setSendingReview] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data: eventTasks } = await supabase
        .from('event_tasks')
        .select('*')
        .not('assignee', 'is', null)
        .order('created_at', { ascending: false })

      if (!eventTasks) { setLoading(false); return }

      const eventIds = [...new Set((eventTasks as EventTask[]).map((t) => t.event_id).filter((id): id is string => Boolean(id)))]
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

      // Fetch master tasks in review + their comments
      const { data: mt } = await supabase.from('master_tasks').select('id, title, status, assignee, priority, links, current_status, overview, action_items, dan_comments').eq('status', 'review')
      if (mt) setMasterTasks(mt as typeof masterTasks)

      // Fetch comments for master tasks in review
      const mtTyped = (mt || []) as { id: string; title: string; status: string; assignee: string | null; priority: string; links: string | null }[]
      if (mtTyped.length > 0) {
        const { data: mc } = await supabase.from('master_task_comments').select('*').in('task_id', mtTyped.map(t => t.id)).order('created_at')
        if (mc) setMasterComments(mc as typeof masterComments)
      }

      setLoading(false)
    }
    fetch()
  }, [])

  const handleReviewComment = async (taskId: string) => {
    if (!reviewComment.trim() || !displayName || sendingReview) return
    setSendingReview(true)
    const c = { id: `temp-${Date.now()}`, task_id: taskId, author: displayName, message: reviewComment.trim(), created_at: new Date().toISOString() }
    setMasterComments((prev) => [...prev, c])
    await supabase.from('master_task_comments').insert({ task_id: taskId, author: displayName, message: reviewComment.trim() } as never)
    setReviewComment('')
    setSendingReview(false)
  }

  const handleReviewAction = async (taskId: string, action: 'approve' | 'revise') => {
    const newStatus = action === 'approve' ? 'complete' : 'in-progress'
    // Update master task
    setMasterTasks((prev) => prev.filter((t) => t.id !== taskId))
    await supabase.from('master_tasks').update({ status: newStatus, updated_at: new Date().toISOString() } as never).eq('id', taskId)
    if (displayName) {
      const msg = action === 'approve' ? 'Approved and marked complete' : 'Sent back for revisions'
      await supabase.from('master_task_comments').insert({ task_id: taskId, author: displayName, message: msg } as never)
    }
  }

  const handleEventTaskReview = async (taskId: string, action: 'approve' | 'revise') => {
    const newStatus = action === 'approve' ? 'complete' : 'in-progress'
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    await supabase.from('event_tasks').update({ status: newStatus } as never).eq('id', taskId)
  }

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
  const overdueCount = tasks.filter((t) => t.deadline && t.status !== 'complete').length
  const reviewCount = tasks.filter((t) => t.status === 'review').length + masterTasks.length

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading...</p></div>
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* View toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setViewMode('team')}
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${viewMode === 'team' ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>
          Team Workload
        </button>
        <button onClick={() => setViewMode('review')}
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${viewMode === 'review' ? 'bg-blue text-white border-blue' : 'bg-white text-black border-black/20 hover:border-black'} ${reviewCount > 0 ? 'animate-pulse' : ''}`}>
          Dan&apos;s Review Queue {reviewCount > 0 ? `(${reviewCount})` : ''}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-8 mb-8 flex-wrap">
        <div><p className="text-3xl font-bold">{assignedPeople.length}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Team Members</p></div>
        <div><p className="text-3xl font-bold text-red">{totalAssigned}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Active Tasks</p></div>
        <div><p className="text-3xl font-bold text-blue">{reviewCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Awaiting Review</p></div>
      </div>

      {/* Filters — only in team view */}
      {viewMode === 'team' && (
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
      )}

      {/* Dan's Review Queue */}
      {viewMode === 'review' && (
        <div>
          {reviewCount === 0 ? (
            <p className="text-muted text-center py-12 uppercase tracking-widest text-xs font-bold">No items awaiting review.</p>
          ) : (
            <div className="space-y-0">
              <div className="bg-blue text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-widest uppercase">Awaiting Review</h2>
                <span className="text-xs font-bold tracking-wider opacity-70">{reviewCount} ITEMS</span>
              </div>

              <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                {/* Master tasks */}
                {masterTasks.map((mt, i) => {
                  const mtComments = masterComments.filter(c => c.task_id === mt.id)
                  const isExpanded = expandedReview === mt.id

                  return (
                    <div key={mt.id} className={i > 0 ? 'border-t border-black/5' : ''}>
                      <button
                        onClick={() => { setExpandedReview(isExpanded ? null : mt.id); setReviewComment('') }}
                        className="w-full text-left px-5 py-4 hover:bg-cream-dark transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-bold">{mt.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {mt.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{mt.assignee}</span>}
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${mt.priority === 'ultra-high' ? 'text-red' : mt.priority === 'high' ? 'text-orange' : 'text-muted'}`}>{mt.priority}</span>
                              {mtComments.length > 0 && <span className="text-[10px] font-bold text-gold uppercase tracking-wider">{mtComments.length} comments</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-blue bg-blue/10 px-3 py-1 shrink-0">FOR REVIEW</span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-black/5 bg-white">
                          {/* Full detail */}
                          <div className="grid gap-4 sm:grid-cols-2 pt-4">
                            {mt.current_status && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Current Status</p>
                                <p className="text-xs">{mt.current_status}</p>
                              </div>
                            )}
                            {mt.overview && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Overview</p>
                                <p className="text-xs">{mt.overview}</p>
                              </div>
                            )}
                          </div>

                          {mt.action_items && (
                            <div className="mt-4">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Action Items</p>
                              <ul className="space-y-1">
                                {mt.action_items.split('\n').map((item, idx) => (
                                  <li key={idx} className="text-xs flex items-start gap-2">
                                    <span className="text-muted mt-0.5">&mdash;</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {mt.dan_comments && (
                            <div className="mt-4 border-l-4 border-red pl-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red mb-1">Dan&apos;s Previous Comments</p>
                              <p className="text-xs italic">{mt.dan_comments}</p>
                            </div>
                          )}

                          {/* Links */}
                          {mt.links && (
                            <div className="mt-4">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Links</p>
                              <div className="space-y-1">
                                {mt.links.split('\n').filter(Boolean).map((link, li) => (
                                  <a key={li} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue hover:text-red underline block truncate">{link.trim()}</a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Comments thread */}
                          <div className="mt-4 border-t-2 border-black/5 pt-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Discussion</p>
                            {mtComments.length > 0 && (
                              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto border border-black/5">
                                {mtComments.map((c, ci) => (
                                  <div key={c.id} className={`text-xs px-3 py-2 ${ci > 0 ? 'border-t border-black/5' : ''}`}>
                                    <span className="font-bold text-blue">{c.author}</span>
                                    <span className="text-muted mx-1">&middot;</span>
                                    <span className="text-muted">{new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <p className="mt-0.5">{c.message}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleReviewComment(mt.id) }}
                                placeholder="Leave feedback..."
                                className="flex-1 border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue"
                              />
                              <button onClick={() => handleReviewComment(mt.id)} disabled={!reviewComment.trim() || sendingReview}
                                className="bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-blue transition-colors disabled:opacity-40">
                                Post
                              </button>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex gap-2">
                            <button onClick={() => handleReviewAction(mt.id, 'approve')}
                              className="bg-green text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-green-light transition-colors">
                              Approve &amp; Complete
                            </button>
                            <button onClick={() => handleReviewAction(mt.id, 'revise')}
                              className="bg-orange text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-red transition-colors">
                              Send Back for Revisions
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Event tasks in review */}
                {tasks.filter(t => t.status === 'review').map((task, i) => (
                  <div key={task.id} className={`border-t border-black/5`}>
                    <div className="px-5 py-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-bold">{task.event_title} &mdash; {task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{task.assignee}</span>}
                          <span className="text-[10px] text-muted uppercase tracking-wider">{task.category}</span>
                          {task.event_id && <a href={`/events/${task.event_id}`} className="text-[10px] font-bold text-blue uppercase tracking-widest hover:text-red">View Event &rarr;</a>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleEventTaskReview(task.id, 'approve')}
                          className="text-[10px] font-bold uppercase tracking-widest text-green bg-green/10 px-2 py-1 hover:bg-green/20 transition-colors">
                          Done
                        </button>
                        <button onClick={() => handleEventTaskReview(task.id, 'revise')}
                          className="text-[10px] font-bold uppercase tracking-widest text-orange bg-orange/10 px-2 py-1 hover:bg-orange/20 transition-colors">
                          Revise
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task list by person */}
      {viewMode === 'team' && (
      sortedPeople.length === 0 ? (
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
      ))}
    </div>
  )
}
