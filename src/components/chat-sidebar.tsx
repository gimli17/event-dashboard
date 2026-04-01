'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import type { Comment, Event, EventTask } from '@/lib/types'

type Tab = 'chat' | 'add-task'

const categories: { label: string; value: EventTask['category'] }[] = [
  { label: 'Venue', value: 'venue' },
  { label: 'Talent', value: 'talent' },
  { label: 'Sponsorship', value: 'sponsorship' },
  { label: 'Logistics', value: 'logistics' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Production', value: 'production' },
]

export function ChatSidebar() {
  const { displayName } = useUser()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('chat')
  const [messages, setMessages] = useState<Comment[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Add task form state
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<EventTask['category']>('venue')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [taskSuccess, setTaskSuccess] = useState('')

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
      if (data) setMessages(data)
    }
    fetchMessages()
  }, [])

  // Fetch events for dropdown when tab switches or sidebar opens
  useEffect(() => {
    if (tab !== 'add-task' || !open) return
    async function fetchEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })
      if (data) {
        const typed = data as Event[]
        setEvents(typed)
        if (typed.length > 0 && !selectedEvent) setSelectedEvent(typed[0].id)
      }
    }
    fetchEvents()
  }, [tab, open])

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
  }, [messages, scrollToBottom])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || !displayName || sending) return

    setSending(true)
    setInput('')

    await supabase.from('comments').insert({
      author: displayName,
      message: trimmed,
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
      // Log the action as a chat message
      await supabase.from('comments').insert({
        author: displayName,
        message: `Added task "${taskTitle.trim()}" to ${eventName} [${selectedCategory}]`,
      } as never)

      setTaskSuccess(`Added to ${eventName}`)
      setTaskTitle('')
      setTaskNotes('')
      setTimeout(() => setTaskSuccess(''), 3000)
    }

    setAddingTask(false)
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[9990] bg-black text-cream px-2 py-6 text-xs font-bold uppercase tracking-widest hover:bg-blue transition-colors border-2 border-r-0 border-black"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? 'Close' : 'Chat'}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[9991] bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-[9992] bg-cream border-l-4 border-black flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-4 border-black bg-black text-cream">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            BRMF
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-cream hover:text-red-bright text-lg font-bold leading-none"
            aria-label="Close chat"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-black">
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === 'chat'
                ? 'bg-blue text-white'
                : 'bg-cream-dark text-muted hover:text-black'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setTab('add-task')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-l-2 border-black ${
              tab === 'add-task'
                ? 'bg-red text-white'
                : 'bg-cream-dark text-muted hover:text-black'
            }`}
          >
            + Add Task
          </button>
        </div>

        {tab === 'chat' ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <p className="text-xs uppercase tracking-wider text-muted text-center mt-8 font-medium">
                  No messages yet. Start the conversation!
                </p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="border-b-2 border-cream-dark pb-3">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue">
                      {msg.author}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted font-medium whitespace-nowrap">
                      {formatDate(msg.created_at)} {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-black leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Chat input */}
            <form
              onSubmit={handleSend}
              className="border-t-4 border-black px-4 py-3 bg-cream-dark flex gap-2"
            >
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
                className="bg-black text-cream px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-blue transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
                  Event
                </label>
                {events.length === 0 ? (
                  <p className="text-xs text-muted py-2">Loading events...</p>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="w-full border-2 border-black bg-white px-3 py-2.5 pr-8 text-xs font-bold text-black focus:outline-none focus:border-blue cursor-pointer"
                    >
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.day_label} — {ev.title}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black text-xs">
                      &#9660;
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${
                        selectedCategory === cat.value
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black border-black/20 hover:border-black'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="E.G., BOOK SOUND ENGINEER"
                  className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="ANY ADDITIONAL DETAILS..."
                  className="w-full border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder:text-muted/50 focus:outline-none focus:border-blue"
                />
              </div>

              {taskSuccess && (
                <div className="bg-green text-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-center">
                  {taskSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={!taskTitle.trim() || !selectedEvent || !displayName || addingTask}
                className="w-full bg-red text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {addingTask ? 'Adding...' : 'Add Task'}
              </button>

              <p className="text-[10px] text-muted text-center uppercase tracking-wider">
                Tasks are logged in chat and added to the event
              </p>
            </form>
          </>
        )}
      </div>
    </>
  )
}
