'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import { useSidebar, type SidebarTab } from '@/lib/sidebar-context'
import type { Comment, EventTask, AccessLevel } from '@/lib/types'

interface EventOption {
  id: string
  title: string
  day_label: string
}

const taskCategories: { label: string; value: EventTask['category'] }[] = [
  { label: 'Venue', value: 'venue' },
  { label: 'Talent', value: 'talent' },
  { label: 'Sponsorship', value: 'sponsorship' },
  { label: 'Logistics', value: 'logistics' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Production', value: 'production' },
]

const days = [
  { label: 'Wed 8/26', value: 'wednesday', date: '2026-08-26', day_label: 'Wednesday 8/26' },
  { label: 'Thu 8/27', value: 'thursday', date: '2026-08-27', day_label: 'Thursday 8/27' },
  { label: 'Fri 8/28', value: 'friday', date: '2026-08-28', day_label: 'Friday 8/28' },
  { label: 'Sat 8/29', value: 'saturday', date: '2026-08-29', day_label: 'Saturday 8/29' },
  { label: 'Sun 8/30', value: 'sunday', date: '2026-08-30', day_label: 'Sunday 8/30' },
]

const accessOptions: { label: string; value: AccessLevel }[] = [
  { label: 'Founders', value: 'founders' },
  { label: 'Founders + Premium', value: 'founders-premium' },
  { label: 'All Access', value: 'all-access' },
  { label: 'Sponsor Private', value: 'sponsor-private' },
]

const tabs: { label: string; value: SidebarTab; color: string }[] = [
  { label: 'Chat', value: 'chat', color: 'bg-blue' },
  { label: '+ Task', value: 'add-task', color: 'bg-red' },
  { label: '+ Event', value: 'add-event', color: 'bg-green' },
]

function renderMessage(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-bold text-red">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function ChatSidebar() {
  const { displayName } = useUser()
  const sidebar = useSidebar()
  const { isOpen, eventFilter, tab } = sidebar

  const [messages, setMessages] = useState<Comment[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [assignMode, setAssignMode] = useState(false)
  const [assignTo, setAssignTo] = useState('')
  const [assignEvent, setAssignEvent] = useState('')
  const [assignCategory, setAssignCategory] = useState<EventTask['category']>('logistics')
  const [assignDeadline, setAssignDeadline] = useState('')
  const [assignPriority, setAssignPriority] = useState('medium')
  const bottomRef = useRef<HTMLDivElement>(null)

  const teamMembers = ['Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

  // Shared events list
  const [events, setEvents] = useState<EventOption[]>([])

  // Add task state
  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<EventTask['category']>('venue')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [taskSuccess, setTaskSuccess] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDeadline, setTaskDeadline] = useState('')

  // Add event state
  const [eventTitle, setEventTitle] = useState('')
  const [eventDay, setEventDay] = useState('friday')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventAccess, setEventAccess] = useState<AccessLevel>('founders')
  const [eventSponsorship, setEventSponsorship] = useState(false)
  const [addingEvent, setAddingEvent] = useState(false)
  const [eventSuccess, setEventSuccess] = useState('')

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: true })
      if (data) setMessages(data as Comment[])
    }
    fetchMessages()
  }, [])

  // Fetch events when sidebar opens
  useEffect(() => {
    if (!isOpen || events.length > 0) return
    async function fetchEvents() {
      const { data } = await supabase
        .from('events')
        .select('id, title, day_label, date')
        .order('date', { ascending: true })
      if (data && data.length > 0) {
        const typed = data as EventOption[]
        setEvents(typed)
        setSelectedEvent(typed[0].id)
      }
    }
    fetchEvents()
  }, [isOpen, events.length])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('comments-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          const newMsg = payload.new as Comment
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom, eventFilter])

  // Filter: hide task-update logs unless toggled, apply event filter
  const filteredMessages = messages.filter((m) => {
    if (!showLogs && m.type === 'task-update') return false
    if (eventFilter && m.event_id !== eventFilter && m.event_id !== null) return false
    return true
  })

  const logCount = messages.filter((m) => m.type === 'task-update').length

  const handleAssignTask = async () => {
    if (!input.trim() || !displayName || sending) return
    setSending(true)

    const taskId = `t-${Date.now()}`
    const eventId = assignEvent || null

    // Always create a trackable task
    await supabase.from('event_tasks').insert({
      id: taskId,
      event_id: eventId,
      title: input.trim(),
      category: assignCategory,
      status: 'not-started',
      priority: assignPriority,
      assignee: assignTo || null,
      notes: null,
      deadline: assignDeadline || null,
      assigned_at: assignTo ? new Date().toISOString() : null,
    } as never)

    const eventName = events.find((e) => e.id === assignEvent)?.title
    const deadlineStr = assignDeadline ? ` (due ${assignDeadline})` : ''
    const priorityStr = assignPriority !== 'medium' ? ` [${assignPriority.toUpperCase()}]` : ''
    const eventStr = eventName ? ` [${eventName}]` : ''
    const assignStr = assignTo ? `@${assignTo} — ` : ''
    const msg = `${assignStr}${input.trim()}${deadlineStr}${priorityStr}${eventStr}`

    await supabase.from('comments').insert({
      author: displayName,
      message: msg,
      event_id: eventId,
      task_id: taskId,
      type: 'chat',
    } as never)

    setInput('')
    setAssignMode(false)
    setAssignTo('')
    setAssignDeadline('')
    setAssignPriority('medium')
    setSending(false)
  }


  const handleDeleteMessage = async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
    await supabase.from('comments').delete().eq('id', id)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || !displayName || sending) return
    setSending(true)
    setInput('')
    await supabase.from('comments').insert({
      author: displayName,
      message: trimmed,
      event_id: eventFilter || null,
      type: 'chat',
    } as never)
    setSending(false)
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim() || !displayName || addingTask) return
    setAddingTask(true)
    setTaskSuccess('')
    const taskId = `mt-${Date.now()}`
    const linkedEvent = selectedEvent || null

    await supabase.from('master_tasks').insert({
      id: taskId,
      title: taskTitle.trim(),
      assignee: taskAssignee || null,
      priority: taskPriority,
      status: 'not-started',
      deadline: taskDeadline || null,
      current_status: null,
      overview: taskNotes.trim() || null,
      action_items: null,
      dan_comments: null,
      links: null,
      update_to_dan: null,
      dan_feedback: null,
      dan_checklist: [],
      sort_order: 999,
      event_id: linkedEvent,
      week_of: null,
    } as never)

    const eventName = linkedEvent ? events.find((ev) => ev.id === linkedEvent)?.title : null
    setTaskSuccess(eventName ? `Created & linked to ${eventName}` : 'Task created')

    await supabase.from('comments').insert({
      author: displayName,
      message: `Created: "${taskTitle.trim()}"${taskAssignee ? ` → ${taskAssignee}` : ''}${eventName ? ` [${eventName}]` : ''}`,
      event_id: linkedEvent,
      type: 'chat',
    } as never)

    setTaskTitle('')
    setTaskNotes('')
    setTaskAssignee('')
    setTaskDeadline('')
    setSelectedEvent('')
    setTimeout(() => setTaskSuccess(''), 3000)
    setAddingTask(false)
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventTitle.trim() || !eventStartTime || !eventEndTime || !displayName || addingEvent) return
    setAddingEvent(true)
    setEventSuccess('')

    const dayInfo = days.find((d) => d.value === eventDay)!
    const eventId = `evt-${Date.now()}`

    const { error } = await supabase.from('events').insert({
      id: eventId,
      title: eventTitle.trim(),
      day: dayInfo.value,
      day_label: dayInfo.day_label,
      date: dayInfo.date,
      start_time: eventStartTime,
      end_time: eventEndTime,
      location: eventLocation.trim() || 'Location TBD',
      description: null,
      status: 'planning',
      access: eventAccess,
      sponsorship_available: eventSponsorship,
      sponsor_name: null,
      time_block: 'early-afternoon',
    } as never)

    if (!error) {
      await supabase.from('comments').insert({
        author: displayName,
        message: `Created new event "${eventTitle.trim()}" on ${dayInfo.day_label}`,
        event_id: eventId,
        type: 'task-update',
      } as never)

      // Refresh events list
      setEvents([])
      setEventSuccess(`Event created!`)
      setEventTitle('')
      setEventStartTime('')
      setEventEndTime('')
      setEventLocation('')
      setEventSponsorship(false)
      setTimeout(() => setEventSuccess(''), 3000)
    }
    setAddingEvent(false)
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const filterEventName = eventFilter
    ? events.find((e) => e.id === eventFilter)?.title
    : null

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9991] bg-black/30" onClick={() => sidebar.closeSidebar()} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-[9992] bg-cream border-l-4 border-black flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-4 border-black bg-black text-cream">
          <h2 className="text-sm font-bold uppercase tracking-widest">Boulder Roots</h2>
          <button onClick={() => sidebar.closeSidebar()} className="text-cream hover:text-red text-lg font-bold">&times;</button>
        </div>

        {/* Tabs — only show action tabs when in action mode */}
        {(tab === 'add-task' || tab === 'add-event') && (
          <div className="flex border-b-2 border-black">
            <button
              onClick={() => sidebar.setTab('add-task')}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                tab === 'add-task' ? 'bg-red text-white' : 'bg-cream-dark text-muted hover:text-black'
              }`}
            >
              + Task
            </button>
            <button
              onClick={() => sidebar.setTab('add-event')}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors border-l border-black/20 ${
                tab === 'add-event' ? 'bg-green text-white' : 'bg-cream-dark text-muted hover:text-black'
              }`}
            >
              + Event
            </button>
          </div>
        )}

        {/* ── BULLETIN BOARD TAB ── */}
        {tab === 'chat' && (
          <>
            {/* Board header */}
            <div className="px-4 py-3 bg-amber-50 border-b-2 border-amber-200">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Bulletin Board</p>
            </div>

            {/* Notes */}
            <div className="flex-1 overflow-y-auto px-3 py-4 bg-amber-50/50" style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              {filteredMessages.length === 0 && (
                <p className="text-sm text-muted text-center mt-12 italic">Pin a note to the board!</p>
              )}
              <div className="space-y-3">
                {filteredMessages.map((msg, idx) => {
                  const noteColors = [
                    'bg-yellow-100 border-yellow-300',
                    'bg-blue-50 border-blue-200',
                    'bg-green-50 border-green-200',
                    'bg-pink-50 border-pink-200',
                    'bg-purple-50 border-purple-200',
                    'bg-orange-50 border-orange-200',
                  ]
                  const color = noteColors[msg.author.length % noteColors.length]
                  const rotations = ['-rotate-1', 'rotate-0', 'rotate-1']
                  const rotation = rotations[idx % rotations.length]
                  return (
                    <div key={msg.id} className={`${color} border-2 px-4 py-3 shadow-md ${rotation} relative group/note`}>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red shadow-sm border border-red/50" />
                      <div className="flex items-start justify-between gap-2 mt-1">
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderMessage(msg.message)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold text-black/50">&mdash; {msg.author}</span>
                            <span className="text-[10px] text-black/30">{formatDate(msg.created_at)} {formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteMessage(msg.id)}
                          className="text-black/10 hover:text-red transition-colors text-lg font-bold shrink-0 opacity-0 group-hover/note:opacity-100">&times;</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div ref={bottomRef} />
            </div>

            {/* Post a note */}
            <div className="border-t-2 border-amber-200 px-4 py-3 bg-amber-50">
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                placeholder={displayName ? 'Write a note... (Shift+Enter for new line)' : 'Set your name first'}
                disabled={!displayName} rows={2}
                className="w-full border-2 border-amber-300 bg-yellow-50 px-3 py-2 text-sm text-black leading-relaxed focus:outline-none focus:border-amber-500 disabled:opacity-40 placeholder:text-amber-400 resize-none" />
              <button onClick={(e) => handleSend(e)} disabled={!input.trim() || !displayName || sending}
                className="mt-2 w-full bg-amber-600 text-white py-2 text-xs font-bold uppercase tracking-widest hover:bg-amber-700 transition-colors disabled:opacity-40">
                {sending ? 'Pinning...' : 'Pin to Board'}
              </button>
            </div>
          </>
        )}


        {/* ── ADD TASK TAB ── */}
        {tab === 'add-task' && (
          <form onSubmit={handleAddTask} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">What needs to be done?</label>
              <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="TASK TITLE..." className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue" />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Assign To</label>
                <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full border-2 border-black/20 bg-white px-2 py-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black">
                  <option value="">Unassigned</option>
                  {teamMembers.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Priority</label>
                <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full border-2 border-black/20 bg-white px-2 py-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black">
                  <option value="ultra-high">Very High</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="backlog">Backlog</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Deadline</label>
              <input type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)}
                className="w-full border-2 border-black/20 bg-white px-2 py-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Link to Event (optional)</label>
              <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full border-2 border-black/20 bg-white px-2 py-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer">
                <option value="">No event — standalone task</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.day_label} — {ev.title}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Notes (optional)</label>
              <input type="text" value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} placeholder="ANY ADDITIONAL DETAILS..." className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue" />
            </div>

            {taskSuccess && <div className="bg-green text-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-center">{taskSuccess}</div>}
            <button type="submit" disabled={!taskTitle.trim() || !displayName || addingTask}
              className="w-full bg-red text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-bright transition-colors disabled:opacity-40">
              {addingTask ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        )}

        {/* ── ADD EVENT TAB ── */}
        {tab === 'add-event' && (
          <form onSubmit={handleAddEvent} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Event Title</label>
              <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="E.G., OPENING NIGHT PARTY" className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Day</label>
              <div className="grid grid-cols-3 gap-1.5">
                {days.map((d) => (
                  <button key={d.value} type="button" onClick={() => setEventDay(d.value)}
                    className={`py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${eventDay === d.value ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Start Time</label>
                <input type="text" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} placeholder="E.G., 7:00 PM" className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">End Time</label>
                <input type="text" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} placeholder="E.G., 10:00 PM" className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Location</label>
              <input type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="VENUE NAME OR TBD" className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Access Level</label>
              <div className="grid grid-cols-2 gap-1.5">
                {accessOptions.map((a) => (
                  <button key={a.value} type="button" onClick={() => setEventAccess(a.value)}
                    className={`py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${eventAccess === a.value ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={eventSponsorship} onChange={(e) => setEventSponsorship(e.target.checked)} className="w-4 h-4 border-2 border-black accent-red" />
              <span className="text-xs font-bold uppercase tracking-widest">Open for Sponsorship</span>
            </label>
            {eventSuccess && <div className="bg-green text-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-center">{eventSuccess}</div>}
            <button type="submit" disabled={!eventTitle.trim() || !eventStartTime || !eventEndTime || !displayName || addingEvent} className="w-full bg-green text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-green-light transition-colors disabled:opacity-40">
              {addingEvent ? 'Creating...' : 'Create Event'}
            </button>
          </form>
        )}

      </div>
    </>
  )
}
