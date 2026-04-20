'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import { logActivity } from '@/lib/activity-log'

const ALL_TEAM_MEMBERS = ['Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin'] as const

const STREAMS = [
  { key: 'brmf', label: 'Boulder Roots', emoji: '\uD83C\uDFB8', bg: 'bg-[#2a4e80]', border: 'border-[#2a4e80]' },
  { key: 'bold-summit', label: 'Bold Summit', emoji: '\uD83E\uDDE0', bg: 'bg-[#d4a020]', border: 'border-[#d4a020]' },
  { key: 'ensuring-colorado', label: 'Engage Colorado', emoji: '\uD83C\uDFD4\uFE0F', bg: 'bg-[#cc4444]', border: 'border-[#cc4444]' },
  { key: 'investments', label: 'Investments', emoji: '\uD83D\uDCBC', bg: 'bg-[#2a7d5c]', border: 'border-[#2a7d5c]' },
  { key: 'loud-bear', label: 'Loud Bear', emoji: '\uD83D\uDC3B', bg: 'bg-[#8b5a3c]', border: 'border-[#8b5a3c]' },
] as const

const PRIORITY_OPTIONS = [
  { value: 'ultra-high', label: 'Very High', badge: 'bg-red text-white' },
  { value: 'high', label: 'High', badge: 'bg-orange text-white' },
  { value: 'medium', label: 'Medium', badge: 'bg-gold text-white' },
  { value: 'low', label: 'Low', badge: 'bg-blue text-white' },
  { value: 'backlog', label: 'Backlog', badge: 'bg-black/20 text-black' },
] as const

const PRIORITY_RANK: Record<string, number> = { 'ultra-high': 0, high: 1, medium: 2, low: 3, backlog: 4 }

const STATUS_OPTIONS = ['not-started', 'in-progress', 'blocked', 'complete'] as const
const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  blocked: 'Blocked',
  complete: 'Complete',
  review: 'In Review',
}

interface MasterTask {
  id: string
  title: string
  status: string
  assignee: string | null
  priority: string
  links: string | null
  current_status: string | null
  overview: string | null
  action_items: string | null
  deadline: string | null
  initiative: string
}

interface TaskComment {
  id: string
  task_id: string
  author: string
  message: string
  created_at: string
}

