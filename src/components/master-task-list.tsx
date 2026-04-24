'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import { logActivity } from '@/lib/activity-log'
import { INITIATIVES, ALL_INITIATIVE_KEYS, type InitiativeKey } from '@/lib/initiatives'
import { WeeklyReviewButton } from './weekly-review'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface MasterTask {
  id: string
  title: string
  assignee: string | null
  executive_lead: string | null
  priority: string
  status: string
  deadline: string | null
  current_status: string | null
  overview: string | null
  action_items: string | null
  dan_comments: string | null
  links: string | null
  update_to_dan: string | null
  dan_feedback: string | null
  dan_checklist: { id: string; text: string; checked: boolean }[] | null
  sort_order: number
  event_id: string | null
  week_of: string | null
  initiative: string
  milestone_id: string | null
  for_daily: boolean
}

const EXECUTIVES = ['Cody', 'Joe', 'Sabrina'] as const

interface MilestoneOption {
  id: string
  title: string
  initiative: string
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

interface EventTaskRow {
  id: string
  event_id: string
  event_title: string
  event_day_label: string
  title: string
  status: string
  category: string
  assignee: string | null
  priority: string | null
}

const priorityOrder = ['ultra-high', 'high', 'medium', 'low', 'backlog']

const priorityColors: Record<string, string> = {
  'ultra-high': 'bg-red text-white',
  high: 'bg-orange text-white',
  medium: 'bg-gold text-white',
  low: 'bg-blue text-white',
  backlog: 'bg-black/20 text-black',
}

const priorityLabels: Record<string, string> = {
  'ultra-high': 'VERY HIGH PRIORITY',
  high: 'HIGH PRIORITY',
  medium: 'MEDIUM PRIORITY',
  low: 'LOW PRIORITY',
  backlog: 'BACKLOG — DEPRIORITIZED',
}

const priorityDeadlines: Record<string, string> = {
  'ultra-high': '',
  high: '',
  medium: '',
  low: '',
  backlog: '',
}

const statusLabels: Record<string, string> = {
  'not-started': 'NOT STARTED',
  'in-progress': 'IN PROGRESS',
  review: 'BEING REVIEWED',
  blocked: 'BLOCKED',
  complete: 'DONE',
}

const statusOrder = ['not-started', 'in-progress', 'review', 'blocked', 'complete']

const statusColors: Record<string, string> = {
  'not-started': 'text-muted bg-black/5',
  'in-progress': 'text-orange bg-orange/10',
  review: 'text-blue bg-blue/10',
  blocked: 'text-red bg-red/10',
  complete: 'text-green bg-green/10',
}

type ViewMode = 'all' | 'this-week' | 'completed' | 'deleted'

function DragHandle() {
  return (
    <span className="cursor-grab active:cursor-grabbing text-muted/30 hover:text-muted mr-2 select-none" title="Drag to reorder">
      &#x2630;
    </span>
  )
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : 'auto' as const,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start">
        <div {...attributes} {...listeners} className="pt-5 pl-3">
          <DragHandle />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export function MasterTaskList({ initiative }: { initiative?: InitiativeKey } = {}) {
  const { displayName } = useUser()
  const [tasks, setTasks] = useState<MasterTask[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [eventProgress, setEventProgress] = useState<EventProgress[]>([])
  const [eventTaskRows, setEventTaskRows] = useState<EventTaskRow[]>([])
  const [completedTasks, setCompletedTasks] = useState<EventTaskRow[]>([])
  const [deletedTasks, setDeletedTasks] = useState<MasterTask[]>([])
  const [milestoneOptions, setMilestoneOptions] = useState<MilestoneOption[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTask, setExpandedTask] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.slice(1)
    }
    return null
  })
  const [commentInput, setCommentInput] = useState('')
  const [sending, setSending] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterExec, setFilterExec] = useState('all')
  const [filterInitiative, setFilterInitiative] = useState<string>(initiative || 'all')
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingField, setEditingField] = useState<{ taskId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [titleValue, setTitleValue] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')
  const [newTaskDeadline, setNewTaskDeadline] = useState('')
  const [newTaskInitiative, setNewTaskInitiative] = useState<string>(initiative || 'brmf')
  const [activeId, setActiveId] = useState<string | null>(null)
  const teamMembers = ['Cody', 'Sabrina', 'Joe', 'Bryan', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dan']
  const commentEndRef = useRef<HTMLDivElement>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    async function fetch() {
      const [tasksRes, commentsRes, msRes] = await Promise.all([
        supabase.from('master_tasks').select('*').is('deleted_at', null).order('sort_order'),
        supabase.from('master_task_comments').select('*').order('created_at'),
        supabase.from('milestones').select('id, title, initiative').order('sort_order'),
      ])
      if (tasksRes.data) setTasks(tasksRes.data as MasterTask[])
      if (commentsRes.data) setComments(commentsRes.data as TaskComment[])
      if (msRes.data) setMilestoneOptions(msRes.data as MilestoneOption[])

      // Fetch event task progress for linked tasks
      const { data: eventTasks } = await supabase.from('event_tasks').select('id, event_id, title, status, category, assignee')
      if (eventTasks) {
        const progressMap: Record<string, { total: number; done: number }> = {}
        for (const et of eventTasks as { id: string; event_id: string; title: string; status: string; category: string; assignee: string | null }[]) {
          if (!progressMap[et.event_id]) progressMap[et.event_id] = { total: 0, done: 0 }
          progressMap[et.event_id].total++
          if (et.status === 'complete') progressMap[et.event_id].done++
        }
        setEventProgress(
          Object.entries(progressMap).map(([event_id, p]) => ({ event_id, ...p }))
        )

        // Build flat event task rows for the summary section
        const { data: events } = await supabase.from('events').select('id, title, day, day_label, date').order('date')
        if (events) {
          const eventMap: Record<string, { title: string; day_label: string }> = {}
          for (const e of events as { id: string; title: string; day_label: string }[]) {
            eventMap[e.id] = { title: e.title, day_label: e.day_label }
          }
          const rows: EventTaskRow[] = (eventTasks as { id: string; event_id: string; title: string; status: string; category: string; assignee: string | null; priority?: string | null }[])
            .filter((t) => eventMap[t.event_id])
            .map((t) => ({
              id: t.id,
              event_id: t.event_id,
              event_title: eventMap[t.event_id].title,
              event_day_label: eventMap[t.event_id].day_label,
              title: t.title,
              status: t.status,
              category: t.category,
              assignee: t.assignee,
              priority: t.priority ?? 'medium',
            }))
          setEventTaskRows(rows.filter((r) => r.status !== 'complete'))
          setCompletedTasks(rows.filter((r) => r.status === 'complete'))
        }
      }

      // Fetch deleted tasks
      const { data: deleted } = await supabase.from('master_tasks').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
      if (deleted) setDeletedTasks(deleted as MasterTask[])

      setLoading(false)

      // Auto-scroll to task if linked via hash, and ensure initiative filter doesn't hide it
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashId = window.location.hash.slice(1)
        if (tasksRes.data) {
          const linked = (tasksRes.data as MasterTask[]).find(t => t.id === hashId)
          if (linked && linked.initiative && !initiative) {
            setFilterInitiative('all')
          }
        }
        setTimeout(() => {
          const el = document.getElementById(hashId)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 400)
      }
    }
    fetch()

    // Refresh when another component (Quick Add, Brain Dump, /team) changes master_tasks
    const onChange = () => { fetch() }
    window.addEventListener('master-tasks-changed', onChange)
    const poll = setInterval(() => { if (document.visibilityState === 'visible') fetch() }, 15000)
    return () => {
      window.removeEventListener('master-tasks-changed', onChange)
      clearInterval(poll)
    }
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
      const action = newStatus === 'complete' ? 'completed' : `changed status to ${newStatus}`
      logActivity(displayName, action, 'task', task.id, task.title)
    }
  }

  const handlePriorityChange = async (task: MasterTask, newPriority: string) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: newPriority } : t)))
    await supabase.from('master_tasks').update({ priority: newPriority, updated_at: new Date().toISOString() } as never).eq('id', task.id)
  }

  const handleAddMasterTask = async () => {
    if (!newTaskTitle.trim() || !displayName) return
    const taskId = `mt-${Date.now()}`
    const newTask: MasterTask = {
      id: taskId,
      title: newTaskTitle.trim(),
      assignee: newTaskAssignee || null,
      executive_lead: null,
      priority: newTaskPriority,
      status: 'not-started',
      deadline: newTaskDeadline || null,
      current_status: null,
      overview: null,
      action_items: null,
      dan_comments: null,
      links: null,
      update_to_dan: null,
      dan_feedback: null,
      dan_checklist: [],
      sort_order: tasks.length + 1,
      event_id: null,
      week_of: '2026-03-30',
      initiative: newTaskInitiative,
      milestone_id: null,
      for_daily: false,
      // @ts-expect-error created_by not in MasterTask interface but exists in DB
      created_by: displayName || null,
    }
    setTasks((prev) => [...prev, newTask])
    setShowAddTask(false)
    setNewTaskTitle('')
    setNewTaskAssignee('')
    setNewTaskPriority('medium')
    setNewTaskDeadline('')
    setNewTaskInitiative(initiative || 'brmf')

    await supabase.from('master_tasks').insert(newTask as never)

    // Broadcast so /team and any other open views refresh immediately
    window.dispatchEvent(new CustomEvent('master-tasks-changed'))

    // Ping the assignee unless it's a self-assignment
    if (newTask.assignee && newTask.assignee !== displayName) {
      fetch('/api/slack/notify-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'task', taskId, actor: displayName }),
      }).catch(() => { /* fire-and-forget */ })
    }
  }

  // Parse comments for priority keywords and auto-reprioritize
  const handleAddComment = async (taskId: string) => {
    if (!commentInput.trim() || !displayName || sending) return
    setSending(true)

    const msg = commentInput.trim()

    // Check for priority keywords
    const lower = msg.toLowerCase()
    let newPriority: string | null = null
    if (lower.includes('move to ultra-high') || lower.includes('move to ultra high') || lower.includes('very high priority')) {
      newPriority = 'ultra-high'
    } else if (lower.includes('move to high') || lower.includes('high priority next week') || lower.includes('high next week')) {
      newPriority = 'high'
    } else if (lower.includes('move to medium') || lower.includes('medium priority')) {
      newPriority = 'medium'
    } else if (lower.includes('not a priority') || lower.includes('deprioritize') || lower.includes('move to backlog')) {
      newPriority = 'backlog'
    }

    // Optimistically add to local state
    const tempId = `temp-${Date.now()}`
    const newComment: TaskComment = {
      id: tempId,
      task_id: taskId,
      author: displayName,
      message: msg,
      created_at: new Date().toISOString(),
    }
    setComments((prev) => [...prev, newComment])

    const { data } = await supabase.from('master_task_comments').insert({
      task_id: taskId,
      author: displayName,
      message: msg,
    } as never).select().single()

    // Replace temp with real ID
    if (data) {
      setComments((prev) => prev.map((c) => c.id === tempId ? data as TaskComment : c))
    }

    if (newPriority) {
      const task = tasks.find((t) => t.id === taskId)
      if (task && task.priority !== newPriority) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority! } : t)))
        await supabase.from('master_tasks').update({ priority: newPriority, updated_at: new Date().toISOString() } as never).eq('id', taskId)
      }
    }

    setCommentInput('')
    setSending(false)
    setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTask = tasks.find((t) => t.id === active.id)
    const overTask = tasks.find((t) => t.id === over.id)
    if (!activeTask || !overTask) return

    // If dragged to a task in a different priority group, change priority
    if (activeTask.priority !== overTask.priority) {
      const newPriority = overTask.priority
      handlePriorityChange(activeTask, newPriority)
    }

    // Reorder within the same priority group
    const samePriorityTasks = tasks.filter((t) => t.priority === overTask.priority)
    const oldIndex = samePriorityTasks.findIndex((t) => t.id === active.id)
    const newIndex = samePriorityTasks.findIndex((t) => t.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(samePriorityTasks, oldIndex, newIndex)
      // Update sort_order for all items in this group
      const updates = reordered.map((t, i) => ({ ...t, sort_order: i }))
      setTasks((prev) => {
        const others = prev.filter((t) => t.priority !== overTask.priority)
        return [...others, ...updates].sort((a, b) => {
          const pA = priorityOrder.indexOf(a.priority)
          const pB = priorityOrder.indexOf(b.priority)
          if (pA !== pB) return pA - pB
          return a.sort_order - b.sort_order
        })
      })
      // Persist sort order
      for (const u of updates) {
        await supabase.from('master_tasks').update({ sort_order: u.sort_order } as never).eq('id', u.id)
      }
    }
  }

  const handleTitleEdit = (task: MasterTask) => {
    setEditingTitle(task.id)
    setTitleValue(task.title)
  }

  const handleTitleSave = async (taskId: string) => {
    if (!titleValue.trim()) { setEditingTitle(null); return }
    setEditingTitle(null)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: titleValue.trim() } : t)))
    await supabase.from('master_tasks').update({ title: titleValue.trim(), updated_at: new Date().toISOString() } as never).eq('id', taskId)
  }

  const handleAssigneeChange = async (task: MasterTask, newAssignee: string | null) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, assignee: newAssignee } : t)))
    await supabase.from('master_tasks').update({ assignee: newAssignee, updated_at: new Date().toISOString() } as never).eq('id', task.id)
  }

  const handleDeadlineChange = async (task: MasterTask, newDeadline: string | null) => {
    // Ignore malformed years (e.g. 0002) — happens when date input emits partial value
    if (newDeadline) {
      const yearNum = parseInt(newDeadline.slice(0, 4), 10)
      if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) return
    }
    // Auto-calculate priority based on deadline
    let autoPriority: string | null = null
    if (newDeadline) {
      const deadline = new Date(newDeadline + 'T23:59:59')
      const now = new Date()

      // Get start of current week (Monday)
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const thisMonday = new Date(now)
      thisMonday.setDate(now.getDate() + mondayOffset)
      thisMonday.setHours(0, 0, 0, 0)

      const thisSunday = new Date(thisMonday)
      thisSunday.setDate(thisMonday.getDate() + 6)
      thisSunday.setHours(23, 59, 59)

      const nextWednesday = new Date(thisMonday)
      nextWednesday.setDate(thisMonday.getDate() + 9) // Wednesday of next week
      nextWednesday.setHours(23, 59, 59)

      const nextSunday = new Date(thisMonday)
      nextSunday.setDate(thisMonday.getDate() + 13)
      nextSunday.setHours(23, 59, 59)

      if (deadline <= thisSunday) {
        autoPriority = 'ultra-high' // This week
      } else if (deadline <= nextWednesday) {
        autoPriority = 'high' // Early next week
      } else if (deadline <= nextSunday) {
        autoPriority = 'medium' // Late next week
      } else {
        autoPriority = 'low' // Beyond next week
      }
    }

    const updates: Record<string, unknown> = { deadline: newDeadline, updated_at: new Date().toISOString() }
    if (autoPriority && autoPriority !== task.priority) {
      updates.priority = autoPriority
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, deadline: newDeadline, priority: autoPriority! } : t)))
    } else {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, deadline: newDeadline } : t)))
    }

    await supabase.from('master_tasks').update(updates as never).eq('id', task.id)
  }

  const startEditing = (taskId: string, field: string, currentValue: string | null) => {
    setEditingField({ taskId, field })
    setEditValue(currentValue || '')
  }

  const saveField = async () => {
    if (!editingField) return
    const { taskId, field } = editingField
    const newValue = editValue.trim() || null
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, [field]: newValue } : t)))
    setEditingField(null)
    await supabase.from('master_tasks').update({ [field]: newValue, updated_at: new Date().toISOString() } as never).eq('id', taskId)
  }

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    await supabase.from('master_task_comments').delete().eq('id', commentId)
  }

  const handleEventTaskPriority = async (taskId: string) => {
    const nextP: Record<string, string> = { low: 'medium', medium: 'high', high: 'low' }
    setEventTaskRows((prev) => prev.map((t) => t.id === taskId ? { ...t, priority: nextP[t.priority || 'medium'] } : t))
    const row = eventTaskRows.find((t) => t.id === taskId)
    const newP = nextP[row?.priority || 'medium']
    await supabase.from('event_tasks').update({ priority: newP } as never).eq('id', taskId)
  }

  const handleEventTaskStatus = async (taskId: string) => {
    const nextS: Record<string, string> = { 'not-started': 'in-progress', 'in-progress': 'review', review: 'complete', complete: 'not-started' }
    const row = eventTaskRows.find((t) => t.id === taskId)
    if (!row) return
    const newS = nextS[row.status]
    setEventTaskRows((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newS } : t))
    await supabase.from('event_tasks').update({ status: newS } as never).eq('id', taskId)
  }

  // Filter — exclude completed and deleted from priority view
  let filtered = tasks.filter((t) => t.status !== 'complete')
  if (viewMode === 'this-week') {
    filtered = filtered.filter((t) => t.week_of === '2026-03-30' && t.priority !== 'backlog')
  }
  if (filterAssignee !== 'all') {
    filtered = filtered.filter((t) => t.assignee?.includes(filterAssignee))
  }
  if (filterExec !== 'all') {
    filtered = filtered.filter((t) => t.executive_lead === filterExec)
  }
  if (filterInitiative !== 'all') {
    filtered = filtered.filter((t) => t.initiative === filterInitiative)
  }

  // Group by priority, sort by deadline within each group
  const grouped: Record<string, MasterTask[]> = {}
  for (const task of filtered) {
    if (!grouped[task.priority]) grouped[task.priority] = []
    grouped[task.priority].push(task)
  }
  for (const p of Object.keys(grouped)) {
    grouped[p].sort((a, b) => {
      // Tasks with deadlines come first, sorted by deadline
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1
      return a.sort_order - b.sort_order
    })
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
        <div><p className="text-3xl font-bold text-red">{ultraHighCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Very High</p></div>
        <div><p className="text-3xl font-bold text-orange">{highCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">High</p></div>
        <div><p className="text-3xl font-bold text-green">{completeCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Complete</p></div>
        {blockedCount > 0 && (
          <div><p className="text-3xl font-bold text-red">{blockedCount}</p><p className="text-xs font-bold uppercase tracking-widest text-muted">Blocked</p></div>
        )}
      </div>

      {/* View toggle + filters */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('all')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${viewMode === 'all' ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>
            All Priorities
          </button>
          <button onClick={() => setViewMode('this-week')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${viewMode === 'this-week' ? 'bg-red text-white border-red' : 'bg-white text-black border-black/20 hover:border-black'}`}>
            This Week
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Owner:</span>
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}
            className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer">
            {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Exec:</span>
          <select value={filterExec} onChange={(e) => setFilterExec(e.target.value)}
            className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer">
            <option value="all">all</option>
            <option value="Cody">Cody</option>
            <option value="Joe">Joe</option>
            <option value="Sabrina">Sabrina</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Initiative:</span>
          <select value={filterInitiative} onChange={(e) => setFilterInitiative(e.target.value)}
            className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer">
            <option value="all">All</option>
            {ALL_INITIATIVE_KEYS.map((k) => <option key={k} value={k}>{INITIATIVES[k].shortLabel}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowAddTask(!showAddTask)}
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${showAddTask ? 'bg-red text-white border-red' : 'bg-white text-black border-black/20 hover:border-black'}`}
        >
          {showAddTask ? 'Cancel' : '+ Add Task'}
        </button>
      </div>

      {/* Add task form */}
      {showAddTask && (
        <div className="mb-6 border-2 border-black/10 bg-white px-5 py-4 space-y-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddMasterTask() }}
            placeholder="TASK TITLE..."
            className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black placeholder:text-muted/40 focus:outline-none focus:border-blue"
          />
          <div className="flex gap-2 flex-wrap">
            <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black">
              <option value="">Unassigned</option>
              {teamMembers.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}
              className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black">
              {priorityOrder.map((p) => <option key={p} value={p}>{p === 'ultra-high' ? 'Very High' : p === 'backlog' ? 'Backlog' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <input type="date" value={newTaskDeadline} onChange={(e) => {
              setNewTaskDeadline(e.target.value)
              // Auto-set priority based on deadline
              if (e.target.value) {
                const deadline = new Date(e.target.value + 'T23:59:59')
                const now = new Date()
                const dayOfWeek = now.getDay()
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
                const thisMonday = new Date(now)
                thisMonday.setDate(now.getDate() + mondayOffset)
                thisMonday.setHours(0, 0, 0, 0)
                const thisSunday = new Date(thisMonday)
                thisSunday.setDate(thisMonday.getDate() + 6)
                thisSunday.setHours(23, 59, 59)
                const nextWednesday = new Date(thisMonday)
                nextWednesday.setDate(thisMonday.getDate() + 9)
                nextWednesday.setHours(23, 59, 59)
                const nextSunday = new Date(thisMonday)
                nextSunday.setDate(thisMonday.getDate() + 13)
                nextSunday.setHours(23, 59, 59)
                if (deadline <= thisSunday) setNewTaskPriority('ultra-high')
                else if (deadline <= nextWednesday) setNewTaskPriority('high')
                else if (deadline <= nextSunday) setNewTaskPriority('medium')
                else setNewTaskPriority('backlog')
              }
            }}
              className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer" />
            <select value={newTaskInitiative} onChange={(e) => setNewTaskInitiative(e.target.value)}
              className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black">
              {ALL_INITIATIVE_KEYS.map((k) => <option key={k} value={k}>{INITIATIVES[k].shortLabel}</option>)}
            </select>
            <button
              onClick={handleAddMasterTask}
              disabled={!newTaskTitle.trim() || !displayName}
              className="bg-black text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-blue transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Tasks grouped by priority */}
      {viewMode === 'completed' || viewMode === 'deleted' ? null : Object.keys(grouped).length === 0 ? (
        <p className="text-muted text-center py-12 uppercase tracking-widest text-xs font-bold">No tasks match this filter.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                <SortableContext items={grouped[priority].map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                  {grouped[priority].map((task, i) => {
                    const taskComments = comments.filter((c) => c.task_id === task.id)
                    const isExpanded = expandedTask === task.id
                    const ep = task.event_id ? eventProgress.find((e) => e.event_id === task.event_id) : null
                    const epPercent = ep ? Math.round((ep.done / ep.total) * 100) : null

                    return (
                      <SortableRow key={task.id} id={task.id}>
                      <div id={task.id} className={i > 0 ? 'border-t border-black/5' : ''}>
                        <button
                          onClick={() => { setExpandedTask(isExpanded ? null : task.id); setCommentInput('') }}
                          className="w-full text-left px-5 py-4 hover:bg-cream-dark transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold leading-tight">{task.title}</h3>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {task.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{task.assignee}</span>}
                                {!task.assignee && <span className="text-[10px] text-muted/40 uppercase tracking-wider">Unassigned</span>}
                                {filterInitiative === 'all' && task.initiative && INITIATIVES[task.initiative as InitiativeKey] && (
                                  <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${INITIATIVES[task.initiative as InitiativeKey].color} text-white`}>
                                    {INITIATIVES[task.initiative as InitiativeKey].shortLabel}
                                  </span>
                                )}
                                {task.event_id && ep && (
                                  <a href={`/events/${task.event_id}`} className="text-[10px] font-bold text-teal uppercase tracking-wider hover:text-red transition-colors">
                                    Event: {ep.done}/{ep.total} &rarr;
                                  </a>
                                )}
                                {task.deadline && (
                                  <span className="text-[10px] font-bold text-red uppercase tracking-wider">
                                    Due {new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
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
                            {/* Title + Delete */}
                            <div className="pt-4 mb-3 flex items-start justify-between gap-4">
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
                                  className="w-full border-2 border-black bg-white px-2 py-1.5 text-sm font-bold text-black focus:outline-none focus:border-blue"
                                />
                              ) : (
                                <button
                                  onClick={() => handleTitleEdit(task)}
                                  className="text-sm font-bold hover:text-blue transition-colors text-left"
                                  title="Click to edit title"
                                >
                                  {task.title} <span className="text-muted/30 text-xs">&#9998;</span>
                                </button>
                              )}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={async () => {
                                    const next = !task.for_daily
                                    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, for_daily: next } : t)))
                                    await supabase.from('master_tasks').update({ for_daily: next, updated_at: new Date().toISOString() } as never).eq('id', task.id)
                                  }}
                                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-colors ${
                                    task.for_daily
                                      ? 'bg-gold text-white border-gold'
                                      : 'bg-white text-black border-gold/40 hover:bg-gold/10'
                                  }`}
                                  title="Tag for The Daily"
                                >
                                  {task.for_daily ? '\u2605 In The Daily' : '\u2606 Send to The Daily'}
                                </button>
                                {task.status !== 'complete' && (
                                  <button
                                    onClick={() => handleStatusChange(task, 'complete')}
                                    className="text-green bg-green/10 hover:bg-green hover:text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors"
                                  >
                                    Mark Done
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Delete "${task.title}"? It will be moved to the deleted backlog.`)) return
                                    setTasks((prev) => prev.filter((t) => t.id !== task.id))
                                    setExpandedTask(null)
                                    await supabase.from('master_tasks').update({ deleted_at: new Date().toISOString() } as never).eq('id', task.id)
                                  }}
                                  className="text-red bg-red/10 hover:bg-red hover:text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* Meta row: Owner / Exec Lead / Due / Priority / Milestone */}
                            <div className="flex items-center gap-x-5 gap-y-2 mb-5 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Owner:</span>
                                <select
                                  value={task.assignee || ''}
                                  onChange={(e) => handleAssigneeChange(task, e.target.value || null)}
                                  className={`border-none bg-transparent px-1 py-0.5 text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer hover:bg-black/5 ${task.assignee ? 'text-blue' : 'text-muted/40'}`}
                                >
                                  <option value="">Unassigned</option>
                                  {teamMembers.map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Exec:</span>
                                <select
                                  value={task.executive_lead || ''}
                                  onChange={async (e) => {
                                    const val = e.target.value || null
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, executive_lead: val } : t))
                                    await supabase.from('master_tasks').update({ executive_lead: val } as never).eq('id', task.id)
                                  }}
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
                                  onChange={(e) => handleDeadlineChange(task, e.target.value || null)}
                                  className="border-none bg-transparent px-1 py-0.5 text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer hover:bg-black/5"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Status:</span>
                                <select
                                  value={task.status}
                                  onChange={(e) => handleStatusChange(task, e.target.value)}
                                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border-0 cursor-pointer focus:outline-none ${statusColors[task.status] ?? 'bg-black/10 text-black'}`}
                                >
                                  {statusOrder.map((s) => (
                                    <option key={s} value={s} className="text-black bg-white">
                                      {statusLabels[s]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Priority:</span>
                                <select
                                  value={task.priority}
                                  onChange={(e) => handlePriorityChange(task, e.target.value)}
                                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border-0 cursor-pointer focus:outline-none ${priorityColors[task.priority] ?? 'bg-black/10 text-black'}`}
                                >
                                  {priorityOrder.map((p) => (
                                    <option key={p} value={p} className="text-black bg-white">
                                      {p === 'ultra-high' ? 'Very High' : p.charAt(0).toUpperCase() + p.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Milestone:</span>
                                <select
                                  value={task.milestone_id || ''}
                                  onChange={async (e) => {
                                    const val = e.target.value || null
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, milestone_id: val } : t))
                                    await supabase.from('master_tasks').update({ milestone_id: val } as never).eq('id', task.id)
                                  }}
                                  className={`border-none bg-transparent px-1 py-0.5 text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer hover:bg-black/5 ${task.milestone_id ? 'text-black' : 'text-muted/40'}`}
                                >
                                  <option value="">None</option>
                                  {milestoneOptions
                                    .filter(ms => !initiative || ms.initiative === (task.initiative || initiative))
                                    .map(ms => <option key={ms.id} value={ms.id}>{ms.title}</option>)}
                                </select>
                              </div>
                            </div>

                            {/* Dan's Comments */}
                            <div className="mb-5">
                              <EditableField taskId={task.id} field="dan_comments" label="Dan's Comments" value={task.dan_comments} highlight editingField={editingField} editValue={editValue} setEditValue={setEditValue} startEditing={startEditing} saveField={saveField} setEditingField={setEditingField} />
                            </div>

                            {/* Task Detail — single shaded full-width textarea */}
                            <div className="mb-5">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">Task Detail</p>
                              {editingField?.taskId === task.id && editingField?.field === 'current_status' ? (
                                <textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveField}
                                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingField(null) }}
                                  autoFocus
                                  rows={8}
                                  placeholder="Status, context, next steps, anything relevant..."
                                  className="w-full border-2 border-black bg-cream-dark/40 px-4 py-3 text-sm leading-relaxed text-black focus:outline-none focus:border-blue focus:bg-white resize-y"
                                />
                              ) : (
                                <button
                                  onClick={() => {
                                    const seed = task.current_status || task.action_items || null
                                    startEditing(task.id, 'current_status', seed)
                                  }}
                                  className="flex items-start w-full text-left bg-cream-dark/40 border-2 border-black/10 hover:border-black/30 px-4 py-3 min-h-[180px] transition-colors"
                                >
                                  {task.current_status || task.action_items ? (
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-black/80 w-full">
                                      {(task.current_status || task.action_items || '').replace(/<[^>]+>/g, '').trim()}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted/50 italic">Click to add task detail…</span>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Links */}
                            <div className="mb-5">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">Links</p>
                              {editingField?.taskId === task.id && editingField?.field === 'links' ? (
                                <textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveField}
                                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingField(null) }}
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
                                  <button onClick={() => startEditing(task.id, 'links', task.links)}
                                    className="text-[10px] text-muted/50 hover:text-muted mt-1">edit</button>
                                </div>
                              ) : (
                                <button onClick={() => startEditing(task.id, 'links', task.links)}
                                  className="w-full text-left text-sm text-muted/50 italic bg-cream-dark/20 border border-black/10 hover:border-black/30 px-3 py-2 transition-colors">Click to add links…</button>
                              )}
                            </div>

                            {/* Your update to Dan */}
                            {task.update_to_dan && (
                              <div className="mt-4 border-l-4 border-purple pl-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-purple mb-1">Your Update to Dan</p>
                                <p className="text-xs whitespace-pre-wrap">{task.update_to_dan}</p>
                              </div>
                            )}

                            {/* Dan's checklist responses */}
                            {task.dan_checklist && task.dan_checklist.length > 0 && (
                              <div className="mt-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-purple mb-2">Dan Advise Checklist</p>
                                <div className="space-y-1.5">
                                  {task.dan_checklist.map((item) => (
                                    <div key={item.id} className="flex items-start gap-2">
                                      <span className={`text-xs ${item.checked ? 'text-green font-bold' : 'text-muted'}`}>{item.checked ? '\u2611' : '\u2610'}</span>
                                      <span className={`text-xs ${item.checked ? 'line-through text-muted' : ''}`}>{item.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Dan's feedback */}
                            {task.dan_feedback && (
                              <div className="mt-4 border-l-4 border-red pl-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red mb-1">Dan&apos;s Feedback</p>
                                <p className="text-xs whitespace-pre-wrap">{task.dan_feedback}</p>
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

                            {/* Comments */}
                            <div className="mt-4 border-t-2 border-black/5 pt-4">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
                                Comments ({taskComments.length})
                              </p>

                              {taskComments.length > 0 && (
                                <div className="space-y-0 mb-3 max-h-48 overflow-y-auto border border-black/5">
                                  {taskComments.map((c, ci) => (
                                    <div key={c.id} className={`text-xs flex items-start gap-3 px-3 py-2 ${ci > 0 ? 'border-t border-black/5' : ''}`}>
                                      <div className="flex-1 min-w-0">
                                        <span className="font-bold text-blue">{c.author}</span>
                                        <span className="text-muted mx-1">&middot;</span>
                                        <span className="text-muted">{new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <p className="mt-0.5">{c.message}</p>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteComment(c.id)}
                                        className="text-muted/40 hover:text-red hover:bg-red/10 transition-colors shrink-0 w-8 h-8 flex items-center justify-center text-xl font-bold rounded"
                                        title="Delete comment"
                                      >
                                        &times;
                                      </button>
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
                                  placeholder={displayName ? 'COMMENT... (say "move to high" to reprioritize)' : 'SET NAME FIRST'}
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
                      </SortableRow>
                    )
                  })}
                </div>
                </SortableContext>
              </div>
            ))}
        </div>
        <DragOverlay>
          {activeId ? (
            <div className="bg-cream border-2 border-black px-5 py-3 shadow-lg text-sm font-bold">
              {tasks.find((t) => t.id === activeId)?.title}
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      )}


      {/* Weekly Report — completed tasks */}
      {viewMode === 'completed' && (
        <div>
          {/* Completed master tasks */}
          {(() => {
            const completedMaster = tasks.filter((t) => t.status === 'complete')
            const allCompleted = [...completedTasks]

            // Group by week (using updated_at or created_at)
            // For now, show all completed items
            return (
              <>
                {completedMaster.length > 0 && (
                  <div className="mb-6">
                    <div className="bg-green text-white px-6 py-4 flex items-center justify-between">
                      <h2 className="text-sm font-bold tracking-widest uppercase">Completed Master Tasks</h2>
                      <span className="text-xs font-bold tracking-wider opacity-70">{completedMaster.length} ITEMS</span>
                    </div>
                    <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                      {completedMaster.map((task, i) => (
                        <div key={task.id} className={`px-5 py-3 flex items-center justify-between gap-4 ${i > 0 ? 'border-t border-black/5' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold line-through text-muted">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {task.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{task.assignee}</span>}
                              <span className="text-[10px] font-bold text-green uppercase tracking-widest">DONE</span>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              await supabase.from('master_tasks').update({ deleted_at: new Date().toISOString() } as never).eq('id', task.id)
                              setTasks((prev) => prev.filter((t) => t.id !== task.id))
                              setDeletedTasks((prev) => [...prev, { ...task, status: 'complete' } as MasterTask])
                              if (displayName) logActivity(displayName, 'archived', 'task', task.id, task.title)
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-muted bg-black/5 hover:bg-red hover:text-white px-3 py-1.5 transition-colors shrink-0"
                          >
                            Archive
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {allCompleted.length > 0 && (
                  <div>
                    <div className="bg-green text-white px-6 py-4 flex items-center justify-between">
                      <h2 className="text-sm font-bold tracking-widest uppercase">Completed Event Tasks</h2>
                      <span className="text-xs font-bold tracking-wider opacity-70">{allCompleted.length} ITEMS</span>
                    </div>
                    <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                      {allCompleted.map((row, i) => (
                        <div key={row.id} className={`px-5 py-3 ${i > 0 ? 'border-t border-black/5' : ''}`}>
                          <p className="text-sm font-bold line-through text-muted">
                            {row.event_title} — {row.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted uppercase tracking-wider">{row.category}</span>
                            {row.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{row.assignee}</span>}
                            <span className="text-[10px] font-bold text-green uppercase tracking-widest">DONE</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {completedMaster.length === 0 && allCompleted.length === 0 && (
                  <p className="text-muted text-center py-12 uppercase tracking-widest text-xs font-bold">No completed tasks yet.</p>
                )}
              </>
            )
          })()}
        </div>
      )}

    </div>
  )
}

function EditableField({
  taskId, field, label, value, multiline, highlight, editingField, editValue, setEditValue, startEditing, saveField, setEditingField,
}: {
  taskId: string
  field: string
  label: string
  value: string | null
  multiline?: boolean
  highlight?: boolean
  editingField: { taskId: string; field: string } | null
  editValue: string
  setEditValue: (v: string) => void
  startEditing: (taskId: string, field: string, value: string | null) => void
  saveField: () => void
  setEditingField: (v: null) => void
}) {
  const isEditing = editingField?.taskId === taskId && editingField?.field === field

  if (isEditing) {
    return (
      <div className={highlight ? 'border-l-4 border-red pl-3' : ''}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{label}</p>
        {multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveField}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingField(null) }}
            autoFocus
            rows={4}
            className="w-full border-2 border-black bg-white px-2 py-1 text-xs text-black focus:outline-none focus:border-blue"
            placeholder={`Add ${label.toLowerCase()}...`}
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveField}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveField()
              if (e.key === 'Escape') setEditingField(null)
            }}
            autoFocus
            className="w-full border-2 border-black bg-white px-2 py-1 text-xs text-black focus:outline-none focus:border-blue"
            placeholder={`Add ${label.toLowerCase()}...`}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className={`cursor-pointer hover:bg-cream-dark transition-colors rounded px-1 py-0.5 -mx-1 ${highlight ? 'border-l-4 border-red pl-3' : ''}`}
      onClick={() => startEditing(taskId, field, value)}
      title={`Click to edit ${label.toLowerCase()}`}
    >
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${highlight ? 'text-red' : 'text-muted'}`}>{label}</p>
      {value ? (
        multiline ? (
          <ul className="space-y-1">
            {value.split('\n').map((item, idx) => (
              <li key={idx} className={`text-xs flex items-start gap-2 ${highlight ? 'italic' : ''}`}>
                <span className="text-muted mt-0.5">&mdash;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-xs ${highlight ? 'italic' : ''}`}>{value}</p>
        )
      ) : (
        <p className="text-xs text-muted/40 italic">Click to add...</p>
      )}
    </div>
  )
}
