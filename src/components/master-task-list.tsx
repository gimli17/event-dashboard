'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'

interface MasterTask {
  id: string
  title: string
  assignee: string | null
  priority: string
  status: string
  deadline: string | null
  current_status: string | null
  overview: string | null
  action_items: string | null
  dan_comments: string | null
  sort_order: number
  event_id: string | null
  week_of: string | null
}

interface TaskComment {
  id: string
  task_id: string
  author: string
  message: string
  created_at: string
}

interface EventProgress {
  event_id: string
  total: number
  done: number
}

const priorityOrder = ['ultra-high', 'high', 'medium', 'backlog']

const priorityColors: Record<string, string> = {
  'ultra-high': 'bg-red text-white',
  high: 'bg-orange text-white',
  medium: 'bg-gold text-white',
  backlog: 'bg-black/20 text-black',
}

const priorityLabels: Record<string, string> = {
  'ultra-high': 'ULTRA-HIGH PRIORITY',
  high: 'HIGH PRIORITY',
  medium: 'MEDIUM PRIORITY',
  backlog: 'BACKLOG — DEPRIORITIZED',
}

const priorityDeadlines: Record<string, string> = {
  'ultra-high': 'Deadline 4/1',
  high: 'Deadline 4/3',
  medium: 'Deadline 4/6',
  backlog: '',
}

const statusLabels: Record<string, string> = {
  'not-started': 'NOT STARTED',
  'in-progress': 'IN PROGRESS',
  blocked: 'BLOCKED',
  complete: 'DONE',
}

const statusColors: Record<string, string> = {
  'not-started': 'text-muted bg-black/5',
  'in-progress': 'text-orange bg-orange/10',
  blocked: 'text-red bg-red/10',
  complete: 'text-green bg-green/10',
}

type ViewMode = 'all' | 'this-week'

