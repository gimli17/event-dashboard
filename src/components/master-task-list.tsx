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
}

interface TaskComment {
  id: string
  task_id: string
  author: string
  message: string
  created_at: string
}

const priorityColors: Record<string, string> = {
  'ultra-high': 'bg-red text-white',
  high: 'bg-orange text-white',
  medium: 'bg-gold text-white',
  backlog: 'bg-black/10 text-muted',
}

const priorityLabels: Record<string, string> = {
  'ultra-high': 'ULTRA-HIGH',
  high: 'HIGH',
  medium: 'MEDIUM',
  backlog: 'BACKLOG',
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

type FilterPriority = 'all' | 'ultra-high' | 'high' | 'medium' | 'backlog'

export function MasterTaskList() {
  const { displayName } = useUser()
  const [tasks, setTasks] = useState<MasterTask[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [sending, setSending] = useState(false)
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
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
      setLoading(false)
    }
    fetch()
  }, [])

  // Realtime for comments
  useEffect(() => {
    const channel = supabase
      .channel('master-comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'master_task_comments' }, (payload) => {
        const c = payload.new as TaskComment
        setComments((prev) => {
          if (prev.some((x) => x.id === c.id)) return prev
          return [...prev, c]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleStatusChange = async (task: MasterTask, newStatus: string) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))
    await supabase.from('master_tasks').update({ status: newStatus, updated_at: new Date().toISOString() } as never).eq('id', task.id)
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

  // Filters
  let filtered = filterPriority === 'all' ? tasks : tasks.filter((t) => t.priority === filterPriority)
  if (filterAssignee !== 'all') {
    filtered = filtered.filter((t) => t.assignee?.includes(filterAssignee))
  }

  const assignees = ['all', ...new Set(
    tasks.flatMap((t) => t.assignee?.split(', ') ?? []).filter(Boolean)
  )].sort()

  const ultraHighCount = tasks.filter((t) => t.priority === 'ultra-high').length
  const highCount = tasks.filter((t) => t.priority === 'high').length
  const completeCount = tasks.filter((t) => t.status === 'complete').length

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
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Priority:</span>
          {(['all', 'ultra-high', 'high', 'medium', 'backlog'] as FilterPriority[]).map((p) => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${filterPriority === p ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>
              {p === 'all' ? 'All' : priorityLabels[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Owner:</span>
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}
            className="border-2 border-black/20 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer">
            {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-0">
        {filtered.map((task) => {
          const taskComments = comments.filter((c) => c.task_id === task.id)
          const isExpanded = expandedTask === task.id

          return (
            <div key={task.id} className="border-b-2 border-black/5">
              {/* Task header row */}
              <button
                onClick={() => { setExpandedTask(isExpanded ? null : task.id); setCommentInput('') }}
                className="w-full text-left px-5 py-4 hover:bg-cream-dark transition-colors flex items-start gap-4"
              >
                <span className={`shrink-0 px-2 py-1 text-[9px] font-bold tracking-widest uppercase text-center w-20 ${priorityColors[task.priority]}`}>
                  {priorityLabels[task.priority]}
                </span>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold leading-tight">{task.title}</h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {task.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{task.assignee}</span>}
                    {task.deadline && <span className="text-[10px] text-muted uppercase tracking-wider">Due {task.deadline}</span>}
                    {taskComments.length > 0 && (
                      <span className="text-[10px] font-bold text-gold uppercase tracking-wider">{taskComments.length} comment{taskComments.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                <span className={`shrink-0 px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${statusColors[task.status]}`}>
                  {statusLabels[task.status]}
                </span>
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
                        {task.action_items.split('\n').map((item, i) => (
                          <li key={i} className="text-xs flex items-start gap-2">
                            <span className="text-muted mt-0.5">—</span>
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
  )
}
