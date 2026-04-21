'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import { logActivity } from '@/lib/activity-log'

const ALL_TEAM_MEMBERS = ['Cody', 'Sabrina', 'Joe', 'Bryan', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam'] as const

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

const STATUS_OPTIONS = ['not-started', 'in-progress', 'review', 'blocked', 'complete'] as const

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// If the stored content already contains HTML tags leave it; otherwise convert
// plain-text newlines to <br> so the contentEditable div preserves line breaks.
const plainToHtml = (text: string): string => {
  if (!text) return ''
  if (/<\/?[a-z][\s\S]*>/i.test(text)) return text
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
}
const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  review: 'Being Reviewed',
  blocked: 'Blocked',
  complete: 'Complete',
}

interface MasterTask {
  id: string
  title: string
  status: string
  assignee: string | null
  executive_lead: string | null
  priority: string
  links: string | null
  current_status: string | null
  overview: string | null
  action_items: string | null
  dan_comments: string | null
  deadline: string | null
  initiative: string
  milestone_id: string | null
  notion_page_url: string | null
}

interface MilestoneOption {
  id: string
  title: string
  initiative: string
}

const EXECUTIVES = ['Cody', 'Joe', 'Sabrina'] as const

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
  const [milestones, setMilestones] = useState<MilestoneOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set(['ultra-high', 'high']))
  const [openItem, setOpenItem] = useState<OpenItem>(null)
  const [focusedStream, setFocusedStream] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      const [tRes, fRes, mRes] = await Promise.all([
        supabase
          .from('master_tasks')
          .select('id, title, status, assignee, executive_lead, priority, links, current_status, overview, action_items, dan_comments, deadline, initiative, milestone_id, notion_page_url')
          .is('deleted_at', null)
          .neq('status', 'complete'),
        supabase
          .from('daily_priorities')
          .select('*')
          .is('deleted_at', null)
          .order('sort_order', { ascending: true }),
        supabase.from('milestones').select('id, title, initiative').order('sort_order'),
      ])
      if (tRes.data) setTasks(tRes.data as MasterTask[])
      if (fRes.data) setFocusItems(fRes.data as FocusItem[])
      if (mRes.data) setMilestones(mRes.data as MilestoneOption[])
      setLoading(false)
    }
    fetchAll()
  }, [])

  const orderedMembers = [...ALL_TEAM_MEMBERS].sort((a, b) => {
    if (a === displayName) return -1
    if (b === displayName) return 1
    return a.localeCompare(b)
  })

  const personTasks = selectedPerson ? tasks.filter((t) => t.assignee?.includes(selectedPerson)) : []
  const personFocus = selectedPerson ? focusItems.filter((f) => f.owner === selectedPerson && !f.completed && !f.master_task_id) : []

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

  const handleTaskDelete = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setOpenItem((prev) => (prev?.type === 'task' && prev.id === id ? null : prev))
    await supabase
      .from('master_tasks')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (displayName && task) logActivity(displayName, 'deleted', 'task', id, task.title)
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
    if (!title.trim() || !selectedPerson) return
    const id = makeId('dp')
    const streamItems = focusItems.filter((f) => f.stream === streamKey && f.owner === selectedPerson)
    const nextOrder = streamItems.length > 0 ? Math.max(...streamItems.map((i) => i.sort_order)) + 1 : 0
    const newPriority = 'medium'
    const item: FocusItem = {
      id,
      owner: selectedPerson,
      title: title.trim(),
      stream: streamKey,
      master_task_id: null,
      sort_order: nextOrder,
      completed: false,
      priority: newPriority,
      deadline: null,
      notes: null,
      comments: [],
    }
    setFocusItems((prev) => [...prev, item])
    // Make sure the new note is visible even if the priority filter would hide it
    if (priorityFilter.size > 0 && !priorityFilter.has(newPriority)) {
      setPriorityFilter((prev) => new Set([...prev, newPriority]))
    }
    await supabase.from('daily_priorities').insert(item as never)
  }

  const handleFocusAddComment = async (id: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const author = displayName || selectedPerson || 'Unknown'
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
      executive_lead: null,
      priority: item.priority || 'medium',
      status: 'not-started',
      deadline: item.deadline,
      links: null,
      current_status: item.notes,
      overview: null,
      action_items: null,
      dan_comments: null,
      initiative: item.stream,
      milestone_id: null,
      notion_page_url: null,
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
      {/* View switcher: Team Summary + person pills */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              setSelectedPerson(null)
              setFocusedStream(null)
            }}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
              selectedPerson === null
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-black/20 hover:border-black'
            }`}
          >
            Team Summary
          </button>
          <span className="inline-block w-px bg-black/10 mx-1" aria-hidden="true" />
          {orderedMembers.map((name) => {
            const isActive = name === selectedPerson
            const tCount = tasks.filter((t) => t.assignee?.includes(name)).length
            const fCount = focusItems.filter((f) => f.owner === name && !f.completed && !f.master_task_id).length
            if (tCount + fCount === 0) return null
            return (
              <button
                key={name}
                onClick={() => {
                  setSelectedPerson(name)
                  setFocusedStream(null)
                }}
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
          {selectedPerson === null
            ? `${(priorityFilter.size === 0 ? tasks.length : tasks.filter((t) => priorityFilter.has(t.priority)).length) + focusItems.filter((f) => !f.completed && !f.master_task_id && (priorityFilter.size === 0 || priorityFilter.has(f.priority))).length} items shown`
            : `${visibleFocus.length + visibleTasks.length} of ${personFocus.length + personTasks.length} shown`}
        </span>
      </div>

      {/* Main body — Team Summary vs Person Workspace */}
      {selectedPerson === null ? (
        <TeamSummary
          tasks={priorityFilter.size === 0 ? tasks : tasks.filter((t) => priorityFilter.has(t.priority))}
          focus={focusItems.filter((f) => !f.completed && !f.master_task_id && (priorityFilter.size === 0 || priorityFilter.has(f.priority)))}
          onOpenTask={(id) => setOpenItem({ type: 'task', id })}
          onOpenFocus={(id) => setOpenItem({ type: 'focus', id })}
          onPickPerson={(name) => {
            setSelectedPerson(name)
            setFocusedStream(null)
          }}
        />
      ) : (
        <PersonWorkspace
          person={selectedPerson}
          personFocus={personFocus}
          personTasks={personTasks}
          priorityFilter={priorityFilter}
          focusedStream={focusedStream}
          setFocusedStream={setFocusedStream}
          onOpenFocus={(id) => setOpenItem({ type: 'focus', id })}
          onOpenTask={(id) => setOpenItem({ type: 'task', id })}
          onFocusAdd={handleFocusAdd}
          onGenerateTask={handleGenerateTask}
          onFocusDelete={handleFocusDelete}
        />
      )}

      {openTask && openStream && (
        <TaskDrawer
          key={openTask.id}
          task={openTask}
          stream={openStream}
          milestones={milestones}
          currentUser={displayName}
          onClose={() => setOpenItem(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
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
          {focus.length} {focus.length === 1 ? "note" : "notes"} &middot; {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
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

      {/* NOTES section */}
      <div className="px-3 py-2 bg-black/5 border-b border-black/10 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-black">Notes</span>
        <span className="text-[9px] uppercase tracking-widest text-muted">{focus.length}</span>
      </div>
      {focus.length === 0 ? (
        <div className="px-4 py-3 text-center">
          <p className="text-[11px] text-muted italic">No notes</p>
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
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted/60">Notes</span>
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
                    title="Generate a master task from this note"
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
  milestones: MilestoneOption[]
  currentUser: string | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<MasterTask>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function TaskDrawer({ task, stream, milestones, currentUser, onClose, onUpdate, onDelete }: TaskDrawerProps) {
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [detailDraft, setDetailDraft] = useState(task.current_status || task.action_items || '')
  const [editingDetail, setEditingDetail] = useState(false)
  const [linksDraft, setLinksDraft] = useState(task.links || '')
  const [editingLinks, setEditingLinks] = useState(false)
  const [danCommentsDraft, setDanCommentsDraft] = useState(task.dan_comments || '')
  const [editingDanComments, setEditingDanComments] = useState(false)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [notionUrl, setNotionUrl] = useState<string | null>(task.notion_page_url)
  const [sendingNotion, setSendingNotion] = useState(false)
  const [notionError, setNotionError] = useState<string | null>(null)

  const firstAssignee = task.assignee?.split(',')[0]?.trim() || ''
  const danReserved = ['dan', 'dan task', 'dan-task', 'dantask'].includes(firstAssignee.toLowerCase())
  const canSendToNotion = !!firstAssignee && !danReserved

  const handleSendToNotion = async () => {
    setSendingNotion(true)
    setNotionError(null)
    try {
      const res = await fetch('/api/notion/create-task', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.url) setNotionUrl(data.url)
    } catch (err) {
      setNotionError(err instanceof Error ? err.message : 'Failed to send to Notion')
    } finally {
      setSendingNotion(false)
    }
  }

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

  const handleDeleteComment = async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id))
    await supabase.from('master_task_comments').delete().eq('id', id)
  }

  const availableMilestones = milestones.filter((m) => m.initiative === task.initiative)

  return (
    <div className="fixed inset-0 z-[70] flex">
      <button onClick={onClose} aria-label="Close" className="flex-1 bg-black/40" />
      <aside className="w-full max-w-3xl bg-white border-l-2 border-black overflow-y-auto">
        <div className={`${stream.bg} text-white px-8 py-5 flex items-start justify-between gap-3 sticky top-0 z-10`}>
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

        <div className="px-8 py-6 space-y-6">
          {/* Meta row: Owner / Exec / Due / Status / Priority / Milestone */}
          <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Owner:</span>
              <select
                value={(task.assignee || '').split(',')[0]?.trim() || ''}
                onChange={(e) => onUpdate(task.id, { assignee: e.target.value || null })}
                className={`border-none bg-transparent px-1 py-0.5 text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer hover:bg-black/5 ${task.assignee ? 'text-blue' : 'text-muted/40'}`}
              >
                <option value="">Unassigned</option>
                {ALL_TEAM_MEMBERS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Exec:</span>
              <select
                value={task.executive_lead || ''}
                onChange={(e) => onUpdate(task.id, { executive_lead: e.target.value || null })}
                className={`border-none bg-transparent px-1 py-0.5 text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer hover:bg-black/5 ${task.executive_lead ? 'text-purple' : 'text-muted/40'}`}
              >
                <option value="">None</option>
                {EXECUTIVES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Due:</span>
              <input
                type="date"
                min="2025-01-01"
                max="2100-12-31"
                value={task.deadline || ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (v) {
                    const y = parseInt(v.slice(0, 4), 10)
                    if (isNaN(y) || y < 2020 || y > 2100) return
                  }
                  onUpdate(task.id, { deadline: v || null })
                }}
                className="border-none bg-transparent px-1 py-0.5 text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer hover:bg-black/5"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Status:</span>
              <select
                value={task.status}
                onChange={(e) => onUpdate(task.id, { status: e.target.value })}
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-black/20 bg-white focus:outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Priority:</span>
              <select
                value={task.priority}
                onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border-0 cursor-pointer focus:outline-none ${PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.badge ?? 'bg-black/10 text-black'}`}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value} className="text-black bg-white">{p.label}</option>
                ))}
              </select>
            </div>
            {availableMilestones.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Milestone:</span>
                <select
                  value={task.milestone_id || ''}
                  onChange={(e) => onUpdate(task.id, { milestone_id: e.target.value || null })}
                  className={`border-none bg-transparent px-1 py-0.5 text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer hover:bg-black/5 ${task.milestone_id ? 'text-black' : 'text-muted/40'}`}
                >
                  <option value="">None</option>
                  {availableMilestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Dan's Comments */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red mb-1.5">Dan&apos;s Comments</p>
            {editingDanComments ? (
              <textarea
                value={danCommentsDraft}
                onChange={(e) => setDanCommentsDraft(e.target.value)}
                onBlur={() => {
                  if (danCommentsDraft !== (task.dan_comments || '')) onUpdate(task.id, { dan_comments: danCommentsDraft || null })
                  setEditingDanComments(false)
                }}
                onKeyDown={(e) => { if (e.key === 'Escape') { setDanCommentsDraft(task.dan_comments || ''); setEditingDanComments(false) } }}
                autoFocus
                rows={3}
                placeholder="Notes from Dan..."
                className="w-full border-2 border-red bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none placeholder:text-muted/40 resize-y"
              />
            ) : (
              <button
                onClick={() => setEditingDanComments(true)}
                className="flex items-start w-full text-left border-l-4 border-red bg-red/5 px-3 py-2 min-h-[48px] hover:bg-red/10 transition-colors"
              >
                {task.dan_comments ? (
                  <p className="text-sm leading-relaxed italic text-black/80 whitespace-pre-wrap w-full">
                    {task.dan_comments.replace(/<[^>]+>/g, '').trim()}
                  </p>
                ) : (
                  <span className="text-sm text-muted/50 italic">Click to add…</span>
                )}
              </button>
            )}
          </div>

          {/* Task Detail (merged current_status + action_items) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Task Detail</p>
              {editingDetail && (
                <p className="text-[9px] uppercase tracking-widest text-muted/60">
                  ⌘B bold &middot; ⌘I italic &middot; ⌘U underline
                </p>
              )}
            </div>
            {editingDetail ? (
              <div
                contentEditable
                suppressContentEditableWarning
                ref={(el) => {
                  if (el && !el.dataset.initialized) {
                    el.innerHTML = plainToHtml(task.current_status || task.action_items || '')
                    el.focus()
                    el.dataset.initialized = 'true'
                  }
                }}
                onBlur={(e) => {
                  const html = e.currentTarget.innerHTML
                  if (html !== (task.current_status || task.action_items || '')) {
                    onUpdate(task.id, { current_status: html || null })
                  }
                  setEditingDetail(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.currentTarget.blur()
                    setEditingDetail(false)
                  }
                }}
                className="w-full min-h-[200px] border-2 border-black bg-cream-dark/40 focus:bg-white px-4 py-3 text-sm leading-relaxed text-black focus:outline-none focus:border-blue"
              />
            ) : (
              <button
                onClick={() => setEditingDetail(true)}
                className="flex items-start w-full text-left bg-cream-dark/40 border-2 border-black/10 hover:border-black/30 px-4 py-3 min-h-[200px] transition-colors"
              >
                {task.current_status || task.action_items ? (
                  <div
                    className="text-sm leading-relaxed text-black/80 w-full"
                    dangerouslySetInnerHTML={{ __html: plainToHtml(task.current_status || task.action_items || '') }}
                  />
                ) : (
                  <span className="text-sm text-muted/50 italic">Click to add task detail…</span>
                )}
              </button>
            )}
          </div>

          {/* Links */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">Links</p>
            {editingLinks ? (
              <textarea
                value={linksDraft}
                onChange={(e) => setLinksDraft(e.target.value)}
                onBlur={() => {
                  if (linksDraft !== (task.links || '')) onUpdate(task.id, { links: linksDraft || null })
                  setEditingLinks(false)
                }}
                onKeyDown={(e) => { if (e.key === 'Escape') { setLinksDraft(task.links || ''); setEditingLinks(false) } }}
                autoFocus
                rows={3}
                placeholder="Paste URLs, one per line..."
                className="w-full border-2 border-black bg-white px-3 py-2 text-sm text-black focus:outline-none focus:border-blue resize-y"
              />
            ) : task.links ? (
              <div className="bg-cream-dark/20 border border-black/10 px-3 py-2 space-y-1">
                {task.links.split('\n').filter(Boolean).map((line, li) => {
                  const trimmed = line.trim()
                  const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/)
                  const url = urlMatch ? urlMatch[1] : (trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
                  return (
                    <a key={li} href={url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue hover:text-red underline block truncate">{trimmed}</a>
                  )
                })}
                <button onClick={() => setEditingLinks(true)}
                  className="text-[10px] text-muted/50 hover:text-muted mt-1">edit</button>
              </div>
            ) : (
              <button onClick={() => setEditingLinks(true)}
                className="w-full text-left text-sm text-muted/50 italic bg-cream-dark/20 border border-black/10 hover:border-black/30 px-3 py-2 transition-colors">Click to add links…</button>
            )}
          </div>

          {/* Comments */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
              Comments {comments.length > 0 ? `(${comments.length})` : ''}
            </p>
            {comments.length > 0 && (
              <div className="space-y-3 mb-3">
                {comments.map((c) => (
                  <div key={c.id} className="group border-l-2 border-black/30 pl-3 py-1 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
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
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-muted/30 hover:text-red text-lg font-bold shrink-0 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete comment"
                      aria-label="Delete comment"
                    >
                      &times;
                    </button>
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

          {/* Notion + Mark Done — bottom actions */}
          <div className="pt-4 border-t-2 border-black/10 space-y-3">
            {/* Notion sync */}
            <div>
              {notionUrl ? (
                <div className="flex items-center justify-between gap-3 bg-black/5 px-4 py-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-black">Synced to Notion &#10003;</span>
                  <a
                    href={notionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold uppercase tracking-widest text-blue hover:underline"
                  >
                    Open in Notion
                  </a>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleSendToNotion}
                    disabled={!canSendToNotion || sendingNotion}
                    className="w-full bg-black text-white hover:bg-black/80 px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={!firstAssignee ? 'Assign an owner first' : danReserved ? 'Owner cannot be Dan' : 'Send this task to Notion'}
                  >
                    {sendingNotion ? 'Sending…' : '\u2192 Generate Notion Task'}
                  </button>
                  {!canSendToNotion && (
                    <p className="text-[10px] text-muted mt-1.5 text-center">
                      {!firstAssignee ? 'Assign an owner first.' : 'Owner cannot be Dan.'}
                    </p>
                  )}
                  {notionError && (
                    <p className="text-[10px] text-red mt-1.5 text-center">{notionError}</p>
                  )}
                </>
              )}
            </div>

            {/* Mark Done */}
            <div className="flex items-center justify-between gap-3">
              {task.status === 'complete' ? (
                <>
                  <span className="text-sm font-bold uppercase tracking-widest text-green">Done &#10003;</span>
                  <button
                    onClick={() => onUpdate(task.id, { status: 'in-progress' })}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-black"
                  >
                    Reopen
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onUpdate(task.id, { status: 'complete' })}
                  className="w-full bg-green text-white hover:bg-green/80 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors"
                >
                  Mark Done
                </button>
              )}
            </div>

            {/* Delete */}
            <div className="flex justify-center">
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${task.title}"? It will be moved to the archive.`)) return
                  await onDelete(task.id)
                  onClose()
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-red transition-colors"
              >
                Delete task
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
    <div className="fixed inset-0 z-[70] flex">
      <button onClick={onClose} aria-label="Close" className="flex-1 bg-black/40" />
      <aside className="w-full max-w-lg bg-white border-l-2 border-black overflow-y-auto">
        <div className={`${stream.bg} text-white px-6 py-5 flex items-start justify-between gap-3 sticky top-0 z-10`}>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              {stream.emoji} {stream.label} &middot; Note
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
                title="Promote this note into a tracked master task"
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
            {focus.length} {focus.length === 1 ? "note" : "notes"} &middot; {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} &middot; full list
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
            placeholder="Brain dump a new note..."
            className="w-full border-2 border-black/20 bg-white px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black placeholder:text-muted/40"
          />
        </div>

        <div className="px-6 py-3 bg-black/5 border-b border-black/10 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-black">Notes</span>
          <span className="text-[11px] uppercase tracking-widest text-muted">{focus.length}</span>
        </div>
        {focus.length === 0 ? (
          <div className="px-6 py-6 text-center">
            <p className="text-sm text-muted italic">No notes yet</p>
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
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted/60">Notes</span>
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
                      title="Generate a master task from this note"
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

interface TeamSummaryProps {
  tasks: MasterTask[]
  focus: FocusItem[]
  onOpenTask: (id: string) => void
  onOpenFocus: (id: string) => void
  onPickPerson: (name: string) => void
}

type SummaryRow =
  | { kind: 'focus'; priority: string; deadline: string | null; title: string; id: string; item: FocusItem }
  | { kind: 'task'; priority: string; deadline: string | null; title: string; id: string; item: MasterTask }

function TeamSummary({ tasks, focus, onOpenTask, onOpenFocus, onPickPerson }: TeamSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      {STREAMS.map((stream) => {
        const rows: SummaryRow[] = [
          ...focus
            .filter((f) => f.stream === stream.key)
            .map<SummaryRow>((f) => ({ kind: 'focus', priority: f.priority, deadline: f.deadline, title: f.title, id: f.id, item: f })),
          ...tasks
            .filter((t) => t.initiative === stream.key)
            .map<SummaryRow>((t) => ({ kind: 'task', priority: t.priority, deadline: t.deadline, title: t.title, id: t.id, item: t })),
        ].sort((a, b) => {
          // 1. priority rank
          const pa = PRIORITY_RANK[a.priority] ?? 4
          const pb = PRIORITY_RANK[b.priority] ?? 4
          if (pa !== pb) return pa - pb
          // 2. deadline (earlier first; no deadline goes last)
          if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
          if (a.deadline) return -1
          if (b.deadline) return 1
          // 3. title for stability
          return a.title.localeCompare(b.title)
        })
        const total = rows.length
        return (
          <div key={stream.key} className={`border-2 ${stream.border} bg-white flex flex-col`}>
            <div className={`${stream.bg} text-white px-4 py-3`}>
              <h2 className="text-xs font-bold tracking-widest uppercase leading-tight">
                <span className="mr-1.5">{stream.emoji}</span>
                {stream.label}
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-white/70 mt-0.5">
                {total} {total === 1 ? 'item' : 'items'}
              </p>
            </div>
            {total === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[11px] text-muted italic">None</p>
              </div>
            ) : (
              <div>
                {rows.map((row) => {
                  const pCfg = PRIORITY_OPTIONS.find((p) => p.value === row.priority)
                  if (row.kind === 'focus') {
                    const f = row.item
                    return (
                      <div key={`f-${f.id}`} className="flex items-start gap-1 px-3 py-2 border-t border-black/5 bg-white hover:bg-cream-dark/30 transition-colors">
                        <button onClick={() => onOpenFocus(f.id)} className="flex-1 min-w-0 text-left">
                          <p className="text-[12px] font-semibold leading-snug text-black">{f.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${pCfg?.badge ?? 'bg-black/10 text-black'}`}>
                              {pCfg?.label ?? f.priority}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted/60">Notes</span>
                            {f.deadline && (
                              <span className="text-[8px] font-bold uppercase tracking-widest text-red">
                                Due {new Date(f.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onPickPerson(f.owner) }}
                          className="text-[8px] font-bold uppercase tracking-widest text-blue hover:underline shrink-0 mt-0.5"
                          title={`Open ${f.owner}'s workspace`}
                        >
                          {f.owner}
                        </button>
                      </div>
                    )
                  }
                  const t = row.item
                  const firstAssignee = t.assignee?.split(',')[0]?.trim() || null
                  return (
                    <div key={`t-${t.id}`} className="flex items-start gap-1 px-3 py-2 border-t border-black/5 bg-white hover:bg-cream-dark/30 transition-colors">
                      <button onClick={() => onOpenTask(t.id)} className="flex-1 min-w-0 text-left">
                        <p className="text-[12px] font-semibold leading-snug text-black">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${pCfg?.badge ?? 'bg-black/10 text-black'}`}>
                            {pCfg?.label ?? t.priority}
                          </span>
                          {t.deadline && (
                            <span className="text-[8px] font-bold uppercase tracking-widest text-red">
                              Due {new Date(t.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </button>
                      {firstAssignee && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onPickPerson(firstAssignee) }}
                          className="text-[8px] font-bold uppercase tracking-widest text-blue hover:underline shrink-0 mt-0.5 truncate max-w-[80px]"
                          title={`Open ${firstAssignee}'s workspace`}
                        >
                          {t.assignee}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface PersonWorkspaceProps {
  person: string
  personFocus: FocusItem[]
  personTasks: MasterTask[]
  priorityFilter: Set<string>
  focusedStream: string | null
  setFocusedStream: (s: string | null) => void
  onOpenFocus: (id: string) => void
  onOpenTask: (id: string) => void
  onFocusAdd: (streamKey: string, title: string) => void
  onGenerateTask: (focusId: string) => void
  onFocusDelete: (id: string) => void
}

function PersonWorkspace({
  person,
  personFocus,
  personTasks,
  priorityFilter,
  focusedStream,
  setFocusedStream,
  onOpenFocus,
  onOpenTask,
  onFocusAdd,
  onGenerateTask,
  onFocusDelete,
}: PersonWorkspaceProps) {
  // Only include streams where this person actually has something
  const availableStreams = STREAMS.filter((s) =>
    personFocus.some((f) => f.stream === s.key) || personTasks.some((t) => t.initiative === s.key),
  )

  // Auto-pick first available stream if none selected or current selection has no activities
  const activeStreamKey = focusedStream && availableStreams.some((s) => s.key === focusedStream)
    ? focusedStream
    : availableStreams[0]?.key ?? null

  const activeStream = activeStreamKey ? STREAMS.find((s) => s.key === activeStreamKey) ?? null : null

  if (availableStreams.length === 0) {
    return (
      <div className="border-2 border-black/10 bg-white py-16 text-center">
        <p className="text-sm text-muted uppercase tracking-widest font-bold">{person} has no notes or tasks yet.</p>
      </div>
    )
  }

  const apply = <T extends { priority: string }>(arr: T[]) =>
    priorityFilter.size === 0 ? arr : arr.filter((x) => priorityFilter.has(x.priority))

  const streamFocus = activeStream
    ? [...apply(personFocus.filter((f) => f.stream === activeStream.key))].sort(
        (a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4) || a.sort_order - b.sort_order,
      )
    : []
  const streamTasks = activeStream
    ? [...apply(personTasks.filter((t) => t.initiative === activeStream.key))].sort(
        (a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4),
      )
    : []

  return (
    <div className="flex gap-5">
      {/* Left sidebar: stream selector */}
      <aside className="w-52 shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{person}&apos;s Workstreams</p>
        <div className="flex flex-col border-2 border-black/10 bg-white">
          {availableStreams.map((s) => {
            const fCount = personFocus.filter((f) => f.stream === s.key).length
            const tCount = personTasks.filter((t) => t.initiative === s.key).length
            const isActive = s.key === activeStreamKey
            return (
              <button
                key={s.key}
                onClick={() => setFocusedStream(s.key)}
                className={`text-left px-3 py-3 border-b border-black/5 last:border-b-0 transition-colors ${
                  isActive ? `${s.bg} text-white` : 'bg-white text-black hover:bg-cream-dark/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold tracking-widest uppercase leading-tight">
                    <span className="mr-1.5">{s.emoji}</span>
                    {s.label}
                  </span>
                </div>
                <p className={`text-[10px] uppercase tracking-widest mt-1 ${isActive ? 'text-white/70' : 'text-muted'}`}>
                  {fCount} notes &middot; {tCount} {tCount === 1 ? 'task' : 'tasks'}
                </p>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Right: active stream detail */}
      <div className="flex-1 min-w-0">
        {activeStream ? (
          <PersonStreamPanel
            stream={activeStream}
            focus={streamFocus}
            tasks={streamTasks}
            onOpenFocus={onOpenFocus}
            onOpenTask={onOpenTask}
            onFocusAdd={(title) => onFocusAdd(activeStream.key, title)}
            onGenerateTask={onGenerateTask}
            onFocusDelete={onFocusDelete}
          />
        ) : (
          <div className="border-2 border-black/10 bg-white py-16 text-center">
            <p className="text-sm text-muted uppercase tracking-widest font-bold">Pick a workstream</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface PersonStreamPanelProps {
  stream: (typeof STREAMS)[number]
  focus: FocusItem[]
  tasks: MasterTask[]
  onOpenFocus: (id: string) => void
  onOpenTask: (id: string) => void
  onFocusAdd: (title: string) => void
  onGenerateTask: (focusId: string) => void
  onFocusDelete: (id: string) => void
}

function PersonStreamPanel({ stream, focus, tasks, onOpenFocus, onOpenTask, onFocusAdd, onGenerateTask, onFocusDelete }: PersonStreamPanelProps) {
  const [newTitle, setNewTitle] = useState('')
  return (
    <div className={`border-2 ${stream.border} bg-white`}>
      <div className={`${stream.bg} text-white px-6 py-5`}>
        <h2 className="text-xl font-bold tracking-widest uppercase leading-tight">
          <span className="mr-2">{stream.emoji}</span>
          {stream.label}
        </h2>
        <p className="text-[11px] uppercase tracking-widest text-white/70 mt-1">
          {focus.length} {focus.length === 1 ? "note" : "notes"} &middot; {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
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
          placeholder="Brain dump a new note..."
          className="w-full border-2 border-black/20 bg-white px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black placeholder:text-muted/40"
        />
      </div>

      <div className="px-6 py-3 bg-black/5 border-b border-black/10 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-black">Notes</span>
        <span className="text-[11px] uppercase tracking-widest text-muted">{focus.length}</span>
      </div>
      {focus.length === 0 ? (
        <div className="px-6 py-6 text-center">
          <p className="text-sm text-muted italic">No notes</p>
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
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted/60">Notes</span>
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
                    title="Generate a master task from this note"
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
  )
}
