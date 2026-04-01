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
  const bottomRef = useRef<HTMLDivElement>(null)

  // Shared events list
  const [events, setEvents] = useState<EventOption[]>([])

  // Add task state
  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<EventTask['category']>('venue')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [taskSuccess, setTaskSuccess] = useState('')

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

  const filteredMessages = eventFilter
    ? messages.filter((m) => m.event_id === eventFilter || m.event_id === null)
    : messages

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
    if (!taskTitle.trim() || !selectedEvent || !displayName || addingTask) return
    setAddingTask(true)
    setTaskSuccess('')
    const taskId = `t-${Date.now()}`
    const { error } = await supabase.from('event_tasks').insert({
      id: taskId,
      event_id: selectedEvent,
      title: taskTitle.trim(),
      category: selectedCategory,
      status: 'not-started',
      assignee: null,
      notes: taskNotes.trim() || null,
    } as never)
    if (!error) {
      const eventName = events.find((e) => e.id === selectedEvent)?.title ?? 'event'
      await supabase.from('comments').insert({
        author: displayName,
        message: `Added task "${taskTitle.trim()}" to ${eventName} [${selectedCategory}]`,
        event_id: selectedEvent,
        task_id: taskId,
        type: 'task-update',
      } as never)
      setTaskSuccess(`Added to ${eventName}`)
      setTaskTitle('')
      setTaskNotes('')
      setTimeout(() => setTaskSuccess(''), 3000)
    }
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
      {/* Toggle button */}
      <button
        onClick={() => (isOpen ? sidebar.closeSidebar() : sidebar.openSidebar())}
        className="fixed right-4 bottom-4 z-[9990] bg-red text-white px-5 py-4 text-xs font-bold uppercase tracking-widest hover:bg-blue transition-colors shadow-lg shadow-red/30 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {isOpen ? 'CLOSE' : 'CHAT & ACTIONS'}
      </button>

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

        {/* Tabs */}
        <div className="flex border-b-2 border-black">
          {tabs.map((t, i) => (
            <button
              key={t.value}
              onClick={() => sidebar.setTab(t.value)}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                i > 0 ? 'border-l border-black/20' : ''
              } ${tab === t.value ? `${t.color} text-white` : 'bg-cream-dark text-muted hover:text-black'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CHAT TAB ── */}
        {tab === 'chat' && (
          <>
            <div className="px-4 py-2 border-b border-black/10 bg-cream-dark flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted shrink-0">Filter:</span>
              {eventFilter ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue truncate">{filterEventName || 'Event'}</span>
                  <button onClick={() => sidebar.setEventFilter(null)} className="text-[10px] font-bold text-red hover:text-black">&times; CLEAR</button>
                </div>
              ) : (
                <select
                  value=""
                  onChange={(e) => { if (e.target.value) sidebar.setEventFilter(e.target.value) }}
                  className="flex-1 bg-transparent text-[10px] font-bold uppercase tracking-wider text-black border-0 focus:outline-none cursor-pointer"
                >
                  <option value="">All Events</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.day_label} — {ev.title}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {filteredMessages.length === 0 && (
                <p className="text-xs uppercase tracking-wider text-muted text-center mt-8 font-medium">No messages yet.</p>
              )}
              {filteredMessages.map((msg) => (
                <div key={msg.id} className={`pb-3 ${msg.type === 'task-update' ? 'border-l-4 border-gold pl-3 opacity-80' : 'border-b-2 border-cream-dark'}`}>
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className={`text-xs font-bold uppercase tracking-wider ${msg.type === 'task-update' ? 'text-gold' : 'text-blue'}`}>
                      {msg.type === 'task-update' ? `${msg.author} \u00b7 update` : msg.author}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted font-medium whitespace-nowrap">
                      {formatDate(msg.created_at)} {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${msg.type === 'task-update' ? 'text-muted italic' : 'text-black'}`}>
                    {renderMessage(msg.message)}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="border-t-4 border-black px-4 py-3 bg-cream-dark flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={displayName ? 'TYPE A MESSAGE...' : 'SET NAME FIRST'}
                disabled={!displayName}
                className="flex-1 border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-black placeholder:text-muted/50 focus:outline-none focus:border-blue disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!input.trim() || !displayName || sending}
                className="bg-black text-cream px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-blue transition-colors disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </>
        )}

        {/* ── ADD TASK TAB ── */}
        {tab === 'add-task' && (
          <form onSubmit={handleAddTask} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Event</label>
              {events.length === 0 ? (
                <p className="text-xs text-muted py-2">Loading events...</p>
              ) : (
                <div className="relative">
                  <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="w-full border-2 border-black bg-white px-3 py-2.5 pr-8 text-xs font-bold text-black focus:outline-none focus:border-blue cursor-pointer">
                    {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.day_label} — {ev.title}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black text-xs">&#9660;</div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Category</label>
              <div className="grid grid-cols-3 gap-1.5">
                {taskCategories.map((cat) => (
                  <button key={cat.value} type="button" onClick={() => setSelectedCategory(cat.value)}
                    className={`py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${selectedCategory === cat.value ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Task Title</label>
              <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="E.G., BOOK SOUND ENGINEER" className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Notes (optional)</label>
              <input type="text" value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} placeholder="ANY ADDITIONAL DETAILS..." className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue" />
            </div>
            {taskSuccess && <div className="bg-green text-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-center">{taskSuccess}</div>}
            <button type="submit" disabled={!taskTitle.trim() || !selectedEvent || !displayName || addingTask} className="w-full bg-red text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-bright transition-colors disabled:opacity-40">
              {addingTask ? 'Adding...' : 'Add Task'}
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