export function MasterTaskList() {
  const { displayName } = useUser()
  const [tasks, setTasks] = useState<MasterTask[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [eventProgress, setEventProgress] = useState<EventProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [sending, setSending] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const commentEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetch() {
      const [tasksRes, commentsRes] = await Promise.all([
        supabase.from('master_tasks').select('*').order('sort_order'),
        supabase.from('master_task_comments').select('*').order('created_at'),
      ])
      if (tasksRes.data) setTasks(tasksRes.data as MasterTask[])
      if (commentsRes.data) setComments(commentsRes.data as TaskComment[])

      // Fetch event task progress for linked tasks
      const { data: eventTasks } = await supabase.from('event_tasks').select('event_id, status')
      if (eventTasks) {
        const progressMap: Record<string, { total: number; done: number }> = {}
        for (const et of eventTasks as { event_id: string; status: string }[]) {
          if (!progressMap[et.event_id]) progressMap[et.event_id] = { total: 0, done: 0 }
          progressMap[et.event_id].total++
          if (et.status === 'complete') progressMap[et.event_id].done++
        }
        setEventProgress(
          Object.entries(progressMap).map(([event_id, p]) => ({ event_id, ...p }))
        )
      }

      setLoading(false)
    }
    fetch()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('master-comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'master_task_comments' }, (payload) => {
        const c = payload.new as TaskComment
        setComments((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, c])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleStatusChange = async (task: MasterTask, newStatus: string) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))
    await supabase.from('master_tasks').update({ status: newStatus, updated_at: new Date().toISOString() } as never).eq('id', task.id)

    if (displayName) {
      await supabase.from('master_task_comments').insert({
        task_id: task.id,
        author: displayName,
        message: `Changed status to ${statusLabels[newStatus]}`,
      } as never)
    }
  }

  const handleAddComment = async (taskId: string) => {
    if (!commentInput.trim() || !displayName || sending) return
    setSending(true)
    await supabase.from('master_task_comments').insert({
      task_id: taskId,
      author: displayName,
      message: commentInput.trim(),
    } as never)
    setCommentInput('')
    setSending(false)
    setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // Filter
  let filtered = tasks
  if (viewMode === 'this-week') {
    filtered = filtered.filter((t) => t.week_of === '2026-03-30' && t.priority !== 'backlog')
  }
  if (filterAssignee !== 'all') {
    filtered = filtered.filter((t) => t.assignee?.includes(filterAssignee))
  }

  // Group by priority
  const grouped: Record<string, MasterTask[]> = {}
  for (const task of filtered) {
    if (!grouped[task.priority]) grouped[task.priority] = []
    grouped[task.priority].push(task)
  }

  const assignees = ['all', ...new Set(
    tasks.flatMap((t) => t.assignee?.split(', ') ?? []).filter(Boolean)
  )].sort()

  const ultraHighCount = tasks.filter((t) => t.priority === 'ultra-high').length
  const highCount = tasks.filter((t) => t.priority === 'high').length
  const completeCount = tasks.filter((t) => t.status === 'complete').length
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading...</p></div>
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Stats */}
      <div className="flex items-center gap-8 mb-8 flex-wrap">
        <div><p className="text-3xl font-bold">{tasks.length}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Total</p></div>
        <div><p className="text-3xl font-bold text-red">{ultraHighCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Ultra-High</p></div>
        <div><p className="text-3xl font-bold text-orange">{highCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">High</p></div>
        <div><p className="text-3xl font-bold text-green">{completeCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Complete</p></div>
        {blockedCount > 0 && (
          <div><p className="text-3xl font-bold text-red">{blockedCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Blocked</p></div>
        )}
      </div>

      {/* View toggle + filters */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('this-week')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${viewMode === 'this-week' ? 'bg-red text-white border-red' : 'bg-white text-black border-black/20 hover:border-black'}`}>
            This Week
          </button>
          <button onClick={() => setViewMode('all')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${viewMode === 'all' ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>
            All Priorities
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Owner:</span>
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}
            className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer">
            {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Tasks grouped by priority */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-muted text-center py-12 uppercase tracking-widest text-xs font-bold">No tasks match this filter.</p>
      ) : (
        <div className="space-y-0">
          {priorityOrder
            .filter((p) => grouped[p])
            .map((priority) => (
              <div key={priority}>
                {/* Priority section header */}
                <div className={`${priorityColors[priority]} px-6 py-4 flex items-center justify-between mt-6`}>
                  <div className="flex items-baseline gap-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase">
                      {priorityLabels[priority]}
                    </h2>
                    {priorityDeadlines[priority] && (
                      <span className="text-xs font-bold tracking-wider opacity-70 uppercase">
                        {priorityDeadlines[priority]}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold tracking-wider opacity-70">
                    {grouped[priority].length} ITEM{grouped[priority].length !== 1 ? 'S' : ''}
                  </span>
                </div>

                {/* Tasks in this priority */}
                <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                  {grouped[priority].map((task, i) => {
                    const taskComments = comments.filter((c) => c.task_id === task.id)
                    const isExpanded = expandedTask === task.id
                    const ep = task.event_id ? eventProgress.find((e) => e.event_id === task.event_id) : null
                    const epPercent = ep ? Math.round((ep.done / ep.total) * 100) : null

                    return (
                      <div key={task.id} className={i > 0 ? 'border-t border-black/5' : ''}>
                        <button
                          onClick={() => { setExpandedTask(isExpanded ? null : task.id); setCommentInput('') }}
                          className="w-full text-left px-5 py-4 hover:bg-cream-dark transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold leading-tight">{task.title}</h3>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {task.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{task.assignee}</span>}
                                {task.deadline && <span className="text-[10px] text-muted uppercase tracking-wider">Due {task.deadline}</span>}
                                {taskComments.length > 0 && (
                                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider">{taskComments.length} comment{taskComments.length !== 1 ? 's' : ''}</span>
                                )}
                                {ep && (
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${epPercent === 100 ? 'text-green' : 'text-blue'}`}>
                                    Event: {ep.done}/{ep.total} tasks ({epPercent}%)
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className={`shrink-0 px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${statusColors[task.status]}`}>
                              {statusLabels[task.status]}
                            </span>
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-black/5 bg-white">
                            <div className="grid gap-4 sm:grid-cols-2 pt-4">
                              {task.current_status && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Current Status</p>
                                  <p className="text-xs">{task.current_status}</p>
                                </div>
                              )}
                              {task.overview && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Overview</p>
                                  <p className="text-xs">{task.overview}</p>
                                </div>
                              )}
                            </div>

                            {task.action_items && (
                              <div className="mt-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Action Items</p>
                                <ul className="space-y-1">
                                  {task.action_items.split('\n').map((item, idx) => (
                                    <li key={idx} className="text-xs flex items-start gap-2">
                                      <span className="text-muted mt-0.5">&mdash;</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {task.dan_comments && (
                              <div className="mt-4 border-l-4 border-red pl-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red mb-1">Dan&apos;s Comments</p>
                                <p className="text-xs italic">{task.dan_comments}</p>
                              </div>
                            )}

                            {/* Event link */}
                            {task.event_id && (
                              <div className="mt-4">
                                <a
                                  href={`/events/${task.event_id}`}
                                  className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue hover:text-red transition-colors border-2 border-current px-3 py-1.5"
                                >
                                  View Linked Event &rarr;
                                  {ep && <span>({ep.done}/{ep.total} tasks done)</span>}
                                </a>
                              </div>
                            )}

                            {/* Status change */}
                            <div className="mt-4 flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Status:</span>
                              {['not-started', 'in-progress', 'blocked', 'complete'].map((s) => (
                                <button key={s} onClick={() => handleStatusChange(task, s)}
                                  className={`px-2 py-1 text-[9px] font-bold tracking-widest uppercase transition-all ${task.status === s ? statusColors[s] : 'bg-black/5 text-muted/40 hover:text-muted'}`}>
                                  {statusLabels[s]}
                                </button>
                              ))}
                            </div>

                            {/* Comments */}
                            <div className="mt-4 border-t-2 border-black/5 pt-4">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
                                Comments ({taskComments.length})
                              </p>

                              {taskComments.length > 0 && (
                                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                                  {taskComments.map((c) => (
                                    <div key={c.id} className="text-xs">
                                      <span className="font-bold text-blue">{c.author}</span>
                                      <span className="text-muted mx-1">&middot;</span>
                                      <span className="text-muted">{new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      <p className="mt-0.5">{c.message}</p>
                                    </div>
                                  ))}
                                  <div ref={commentEndRef} />
                                </div>
                              )}

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={commentInput}
                                  onChange={(e) => setCommentInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(task.id) }}
                                  placeholder={displayName ? 'ADD A COMMENT...' : 'SET NAME FIRST'}
                                  disabled={!displayName}
                                  className="flex-1 border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue disabled:opacity-40"
                                />
                                <button
                                  onClick={() => handleAddComment(task.id)}
                                  disabled={!commentInput.trim() || !displayName || sending}
                                  className="bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-blue transition-colors disabled:opacity-40"
                                >
                                  Post
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