export function TeamView() {
  const { displayName } = useUser()
  const [tasks, setTasks] = useState<MasterTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<string>(() =>
    displayName && (ALL_TEAM_MEMBERS as readonly string[]).includes(displayName)
      ? displayName
      : 'Sabrina',
  )
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set())
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTasks() {
      const { data } = await supabase
        .from('master_tasks')
        .select('id, title, status, assignee, priority, links, current_status, overview, action_items, deadline, initiative')
        .is('deleted_at', null)
        .neq('status', 'complete')
      if (data) setTasks(data as MasterTask[])
      setLoading(false)
    }
    fetchTasks()
  }, [])

  // Order team members — current user first, then alphabetical
  const orderedMembers = [...ALL_TEAM_MEMBERS].sort((a, b) => {
    if (a === displayName) return -1
    if (b === displayName) return 1
    return a.localeCompare(b)
  })

  const personTasks = tasks.filter((t) => t.assignee?.includes(selectedPerson))
  const visibleTasks = priorityFilter.size === 0
    ? personTasks
    : personTasks.filter((t) => priorityFilter.has(t.priority))

  const togglePriority = (p: string) => {
    setPriorityFilter((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  const handleTaskUpdate = async (id: string, updates: Partial<MasterTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
    await supabase
      .from('master_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (displayName && updates.title) {
      logActivity(displayName, 'updated', 'task', id, updates.title)
    }
  }

  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null
  const openStream = openTask ? STREAMS.find((s) => s.key === openTask.initiative) ?? null : null

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-16 text-center">
        <p className="text-muted uppercase tracking-widest text-sm font-bold">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      {/* Person pills */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Team Member</p>
        <div className="flex flex-wrap gap-1.5">
          {orderedMembers.map((name) => {
            const isActive = name === selectedPerson
            const count = tasks.filter((t) => t.assignee?.includes(name)).length
            return (
              <button
                key={name}
                onClick={() => setSelectedPerson(name)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                  isActive
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black/20 hover:border-black'
                }`}
              >
                {name}
                <span className={`ml-1.5 text-[10px] ${isActive ? 'text-white/60' : 'text-muted'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Priority filter chips */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Priority</p>
        <button
          onClick={() => setPriorityFilter(new Set())}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
            priorityFilter.size === 0
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-black/20 hover:border-black'
          }`}
        >
          All
        </button>
        {PRIORITY_OPTIONS.map((p) => {
          const active = priorityFilter.has(p.value)
          return (
            <button
              key={p.value}
              onClick={() => togglePriority(p.value)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                active ? `${p.badge} border-black` : 'bg-white text-black border-black/20 hover:border-black'
              }`}
            >
              {p.label}
            </button>
          )
        })}
        <span className="text-[10px] uppercase tracking-widest text-muted ml-auto">
          {visibleTasks.length} of {personTasks.length} shown
        </span>
      </div>

      {/* Stream board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {STREAMS.map((stream) => {
          const streamTasks = [...visibleTasks.filter((t) => t.initiative === stream.key)].sort(
            (a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4),
          )
          return (
            <div key={stream.key} className={`border-2 ${stream.border} bg-white flex flex-col`}>
              <div className={`${stream.bg} text-white px-4 py-3`}>
                <h2 className="text-xs font-bold tracking-widest uppercase leading-tight">
                  <span className="mr-1.5">{stream.emoji}</span>
                  {stream.label}
                </h2>
                <p className="text-[10px] uppercase tracking-widest text-white/70 mt-0.5">
                  {streamTasks.length} {streamTasks.length === 1 ? 'task' : 'tasks'}
                </p>
              </div>

              {streamTasks.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-[11px] text-muted italic">Nothing here</p>
                </div>
              ) : (
                <div>
                  {streamTasks.map((t) => {
                    const priorityCfg = PRIORITY_OPTIONS.find((p) => p.value === t.priority)
                    return (
                      <button
                        key={t.id}
                        onClick={() => setOpenTaskId(t.id)}
                        className="block w-full text-left px-3 py-2.5 border-t border-black/5 bg-white hover:bg-cream-dark/40 transition-colors"
                      >
                        <p className="text-[13px] font-semibold leading-snug text-black">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${priorityCfg?.badge ?? 'bg-black/10 text-black'}`}>
                            {priorityCfg?.label ?? t.priority}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-muted/70">
                            {STATUS_LABELS[t.status] ?? t.status}
                          </span>
                          {t.deadline && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-red">
                              Due {new Date(t.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {openTask && openStream && (
        <TaskDrawer
          key={openTask.id}
          task={openTask}
          stream={openStream}
          currentUser={displayName}
          onClose={() => setOpenTaskId(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  )
}

interface DrawerProps {
  task: MasterTask
  stream: (typeof STREAMS)[number]
  currentUser: string | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<MasterTask>) => Promise<void>
}

function TaskDrawer({ task, stream, currentUser, onClose, onUpdate }: DrawerProps) {
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [overviewDraft, setOverviewDraft] = useState(task.overview || '')
  const [currentStatusDraft, setCurrentStatusDraft] = useState(task.current_status || '')
  const [actionItemsDraft, setActionItemsDraft] = useState(task.action_items || '')
  const [linksDraft, setLinksDraft] = useState(task.links || '')
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    async function fetchComments() {
      const { data } = await supabase
        .from('master_task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true })
      if (data) setComments(data as TaskComment[])
    }
    fetchComments()
  }, [task.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleAddComment = async () => {
    const trimmed = commentText.trim()
    if (!trimmed) return
    const author = currentUser || 'Unknown'
    const newComment: TaskComment = {
      id: `tc-${Date.now()}`,
      task_id: task.id,
      author,
      message: trimmed,
      created_at: new Date().toISOString(),
    }
    setComments((prev) => [...prev, newComment])
    setCommentText('')
    await supabase.from('master_task_comments').insert(newComment as never)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button onClick={onClose} aria-label="Close" className="flex-1 bg-black/40" />
      <aside className="w-full max-w-lg bg-white border-l-2 border-black overflow-y-auto">
        <div className={`${stream.bg} text-white px-6 py-5 flex items-start justify-between gap-3 sticky top-0 z-10`}>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              {stream.emoji} {stream.label}
            </p>
            <textarea
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                if (titleDraft.trim() && titleDraft !== task.title) onUpdate(task.id, { title: titleDraft.trim() })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              rows={2}
              className="mt-1 w-full bg-transparent text-xl font-bold leading-tight text-white border-b border-transparent focus:border-white/50 focus:outline-none py-1 -mx-1 px-1 resize-none break-words"
            />
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl font-bold shrink-0" title="Close">
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={task.priority}
              onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border-0 cursor-pointer focus:outline-none ${
                PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.badge ?? 'bg-black/10 text-black'
              }`}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value} className="text-black bg-white">
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={task.status}
              onChange={(e) => onUpdate(task.id, { status: e.target.value })}
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 border border-black/20 bg-white focus:outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={task.initiative}
              onChange={(e) => onUpdate(task.id, { initiative: e.target.value })}
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 border border-black/20 bg-white focus:outline-none"
            >
              {STREAMS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={task.deadline || ''}
              onChange={(e) => onUpdate(task.id, { deadline: e.target.value || null })}
              className="border border-black/20 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-widest focus:outline-none"
            />
            <input
              type="text"
              value={task.assignee || ''}
              onChange={(e) => onUpdate(task.id, { assignee: e.target.value })}
              placeholder="Assignee"
              className="text-[11px] font-bold border border-black/20 bg-white px-2 py-1 focus:outline-none placeholder:text-muted/40"
            />
          </div>

          {/* Overview */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Overview</p>
            <textarea
              value={overviewDraft}
              onChange={(e) => setOverviewDraft(e.target.value)}
              onBlur={() => {
                if (overviewDraft !== (task.overview || '')) onUpdate(task.id, { overview: overviewDraft || null })
              }}
              placeholder="Background, scope, links..."
              rows={5}
              className="w-full border-2 border-black/20 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-black placeholder:text-muted/40 resize-y"
            />
          </div>

          {/* Current Status */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Current Status</p>
            <textarea
              value={currentStatusDraft}
              onChange={(e) => setCurrentStatusDraft(e.target.value)}
              onBlur={() => {
                if (currentStatusDraft !== (task.current_status || '')) onUpdate(task.id, { current_status: currentStatusDraft || null })
              }}
              placeholder="Where things stand right now..."
              rows={3}
              className="w-full border-2 border-black/20 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-black placeholder:text-muted/40 resize-y"
            />
          </div>

          {/* Action Items */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Action Items</p>
            <textarea
              value={actionItemsDraft}
              onChange={(e) => setActionItemsDraft(e.target.value)}
              onBlur={() => {
                if (actionItemsDraft !== (task.action_items || '')) onUpdate(task.id, { action_items: actionItemsDraft || null })
              }}
              placeholder="- Next step..."
              rows={4}
              className="w-full border-2 border-black/20 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-black placeholder:text-muted/40 resize-y"
            />
          </div>

          {/* Links */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Links</p>
            <textarea
              value={linksDraft}
              onChange={(e) => setLinksDraft(e.target.value)}
              onBlur={() => {
                if (linksDraft !== (task.links || '')) onUpdate(task.id, { links: linksDraft || null })
              }}
              placeholder="One URL per line..."
              rows={2}
              className="w-full border-2 border-black/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black placeholder:text-muted/40 resize-y"
            />
          </div>

          {/* Comments */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
              Comments {comments.length > 0 ? `(${comments.length})` : ''}
            </p>
            {comments.length > 0 && (
              <div className="space-y-3 mb-3">
                {comments.map((c) => (
                  <div key={c.id} className="border-l-2 border-black/30 pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-black">{c.author}</span>
                      <span className="text-[10px] text-muted">
                        {new Date(c.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-black/80 whitespace-pre-wrap mt-1">{c.message}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) handleAddComment()
                }}
                placeholder="Add a comment..."
                className="flex-1 border-2 border-black/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black placeholder:text-muted/40"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
