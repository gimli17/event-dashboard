'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import type { Comment } from '@/lib/types'

export function ChatSidebar() {
  const { displayName } = useUser()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Comment[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch initial messages
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

  // Subscribe to realtime inserts
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

  // Auto-scroll on new messages
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
        <div className="flex items-center justify-between px-4 py-4 border-b-4 border-black bg-black text-cream">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            BRMF Chat
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-cream hover:text-red-bright text-lg font-bold leading-none"
            aria-label="Close chat"
          >
            &times;
          </button>
        </div>

        {/* Messages */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
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

        {/* Input */}
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
      </div>
    </>
  )
}
