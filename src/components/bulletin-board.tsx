'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'

interface Note {
  id: string
  author: string
  message: string
  type: string
  tagged: string[]
  viewed_by: string[]
  parent_id: string | null
  created_at: string
}

const teamMembers = ['Dan', 'Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

const noteColors = [
  'bg-yellow-100 border-yellow-300',
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-pink-50 border-pink-200',
  'bg-purple-50 border-purple-200',
  'bg-orange-50 border-orange-200',
  'bg-cyan-50 border-cyan-200',
  'bg-rose-50 border-rose-200',
]

function renderMessage(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-bold text-red bg-red/10 px-0.5 rounded">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function BulletinBoard() {
  const { displayName } = useUser()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [taggedPeople, setTaggedPeople] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('type', 'chat')
        .order('created_at', { ascending: false })
      if (data) {
        setNotes((data as Note[]).map(n => ({
          ...n,
          tagged: Array.isArray(n.tagged) ? n.tagged : [],
          viewed_by: Array.isArray(n.viewed_by) ? n.viewed_by : [],
        })))
      }
      setLoading(false)
    }
    fetch()
  }, [])

  const handlePost = async () => {
    if (!input.trim() || !displayName || sending) return
    setSending(true)
    const mentionedInText = (input.match(/@(\w+)/g) || []).map(m => m.slice(1))
    const allTagged = [...new Set([...taggedPeople, ...mentionedInText])]

    const { data } = await supabase.from('comments').insert({
      author: displayName,
      message: input.trim(),
      type: 'chat',
      tagged: allTagged,
      viewed_by: [displayName],
      parent_id: null,
    } as never).select().single()

    if (data) {
      setNotes((prev) => [{ ...(data as Note), tagged: allTagged, viewed_by: [displayName] }, ...prev])
    }
    setInput('')
    setTaggedPeople([])
    setSending(false)
  }

  const handleReply = async (parentId: string) => {
    if (!replyInput.trim() || !displayName) return
    const { data } = await supabase.from('comments').insert({
      author: displayName,
      message: replyInput.trim(),
      type: 'chat',
      tagged: [],
      viewed_by: [],
      parent_id: parentId,
    } as never).select().single()

    if (data) {
      setNotes((prev) => [...prev, { ...(data as Note), tagged: [], viewed_by: [] }])
    }
    setReplyInput('')
    setReplyingTo(null)
  }

  const handleMarkViewed = async (noteId: string) => {
    if (!displayName) return
    const note = notes.find(n => n.id === noteId)
    if (!note || note.viewed_by.includes(displayName)) return
    const newViewedBy = [...note.viewed_by, displayName]
    setNotes((prev) => prev.map(n => n.id === noteId ? { ...n, viewed_by: newViewedBy } : n))
    await supabase.from('comments').update({ viewed_by: newViewedBy } as never).eq('id', noteId)
  }

  const handleDelete = async (noteId: string) => {
    setNotes((prev) => prev.filter(n => n.id !== noteId && n.parent_id !== noteId))
    await supabase.from('comments').delete().eq('id', noteId)
  }

  const toggleTag = (name: string) => {
    setTaggedPeople(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  // Separate top-level notes and replies
  const topNotes = notes.filter(n => !n.parent_id)
  const getReplies = (noteId: string) => notes.filter(n => n.parent_id === noteId).sort((a, b) => a.created_at.localeCompare(b.created_at))

  const filtered = filter === 'mine' && displayName
    ? topNotes.filter(n => n.tagged.includes(displayName) || n.author === displayName)
    : topNotes

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-amber-50"><p className="text-muted text-sm">Loading board...</p></div>
  }

  return (
    <div className="flex-1 flex flex-col bg-amber-50/80" style={{ backgroundImage: 'radial-gradient(circle, #d4a574 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      {/* Top bar */}
      <div className="bg-amber-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white">&larr; Back</a>
          <h1 className="text-lg font-bold uppercase tracking-widest">Board</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${filter === 'all' ? 'bg-white text-amber-700' : 'bg-white/20 text-white'}`}>
            All
          </button>
          <button onClick={() => setFilter('mine')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${filter === 'mine' ? 'bg-white text-amber-700' : 'bg-white/20 text-white'}`}>
            Tagged for Me
          </button>
        </div>
      </div>

      {/* Compose */}
      <div className="px-6 py-4 bg-amber-100/50 border-b-2 border-amber-200">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost() } }}
          placeholder={displayName ? 'Write a note... (Shift+Enter for new line, @name to mention)' : 'Set your name first'}
          disabled={!displayName}
          rows={2}
          className="w-full border-2 border-amber-300 bg-yellow-50 px-4 py-3 text-sm text-black leading-relaxed focus:outline-none focus:border-amber-500 disabled:opacity-40 placeholder:text-amber-400"
          style={{ resize: 'vertical' }}
        />
        <div className="flex items-center justify-between mt-3 gap-4">
          <div className="flex items-center gap-1 flex-wrap flex-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mr-1">Tag:</span>
            {teamMembers.map(name => (
              <button key={name} onClick={() => toggleTag(name)}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all rounded-sm ${
                  taggedPeople.includes(name) ? 'bg-red text-white' : 'bg-amber-200/50 text-amber-700 hover:bg-amber-200'
                }`}>
                {name}
              </button>
            ))}
          </div>
          <button onClick={handlePost} disabled={!input.trim() || !displayName || sending}
            className="bg-amber-700 text-white px-8 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-amber-800 transition-colors disabled:opacity-40 shrink-0 shadow-md">
            {sending ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filtered.length === 0 ? (
          <p className="text-center text-amber-600 text-lg mt-20 italic">No notes yet. Post one!</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {filtered.map((note) => {
              const color = noteColors[note.author.length % noteColors.length]
              const replies = getReplies(note.id)
              const isExpanded = expandedNote === note.id
              const isViewed = displayName ? note.viewed_by.includes(displayName) : false
              const isTagged = displayName ? note.tagged.includes(displayName) : false

              return (
                <div key={note.id} className={`${color} border-2 shadow-lg break-inside-avoid ${isTagged && !isViewed ? 'ring-2 ring-red ring-offset-2' : ''}`}>
                  {/* Note content */}
                  <div className="px-5 py-4 group/note relative">
                    <button onClick={() => handleDelete(note.id)}
                      className="absolute top-2 right-3 text-black/10 hover:text-red transition-colors text-lg font-bold opacity-0 group-hover/note:opacity-100">
                      &times;
                    </button>

                    <div className="text-sm leading-relaxed whitespace-pre-wrap pr-6" dangerouslySetInnerHTML={{ __html: note.message.replace(/@(\w+)/g, '<span class="font-bold text-red">@$1</span>') }} />

                    {/* Tagged people */}
                    {note.tagged.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {note.tagged.map(name => (
                          <span key={name} className="text-[9px] font-bold uppercase tracking-wider bg-red/10 text-red px-1.5 py-0.5 rounded-sm">
                            @{name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-black/50">{note.author}</span>
                        <span className="text-[10px] text-black/30">
                          {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Reply count */}
                        <button onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 transition-colors ${replies.length > 0 ? 'text-blue bg-blue/10 hover:bg-blue/20' : 'text-black/30 hover:text-black/50'}`}>
                          {replies.length > 0 ? `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}` : 'Reply'}
                        </button>
                        {/* Viewed */}
                        {displayName && !isViewed ? (
                          <button onClick={() => handleMarkViewed(note.id)}
                            className="w-6 h-6 rounded border border-green/30 hover:border-green hover:bg-green/10 flex items-center justify-center transition-colors"
                            title="Mark as seen">
                            <svg className="w-3.5 h-3.5 text-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        ) : isViewed ? (
                          <div className="w-6 h-6 rounded bg-green/20 flex items-center justify-center" title={`Seen by: ${note.viewed_by.join(', ')}`}>
                            <svg className="w-3.5 h-3.5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : null}
                        {note.viewed_by.length > 0 && (
                          <span className="text-[9px] text-black/30" title={`Seen by: ${note.viewed_by.join(', ')}`}>{note.viewed_by.length}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies thread */}
                  {isExpanded && (
                    <div className="border-t-2 border-black/10 bg-white/50">
                      {replies.map((reply) => (
                        <div key={reply.id} className="px-5 py-3 border-b border-black/5 last:border-0 group/reply">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-xs leading-relaxed">{renderMessage(reply.message)}</p>
                              <span className="text-[10px] font-bold text-black/40 mt-1 block">
                                {reply.author} &middot; {new Date(reply.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <button onClick={() => handleDelete(reply.id)}
                              className="text-black/10 hover:text-red text-sm font-bold opacity-0 group-hover/reply:opacity-100 transition-colors">&times;</button>
                          </div>
                        </div>
                      ))}

                      {/* Reply input */}
                      <div className="px-5 py-3 flex gap-2">
                        <input
                          type="text"
                          value={replyingTo === note.id ? replyInput : ''}
                          onChange={(e) => { setReplyingTo(note.id); setReplyInput(e.target.value) }}
                          onFocus={() => setReplyingTo(note.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleReply(note.id) }}
                          placeholder="Write a reply..."
                          className="flex-1 border border-black/20 bg-white px-3 py-1.5 text-xs text-black focus:outline-none focus:border-amber-500 placeholder:text-black/30"
                        />
                        <button onClick={() => handleReply(note.id)}
                          disabled={!replyInput.trim() || replyingTo !== note.id}
                          className="bg-amber-600 text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-700 transition-colors disabled:opacity-40">
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
