'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-log'
import { useUser } from './user-provider'

const STREAMS = [
  { key: 'brmf', label: 'Boulder Roots Music Fest', short: 'Boulder Roots', emoji: '\uD83C\uDFB8', bg: 'bg-[#2a4e80]', border: 'border-[#2a4e80]' },
  { key: 'bold-summit', label: 'The Bold Summit', short: 'Bold Summit', emoji: '\uD83E\uDDE0', bg: 'bg-[#d4a020]', border: 'border-[#d4a020]' },
  { key: 'ensuring-colorado', label: 'Engage Colorado', short: 'Engage CO', emoji: '\uD83C\uDFD4\uFE0F', bg: 'bg-[#cc4444]', border: 'border-[#cc4444]' },
  { key: 'investments', label: 'Investments', short: 'Investments', emoji: '\uD83D\uDCBC', bg: 'bg-[#2a7d5c]', border: 'border-[#2a7d5c]' },
  { key: 'loud-bear', label: 'Loud Bear', short: 'Loud Bear', emoji: '\uD83D\uDC3B', bg: 'bg-[#8b5a3c]', border: 'border-[#8b5a3c]' },
] as const

const priorityLabels: Record<string, string> = {
  'ultra-high': 'Very High',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  backlog: 'Backlog',
}
const priorityBadgeColors: Record<string, string> = {
  'ultra-high': 'bg-red text-white',
  high: 'bg-orange text-white',
  medium: 'bg-gold text-white',
  low: 'bg-blue text-white',
  backlog: 'bg-black/20 text-black',
}
const priorityRank: Record<string, number> = { 'ultra-high': 0, high: 1, medium: 2, low: 3, backlog: 4 }

interface PriorityComment {
  id: string
  author: string
  text: string
  created_at: string
}

interface DailyPriority {
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
  comments: PriorityComment[]
}


interface Props {
  owner: string
}

