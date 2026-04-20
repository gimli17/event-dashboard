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

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
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

interface FocusComment {
  id: string
  author: string
  text: string
  created_at: string
}

interface FocusItem {
  id: string
  owner: string
  title: string
  stream: string | null
  master_task_id: string | null
  sort_order: number
  completed: boolean
  priority: string
  deadline: string | null
  notes: string | null
  comments: FocusComment[]
}

type OpenItem = { type: 'task'; id: string } | { type: 'focus'; id: string } | null

export function TeamView() {
  const { displayName } = useUser()
  const [tasks, setTasks] = useState<MasterTask[]>([])
  const [focusItems, setFocusItems] = useState<FocusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<string>(() =>
    displayName && (ALL_TEAM_MEMBERS as readonly string[]).includes(displayName)
      ? displayName
      : 'Sabrina',
  )
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set(['ultra-high', 'high']))
  const [openItem, setOpenItem] = useState<OpenItem>(null)
  const [focusedStream, setFocusedStream] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      const [tRes, fRes] = await Promise.all([
        supabase
          .from('master_tasks')
          .select('id, title, status, assignee, priority, links, current_status, overview, action_items, deadline, initiative')
          .is('deleted_at', null)
          .neq('status', 'complete'),
        supabase
          .from('daily_priorities')
          .select('*')
          .is('deleted_at', null)
          .order('sort_order', { ascending: true }),
      ])
      if (tRes.data) setTasks(tRes.data as MasterTask[])
      if (fRes.data) setFocusItems(fRes.data as FocusItem[])
      setLoading(false)
    }
    fetchAll()
  }, [])

  const orderedMembers = [...ALL_TEAM_MEMBERS].sort((a, b) => {
    if (a === displayName) return -1
    if (b === displayName) return 1
    return a.localeCompare(b)
  })

  const personTasks = tasks.filter((t) => t.assignee?.includes(selectedPerson))
  const personFocus = focusItems.filter((f) => f.owner === selectedPerson && !f.completed)

  const applyPriorityFilter = <T extends { priority: string }>(arr: T[]) =>
    priorityFilter.size === 0 ? arr : arr.filter((x) => priorityFilter.has(x.priority))

  const visibleTasks = applyPriorityFilter(personTasks)
  const visibleFocus = applyPriorityFilter(personFocus)

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
    if (displayName && updates.title) logActivity(displayName, 'updated', 'task', id, updates.title)
  }

  const handleFocusUpdate = async (id: string, updates: Partial<FocusItem>) => {
    setFocusItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)))
    await supabase
      .from('daily_priorities')
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handleFocusDelete = async (id: string) => {
    setFocusItems((prev) => prev.filter((f) => f.id !== id))
    setOpenItem((prev) => (prev?.type === 'focus' && prev.id === id ? null : prev))
    await supabase
      .from('daily_priorities')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handleFocusAdd = async (streamKey: string, title: string) => {
    if (!title.trim()) return
    const id = makeId('dp')
    const streamItems = focusItems.filter((f) => f.stream === streamKey && f.owner === selectedPerson)
    const nextOrder = streamItems.length > 0 ? Math.max(...streamItems.map((i) => i.sort_order)) + 1 : 0
    const item: FocusItem = {
      id,
      owner: selectedPerson,
      title: title.trim(),
      stream: streamKey,
      master_task_id: null,
      sort_order: nextOrder,
      completed: false,
      priority: 'medium',
      deadline: null,
      notes: null,
      comments: [],
    }
    setFocusItems((prev) => [...prev, item])
    await supabase.from('daily_priorities').insert(item as never)
  }

  const handleFocusAddComment = async (id: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const author = displayName || selectedPerson
    const newComment: FocusComment = {
      id: makeId('pc'),
      author,
      text: trimmed,
      created_at: new Date().toISOString(),
    }
    let nextComments: FocusComment[] = []
    setFocusItems((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f
        nextComments = [...(f.comments || []), newComment]
        return { ...f, comments: nextComments }
      }),
    )
    await supabase
      .from('daily_priorities')
      .update({ comments: nextComments, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handleGenerateTask = async (focusId: string) => {
    const item = focusItems.find((f) => f.id === focusId)
    if (!item || item.master_task_id || !item.stream) return
    const taskId = makeId('mt')
    const newTask: MasterTask = {
      id: taskId,
      title: item.title,
      assignee: item.owner,
      priority: item.priority || 'medium',
      status: 'not-started',
      deadline: item.deadline,
      links: null,
      current_status: null,
      overview: item.notes,
      action_items: null,
      initiative: item.stream,
    }
    setTasks((prev) => [newTask, ...prev])
    setFocusItems((prev) => prev.map((f) => (f.id === focusId ? { ...f, master_task_id: taskId } : f)))

    await supabase.from('master_tasks').insert({
      ...newTask,
      current_status: null,
      action_items: null,
      dan_comments: null,
      update_to_dan: null,
      dan_feedback: null,
      dan_checklist: [],
      created_by: displayName || item.owner,
      sort_order: 0,
      event_id: null,
      week_of: null,
    } as never)
    await supabase
      .from('daily_priorities')
      .update({ master_task_id: taskId, updated_at: new Date().toISOString() } as never)
      .eq('id', focusId)

    if (displayName) logActivity(displayName, 'generated task from focus', 'task', taskId, item.title)
    // Switch drawer focus → the new task
    setOpenItem({ type: 'task', id: taskId })
  }

  const openTask = openItem?.type === 'task' ? tasks.find((t) => t.id === openItem.id) ?? null : null
  const openFocus = openItem?.type === 'focus' ? focusItems.find((f) => f.id === openItem.id) ?? null : null
  const openStream =
    openTask ? STREAMS.find((s) => s.key === openTask.initiative) ?? null :
    openFocus ? STREAMS.find((s) => s.key === openFocus.stream) ?? null :
    null

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
            const tCount = tasks.filter((t) => t.assignee?.includes(name)).length
            const fCount = focusItems.filter((f) => f.owner === name && !f.completed).length
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
                  {tCount + fCount}
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
          {visibleFocus.length + visibleTasks.length} of {personFocus.length + personTasks.length} shown
        </span>
      </div>

      {/* Stream board — overview grid or single-stream detail */}
      {focusedStream ? (
        (() => {
          const stream = STREAMS.find((s) => s.key === focusedStream)
          if (!stream) return null
          const streamFocus = [...personFocus.filter((f) => f.stream === stream.key)].sort(
            (a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4) || a.sort_order - b.sort_order,
          )
          const streamTasks = [...personTasks.filter((t) => t.initiative === stream.key)].sort(
            (a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4),
          )
          return (
            <StreamDetail
              stream={stream}
              focus={streamFocus}
              tasks={streamTasks}
              onBack={() => setFocusedStream(null)}
              onOpenFocus={(id) => setOpenItem({ type: 'focus', id })}
              onOpenTask={(id) => setOpenItem({ type: 'task', id })}
              onFocusAdd={(title) => handleFocusAdd(stream.key, title)}
              onGenerateTask={handleGenerateTask}
              onFocusDelete={handleFocusDelete}
            />
          )
        })()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {STREAMS.map((stream) => {
            const allStreamFocus = personFocus.filter((f) => f.stream === stream.key)
            const allStreamTasks = personTasks.filter((t) => t.initiative === stream.key)
            const streamFocus = [...visibleFocus.filter((f) => f.stream === stream.key)].sort(
              (a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4) || a.sort_order - b.sort_order,
            )
            const streamTasks = [...visibleTasks.filter((t) => t.initiative === stream.key)].sort(
              (a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4),
            )
            const hiddenCount =
              allStreamFocus.length + allStreamTasks.length - streamFocus.length - streamTasks.length
            return (
              <StreamColumn
                key={stream.key}
                stream={stream}
                focus={streamFocus}
                tasks={streamTasks}
                hiddenCount={hiddenCount}
                onOpenFocus={(id) => setOpenItem({ type: 'focus', id })}
                onOpenTask={(id) => setOpenItem({ type: 'task', id })}
                onFocusAdd={(title) => handleFocusAdd(stream.key, title)}
                onGenerateTask={handleGenerateTask}
                onFocusDelete={handleFocusDelete}
                onOpenStream={() => setFocusedStream(stream.key)}
              />
            )
          })}
        </div>
      )}

      {openTask && openStream && (
        <TaskDrawer
          key={openTask.id}
          task={openTask}
          stream={openStream}
          currentUser={displayName}
          onClose={() => setOpenItem(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
      {openFocus && openStream && (
        <FocusDrawer
          key={openFocus.id}
          item={openFocus}
          stream={openStream}
          onClose={() => setOpenItem(null)}
          onUpdate={handleFocusUpdate}
          onAddComment={handleFocusAddComment}
          onGenerateTask={handleGenerateTask}
          onDelete={handleFocusDelete}
        />
      )}
    </div>
  )
}

interface StreamColumnProps {
  stream: (typeof STREAMS)[number]
  focus: FocusItem[]
  tasks: MasterTask[]
  hiddenCount: number
  onOpenFocus: (id: string) => void
  onOpenTask: (id: string) => void
  onFocusAdd: (title: string) => void
  onGenerateTask: (focusId: string) => void
  onFocusDelete: (id: string) => void
  onOpenStream: () => void
}

function StreamColumn({ stream, focus, tasks, hiddenCount, onOpenFocus, onOpenTask, onFocusAdd, onGenerateTask, onFocusDelete, onOpenStream }: StreamColumnProps) {
  const [newTitle, setNewTitle] = useState('')
  return (
    <div className={`border-2 ${stream.border} bg-white flex flex-col`}>
      <button
        onClick={onOpenStream}
        className={`${stream.bg} text-white px-4 py-3 text-left w-full hover:brightness-110 transition`}
        title="Open full stream view"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xs font-bold tracking-widest uppercase leading-tight">
            <span className="mr-1.5">{stream.emoji}</span>
            {stream.label}
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 shrink-0">&rarr;</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-white/70 mt-0.5">
          {focus.length} focus &middot; {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          {hiddenCount > 0 && <span className="ml-1.5 text-white/60">&middot; +{hiddenCount} hidden</span>}
        </p>
      </button>

      {/* Brain-dump input */}
      <div className="px-3 py-2 bg-cream-dark/40 border-b border-black/10">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTitle.trim()) {
              onFocusAdd(newTitle)
              setNewTitle('')
            }
          }}
          placeholder="Brain dump..."
          className="w-full border-2 border-black/20 bg-white px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black placeholder:text-muted/40"
        />
      </div>

      {/* FOCUS section */}
      <div className="px-3 py-2 bg-black/5 border-b border-black/10 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-black">Focus</span>
        <span className="text-[9px] uppercase tracking-widest text-muted">{focus.length}</span>
      </div>
      {focus.length === 0 ? (
        <div className="px-4 py-3 text-center">
          <p className="text-[11px] text-muted italic">No focus items</p>
        </div>
      ) : (
        <div>
          {focus.map((f) => {
            const pCfg = PRIORITY_OPTIONS.find((p) => p.value === f.priority)
            return (
              <div key={f.id} className="flex items-start gap-1 px-3 py-2 border-t border-black/5 bg-white hover:bg-cream-dark/30 transition-colors">
                <button
                  onClick={() => onOpenFocus(f.id)}
                  className="flex-1 min-w-0 text-left"
                  title="Click to open details"
                >
                  <p className="text-[12px] font-semibold leading-snug text-black">{f.title}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${pCfg?.badge ?? 'bg-black/10 text-black'}`}>
                      {pCfg?.label ?? f.priority}
                    </span>
                    {f.master_task_id ? (
                      <span className="text-[8px] font-bold uppercase tracking-widest text-green">Task &#10003;</span>
                    ) : (
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted/60">Focus</span>
                    )}
                    {(f.comments?.length ?? 0) > 0 && (
                      <span className="text-[9px] uppercase tracking-widest text-muted/60">
                        {f.comments.length} {f.comments.length === 1 ? 'comment' : 'comments'}
                      </span>
                    )}
                  </div>
                </button>
                {!f.master_task_id && (
                  <button
                    onClick={() => onGenerateTask(f.id)}
                    className="text-[8px] font-bold uppercase tracking-widest text-blue hover:text-white hover:bg-blue border border-blue/40 px-1.5 py-1 shrink-0 transition-colors"
                    title="Generate a master task from this focus item"
                  >
                    &#x2192; Task
                  </button>
                )}
                <button
                  onClick={() => onFocusDelete(f.id)}
                  className="text-muted/30 hover:text-red text-base font-bold shrink-0 w-5 h-5 flex items-center justify-center"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* TASKS section */}
      <div className="px-3 py-2 bg-black/5 border-t border-b border-black/10 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-black">Tasks</span>
        <span className="text-[9px] uppercase tracking-widest text-muted">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="px-4 py-3 text-center">
          <p className="text-[11px] text-muted italic">No tasks</p>
        </div>
      ) : (
        <div>
          {tasks.map((t) => {
            const pCfg = PRIORITY_OPTIONS.find((p) => p.value === t.priority)
            return (
              <button
                key={t.id}
                onClick={() => onOpenTask(t.id)}
                className="block w-full text-left px-3 py-2.5 border-t border-black/5 bg-white hover:bg-cream-dark/40 transition-colors"
              >
                <p className="text-[13px] font-semibold leading-snug text-black">{t.title}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${pCfg?.badge ?? 'bg-black/10 text-black'}`}>
                    {pCfg?.label ?? t.priority}
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
}

interface TaskDrawerProps {
  task: MasterTask
  stream: (typeof STREAMS)[number]
  currentUser: string | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<MasterTask>) => Promise<void>
}

function TaskDrawer({ task, stream, currentUser, onClose, onUpdate }: TaskDrawerProps) {
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
      id: makeId('tc'),
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
              {stream.emoji} {stream.label} &middot; Task
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

interface FocusDrawerProps {
  item: FocusItem
  stream: (typeof STREAMS)[number]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<FocusItem>) => Promise<void>
  onAddComment: (id: string, text: string) => Promise<void>
  onGenerateTask: (id: string) => void
  onDelete: (id: string) => void
}

function FocusDrawer({ item, stream, onClose, onUpdate, onAddComment, onGenerateTask, onDelete }: FocusDrawerProps) {
  const [titleDraft, setTitleDraft] = useState(item.title)
  const [notesDraft, setNotesDraft] = useState(item.notes || '')
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex">
      <button onClick={onClose} aria-label="Close" className="flex-1 bg-black/40" />
      <aside className="w-full max-w-lg bg-white border-l-2 border-black overflow-y-auto">
        <div className={`${stream.bg} text-white px-6 py-5 flex items-start justify-between gap-3 sticky top-0 z-10`}>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              {stream.emoji} {stream.label} &middot; Focus
            </p>
            <textarea
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                if (titleDraft.trim() && titleDraft !== item.title) onUpdate(item.id, { title: titleDraft.trim() })
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
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={item.priority}
              onChange={(e) => onUpdate(item.id, { priority: e.target.value })}
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border-0 cursor-pointer focus:outline-none ${
                PRIORITY_OPTIONS.find((p) => p.value === item.priority)?.badge ?? 'bg-black/10 text-black'
              }`}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value} className="text-black bg-white">
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={item.stream || ''}
              onChange={(e) => onUpdate(item.id, { stream: e.target.value || null })}
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
              value={item.deadline || ''}
              onChange={(e) => onUpdate(item.id, { deadline: e.target.value || null })}
              className="border border-black/20 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-widest focus:outline-none"
            />
            {item.master_task_id ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-green px-2 py-1 bg-green/10">
                Task created &#10003;
              </span>
            ) : (
              <button
                onClick={() => onGenerateTask(item.id)}
                className="text-[11px] font-bold uppercase tracking-widest bg-blue text-white hover:bg-blue/80 px-3 py-1.5 transition-colors"
                title="Promote this focus item into a tracked master task"
              >
                &#x2192; Generate Task
              </button>
            )}
            <button
              onClick={() => {
                onDelete(item.id)
                onClose()
              }}
              className="ml-auto text-[10px] font-bold uppercase tracking-widest text-muted hover:text-red"
            >
              Delete
            </button>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Context</p>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => {
                if (notesDraft !== (item.notes || '')) onUpdate(item.id, { notes: notesDraft || null })
              }}
              placeholder="Add context, background, or details..."
              rows={8}
              className="w-full border-2 border-black/20 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-black placeholder:text-muted/40 resize-y"
            />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
              Comments {item.comments?.length ? `(${item.comments.length})` : ''}
            </p>
            {item.comments && item.comments.length > 0 && (
              <div className="space-y-3 mb-3">
                {item.comments.map((c) => (
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
                    <p className="text-sm leading-relaxed text-black/80 whitespace-pre-wrap mt-1">{c.text}</p>
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
                  if (e.key === 'Enter' && commentText.trim()) {
                    onAddComment(item.id, commentText)
                    setCommentText('')
                  }
                }}
                placeholder="Add a comment..."
                className="flex-1 border-2 border-black/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black placeholder:text-muted/40"
              />
              <button
                onClick={() => {
                  if (commentText.trim()) {
                    onAddComment(item.id, commentText)
                    setCommentText('')
                  }
                }}
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

interface StreamDetailProps {
  stream: (typeof STREAMS)[number]
  focus: FocusItem[]
  tasks: MasterTask[]
  onBack: () => void
  onOpenFocus: (id: string) => void
  onOpenTask: (id: string) => void
  onFocusAdd: (title: string) => void
  onGenerateTask: (focusId: string) => void
  onFocusDelete: (id: string) => void
}

function StreamDetail({ stream, focus, tasks, onBack, onOpenFocus, onOpenTask, onFocusAdd, onGenerateTask, onFocusDelete }: StreamDetailProps) {
  const [newTitle, setNewTitle] = useState('')
  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-muted hover:text-black transition-colors mb-3"
      >
        <span>&larr;</span> All streams
      </button>

      <div className={`border-2 ${stream.border} bg-white max-w-4xl mx-auto`}>
        <div className={`${stream.bg} text-white px-6 py-5`}>
          <h2 className="text-xl font-bold tracking-widest uppercase leading-tight">
            <span className="mr-2">{stream.emoji}</span>
            {stream.label}
          </h2>
          <p className="text-[11px] uppercase tracking-widest text-white/70 mt-1">
            {focus.length} focus &middot; {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} &middot; full list
          </p>
        </div>

        <div className="px-6 py-4 bg-cream-dark/40 border-b border-black/10">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) {
                onFocusAdd(newTitle)
                setNewTitle('')
              }
            }}
            placeholder="Brain dump a new focus item..."
            className="w-full border-2 border-black/20 bg-white px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black placeholder:text-muted/40"
          />
        </div>

        <div className="px-6 py-3 bg-black/5 border-b border-black/10 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-black">Focus Items</span>
          <span className="text-[11px] uppercase tracking-widest text-muted">{focus.length}</span>
        </div>
        {focus.length === 0 ? (
          <div className="px-6 py-6 text-center">
            <p className="text-sm text-muted italic">No focus items yet</p>
          </div>
        ) : (
          <div>
            {focus.map((f) => {
              const pCfg = PRIORITY_OPTIONS.find((p) => p.value === f.priority)
              return (
                <div key={f.id} className="flex items-start gap-3 px-6 py-3 border-t border-black/5 bg-white hover:bg-cream-dark/30 transition-colors">
                  <button onClick={() => onOpenFocus(f.id)} className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-semibold leading-snug text-black">{f.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${pCfg?.badge ?? 'bg-black/10 text-black'}`}>
                        {pCfg?.label ?? f.priority}
                      </span>
                      {f.master_task_id ? (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-green">Task &#10003;</span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted/60">Focus</span>
                      )}
                      {(f.comments?.length ?? 0) > 0 && (
                        <span className="text-[10px] uppercase tracking-widest text-muted/60">
                          {f.comments.length} {f.comments.length === 1 ? 'comment' : 'comments'}
                        </span>
                      )}
                      {f.notes && (
                        <span className="text-[11px] text-muted truncate max-w-md">&mdash; {f.notes}</span>
                      )}
                    </div>
                  </button>
                  {!f.master_task_id && (
                    <button
                      onClick={() => onGenerateTask(f.id)}
                      className="text-[10px] font-bold uppercase tracking-widest text-blue hover:text-white hover:bg-blue border border-blue/40 px-2 py-1 shrink-0 transition-colors"
                      title="Generate a master task from this focus item"
                    >
                      &#x2192; Task
                    </button>
                  )}
                  <button
                    onClick={() => onFocusDelete(f.id)}
                    className="text-muted/30 hover:text-red text-xl font-bold shrink-0 w-6 h-6 flex items-center justify-center"
                    title="Delete"
                  >
                    &times;
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="px-6 py-3 bg-black/5 border-t border-b border-black/10 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-black">Tasks</span>
          <span className="text-[11px] uppercase tracking-widest text-muted">{tasks.length}</span>
        </div>
        {tasks.length === 0 ? (
          <div className="px-6 py-6 text-center">
            <p className="text-sm text-muted italic">No tasks</p>
          </div>
        ) : (
          <div>
            {tasks.map((t) => {
              const pCfg = PRIORITY_OPTIONS.find((p) => p.value === t.priority)
              return (
                <button
                  key={t.id}
                  onClick={() => onOpenTask(t.id)}
                  className="block w-full text-left px-6 py-3 border-t border-black/5 bg-white hover:bg-cream-dark/40 transition-colors"
                >
                  <p className="text-[15px] font-semibold leading-snug text-black">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${pCfg?.badge ?? 'bg-black/10 text-black'}`}>
                      {pCfg?.label ?? t.priority}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-muted/70">
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                    {t.deadline && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red">
                        Due {new Date(t.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {t.overview && (
                      <span className="text-[11px] text-muted truncate max-w-md">&mdash; {t.overview}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