export function PriorityStreams({ owner }: Props) {
  const { displayName } = useUser()
  const [priorities, setPriorities] = useState<DailyPriority[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('daily_priorities')
        .select('*')
        .eq('owner', owner)
        .is('deleted_at', null)
        .is('master_task_id', null)
        .order('sort_order', { ascending: true })
      if (data) setPriorities(data as DailyPriority[])
      setLoading(false)
    }
    load()
  }, [owner])

  // Handlers
  const handleAdd = async (streamKey: string, title: string) => {
    if (!title.trim()) return
    const id = `dp-${Date.now()}`
    const streamItems = priorities.filter((p) => p.stream === streamKey)
    const nextOrder = streamItems.length > 0 ? Math.max(...streamItems.map((i) => i.sort_order)) + 1 : 0
    const item: DailyPriority = {
      id,
      owner,
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
    setPriorities((prev) => [...prev, item])
    await supabase.from('daily_priorities').insert(item as never)
  }

  const handleToggle = async (id: string) => {
    const item = priorities.find((i) => i.id === id)
    if (!item) return
    const completed = !item.completed
    setPriorities((prev) => prev.map((i) => (i.id === id ? { ...i, completed } : i)))
    await supabase
      .from('daily_priorities')
      .update({ completed, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handleDelete = async (id: string) => {
    setPriorities((prev) => prev.filter((i) => i.id !== id))
    setOpenId((prev) => (prev === id ? null : prev))
    await supabase
      .from('daily_priorities')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handleTitleSave = async (id: string, title: string) => {
    const value = title.trim()
    if (!value) return
    setPriorities((prev) => prev.map((i) => (i.id === id ? { ...i, title: value } : i)))
    await supabase
      .from('daily_priorities')
      .update({ title: value, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handleNotesSave = async (id: string, notes: string) => {
    const value = notes.trim() || null
    setPriorities((prev) => prev.map((i) => (i.id === id ? { ...i, notes: value } : i)))
    await supabase
      .from('daily_priorities')
      .update({ notes: value, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handlePriorityChange = async (id: string, priority: string) => {
    setPriorities((prev) => prev.map((i) => (i.id === id ? { ...i, priority } : i)))
    await supabase
      .from('daily_priorities')
      .update({ priority, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handleDeadlineChange = async (id: string, deadline: string) => {
    const value = deadline || null
    setPriorities((prev) => prev.map((i) => (i.id === id ? { ...i, deadline: value } : i)))
    await supabase
      .from('daily_priorities')
      .update({ deadline: value, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handleAddComment = async (id: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const author = displayName || owner
    const newComment: PriorityComment = {
      id: `pc-${Date.now()}`,
      author,
      text: trimmed,
      created_at: new Date().toISOString(),
    }
    let nextComments: PriorityComment[] = []
    setPriorities((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        nextComments = [...(i.comments || []), newComment]
        return { ...i, comments: nextComments }
      }),
    )
    await supabase
      .from('daily_priorities')
      .update({ comments: nextComments, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
  }

  const handleDragEnd = async (streamKey: string, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const streamItems = priorities.filter((p) => p.stream === streamKey)
    const oldIndex = streamItems.findIndex((i) => i.id === active.id)
    const newIndex = streamItems.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(streamItems, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      sort_order: idx,
    }))
    setPriorities((prev) => {
      const otherItems = prev.filter((p) => p.stream !== streamKey)
      return [...otherItems, ...reordered]
    })
    await Promise.all(
      reordered.map((item) =>
        supabase
          .from('daily_priorities')
          .update({ sort_order: item.sort_order } as never)
          .eq('id', item.id),
      ),
    )
  }

  const handleConvertToTask = async (id: string) => {
    const item = priorities.find((i) => i.id === id)
    if (!item || !item.stream) return
    const taskId = `mt-${Date.now()}`
    setPriorities((prev) => prev.map((i) => (i.id === id ? { ...i, master_task_id: taskId } : i)))
    await supabase.from('master_tasks').insert({
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
      dan_comments: null,
      update_to_dan: null,
      dan_feedback: null,
      dan_checklist: [],
      created_by: displayName || item.owner,
      initiative: item.stream,
      sort_order: 0,
      event_id: null,
      week_of: null,
    } as never)
    await supabase
      .from('daily_priorities')
      .update({ master_task_id: taskId, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (displayName) logActivity(displayName, 'converted priority to task', 'task', taskId, item.title)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-muted uppercase tracking-widest text-sm font-bold">Loading...</p>
      </div>
    )
  }

  const openItem = openId ? priorities.find((p) => p.id === openId) ?? null : null
  const openStream = openItem ? STREAMS.find((s) => s.key === openItem.stream) ?? null : null

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        {STREAMS.map((stream) => (
          <StreamColumn
            key={stream.key}
            stream={stream}
            priorities={priorities.filter((p) => p.stream === stream.key)}
            onAdd={handleAdd}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onOpen={setOpenId}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {openItem && openStream && (
        <PriorityDrawer
          key={openItem.id}
          item={openItem}
          stream={openStream}
          onClose={() => setOpenId(null)}
          onTitleSave={handleTitleSave}
          onNotesSave={handleNotesSave}
          onPriorityChange={handlePriorityChange}
          onDeadlineChange={handleDeadlineChange}
          onAddComment={handleAddComment}
          onConvertToTask={handleConvertToTask}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
      )}
    </div>
  )
}

interface ColumnProps {
  stream: (typeof STREAMS)[number]
  priorities: DailyPriority[]
  onAdd: (streamKey: string, title: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onOpen: (id: string) => void
  onDragEnd: (streamKey: string, event: DragEndEvent) => void
}

function StreamColumn({ stream, priorities, onAdd, onToggle, onDelete, onOpen, onDragEnd }: ColumnProps) {
  const [newTitle, setNewTitle] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const focusList = [...priorities].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const pa = priorityRank[a.priority] ?? 4
    const pb = priorityRank[b.priority] ?? 4
    if (pa !== pb) return pa - pb
    return a.sort_order - b.sort_order
  })
  const activeFocus = focusList.filter((p) => !p.completed).length

  return (
    <div className={`border-2 ${stream.border} bg-white flex flex-col`}>
      <div className={`${stream.bg} text-white px-4 py-4`}>
        <h2 className="text-sm font-bold tracking-widest uppercase leading-tight">
          <span className="mr-1.5">{stream.emoji}</span>
          {stream.label}
        </h2>
        <p className="text-[10px] uppercase tracking-widest text-white/70 mt-1">
          {activeFocus} active &middot; {focusList.length - activeFocus} done
        </p>
      </div>

      <div className="px-3 py-3 bg-cream-dark/40 border-b border-black/10">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAdd(stream.key, newTitle)
              setNewTitle('')
            }
          }}
          placeholder="Brain dump..."
          className="w-full border-2 border-black/20 bg-white px-3 py-2 text-xs text-black focus:outline-none focus:border-black placeholder:text-muted/40"
        />
      </div>

      {focusList.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-[11px] text-muted italic">No notes yet</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEnd(stream.key, e)}>
          <SortableContext items={focusList.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div>
              {focusList.map((item) => (
                <SortablePriority
                  key={item.id}
                  item={item}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

interface SortablePriorityProps {
  item: DailyPriority
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onOpen: (id: string) => void
}

function SortablePriority({ item, onToggle, onDelete, onOpen }: SortablePriorityProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const commentCount = item.comments?.length ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 px-3 py-2.5 border-t border-black/5 bg-white hover:bg-cream-dark/40 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted/30 hover:text-black cursor-grab active:cursor-grabbing shrink-0 select-none mt-0.5"
        title="Drag to reorder"
      >
        &#x2630;
      </button>
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => onToggle(item.id)}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 accent-black shrink-0 cursor-pointer mt-1"
      />
      <button
        onClick={() => onOpen(item.id)}
        className="flex-1 min-w-0 text-left"
        title="Click to open details"
      >
        <p
          className={`text-[13px] font-semibold leading-snug ${
            item.completed ? 'line-through text-muted' : 'text-black'
          }`}
        >
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${
              priorityBadgeColors[item.priority] ?? 'bg-black/10 text-black'
            }`}
          >
            {priorityLabels[item.priority] ?? item.priority}
          </span>
          {commentCount > 0 && (
            <span className="text-[9px] uppercase tracking-widest text-muted/60">
              {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
            </span>
          )}
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(item.id)
        }}
        className="text-muted/30 hover:text-red text-base font-bold shrink-0 w-5 h-5 flex items-center justify-center"
        title="Delete"
      >
        &times;
      </button>
    </div>
  )
}

interface DrawerProps {
  item: DailyPriority
  stream: (typeof STREAMS)[number]
  onClose: () => void
  onTitleSave: (id: string, title: string) => void
  onNotesSave: (id: string, notes: string) => void
  onPriorityChange: (id: string, priority: string) => void
  onDeadlineChange: (id: string, deadline: string) => void
  onAddComment: (id: string, text: string) => void
  onConvertToTask: (id: string) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}

function PriorityDrawer({
  item,
  stream,
  onClose,
  onTitleSave,
  onNotesSave,
  onPriorityChange,
  onDeadlineChange,
  onAddComment,
  onConvertToTask,
  onDelete,
  onToggle,
}: DrawerProps) {
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
      <button
        onClick={onClose}
        aria-label="Close"
        className="flex-1 bg-black/40"
      />
      <aside className="w-full max-w-lg bg-white border-l-2 border-black overflow-y-auto">
        <div className={`${stream.bg} text-white px-6 py-5 flex items-start justify-between gap-3 sticky top-0 z-10`}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              {stream.emoji} {stream.label}
            </p>
            <textarea
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                if (titleDraft.trim() && titleDraft !== item.title) onTitleSave(item.id, titleDraft)
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
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-bold shrink-0"
            title="Close"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => onToggle(item.id)}
                className="w-4 h-4 accent-black cursor-pointer"
              />
              <span className="text-xs font-bold uppercase tracking-widest text-black">
                {item.completed ? 'Done' : 'Mark done'}
              </span>
            </label>
            <select
              value={item.priority}
              onChange={(e) => onPriorityChange(item.id, e.target.value)}
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border-0 cursor-pointer focus:outline-none ${
                priorityBadgeColors[item.priority] ?? 'bg-black/10 text-black'
              }`}
            >
              {Object.keys(priorityLabels)
                .sort((a, b) => priorityRank[a] - priorityRank[b])
                .map((p) => (
                  <option key={p} value={p} className="text-black bg-white">
                    {priorityLabels[p]}
                  </option>
                ))}
            </select>
            <input
              type="date"
              value={item.deadline || ''}
              onChange={(e) => onDeadlineChange(item.id, e.target.value)}
              className="border border-black/20 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-widest focus:outline-none"
            />
            {item.master_task_id ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-green">Task created &#10003;</span>
            ) : (
              <button
                onClick={() => onConvertToTask(item.id)}
                className="text-[10px] font-bold uppercase tracking-widest text-blue hover:underline"
              >
                &#x2192; Make master task
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

          {/* Context */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Context</p>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => {
                if (notesDraft !== (item.notes || '')) onNotesSave(item.id, notesDraft)
              }}
              placeholder="Add context, background, links, or anything Dan should know..."
              rows={8}
              className="w-full border-2 border-black/20 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-black placeholder:text-muted/40 resize-y"
            />
            <p className="text-[10px] text-muted mt-1">Click outside to save</p>
          </div>

          {/* Comments */}
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
