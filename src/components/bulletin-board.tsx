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

// Avatar photos — add more as you get them
const avatarPhotos: Record<string, string> = {
  Sabrina: '/avatars/sabrina.jpg',
}

// Colors for initial avatars
const avatarColors: Record<string, string> = {
  Dan: 'bg-purple', Cody: 'bg-blue', Joe: 'bg-green', Danny: 'bg-orange',
  Connor: 'bg-red', Gib: 'bg-gold', Emily: 'bg-pink-500', Kendall: 'bg-cyan-600',
  Alex: 'bg-indigo-500', Liam: 'bg-teal', Dave: 'bg-amber-600', Tom: 'bg-rose-600', Kevin: 'bg-emerald-600',
}

const noteColors = [
  'bg-yellow-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200',
  'bg-purple-200', 'bg-orange-200', 'bg-cyan-200', 'bg-rose-200',
]

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const photo = avatarPhotos[name]
  const color = avatarColors[name] || 'bg-muted'
  const dim = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-9 h-9 text-xs'

  if (photo) {
    return <img src={photo} alt={name} className={`${dim} rounded-full object-cover border-2 border-white shadow-sm`} />
  }

  return (
    <div className={`${dim} ${color} rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm`}>
      {name.charAt(0)}
    </div>
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

  const topNotes = notes.filter(n => !n.parent_id)
  const getReplies = (noteId: string) => notes.filter(n => n.parent_id === noteId).sort((a, b) => a.created_at.localeCompare(b.created_at))

  const filtered = filter === 'mine' && displayName
    ? topNotes.filter(n => n.tagged.includes(displayName) || n.author === displayName)
    : topNotes

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-amber-50"><p className="text-muted text-sm">Loading board...</p></div>
  }

  return (
    <div className="flex-1 flex flex-col bg-amber-50" style={{ backgroundImage: 'radial-gradient(circle, #d4a574 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
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
            For Me
          </button>
        </div>
      </div>

      {/* Compose */}
      <div className="px-6 py-4 bg-amber-100/60 border-b-2 border-amber-200">
        <div className="flex gap-4 items-start">
          {displayName && <Avatar name={displayName} />}
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost() } }}
              placeholder={displayName ? 'Write a note... (Shift+Enter for new line)' : 'Set your name first'}
              disabled={!displayName}
              rows={2}
              className="w-full border-2 border-amber-300 bg-yellow-50 px-4 py-3 text-sm text-black leading-relaxed focus:outline-none focus:border-amber-500 disabled:opacity-40 placeholder:text-amber-400"
              style={{ resize: 'vertical' }}
            />
            <div className="flex items-center justify-between mt-2 gap-4">
              <div className="flex items-center gap-1 flex-wrap flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mr-1">Tag:</span>
                {teamMembers.map(name => (
                  <button key={name} onClick={() => toggleTag(name)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all rounded-sm ${
                      taggedPeople.includes(name) ? 'bg-red text-white' : 'bg-amber-200/50 text-amber-700 hover:bg-amber-200'
                    }`}>
                    {name}
                  </button>
                ))}
              </div>
              <button onClick={handlePost} disabled={!input.trim() || !displayName || sending}
                className="bg-amber-700 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-amber-800 transition-colors disabled:opacity-40 shrink-0 shadow">
                {sending ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filtered.length === 0 ? (
          <p className="text-center text-amber-600 text-lg mt-20 italic">No notes yet. Post one!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((note, idx) => {
              const color = noteColors[note.author.length % noteColors.length]
              const replies = getReplies(note.id)
              const isExpanded = expandedNote === note.id
              const isViewed = displayName ? note.viewed_by.includes(displayName) : false
              const isTagged = displayName ? note.tagged.includes(displayName) : false

              return (
                <div key={note.id} className={`${color} shadow-lg aspect-square flex flex-col relative group/note ${isTagged && !isViewed ? 'ring-2 ring-red ring-offset-2' : ''}`}
                  style={{ minHeight: '220px' }}>
                  {/* Delete */}
                  <button onClick={() => handleDelete(note.id)}
                    className="absolute top-2 right-2 text-black/10 hover:text-red transition-colors text-lg font-bold opacity-0 group-hover/note:opacity-100 z-10">
                    &times;
                  </button>

                  {/* Author header */}
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                    <Avatar name={note.author} size="sm" />
                    <div>
                      <span className="text-[11px] font-bold text-black/70">{note.author}</span>
                      <span className="text-[9px] text-black/30 ml-1.5">
                        {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 px-4 pb-2 overflow-auto">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: note.message.replace(/@(\w+)/g, '<span class="font-bold text-red">@$1</span>') }} />
                  </div>

                  {/* Tags */}
                  {note.tagged.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-4 pb-2">
                      {note.tagged.map(name => (
                        <span key={name} className="text-[8px] font-bold uppercase tracking-wider bg-red/15 text-red px-1 py-0.5 rounded-sm">@{name}</span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between px-4 py-2 border-t border-black/5">
                    <button onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 transition-colors ${replies.length > 0 ? 'text-blue bg-blue/10' : 'text-black/30 hover:text-black/50'}`}>
                      {replies.length > 0 ? `${replies.length} ${replies.length === 1 ? 'comment' : 'comments'}` : 'Comment'}
                    </button>
                    <div className="flex items-center gap-1">
                      {note.viewed_by.length > 0 && (
                        <span className="text-[9px] text-black/30" title={`Seen: ${note.viewed_by.join(', ')}`}>{note.viewed_by.length} seen</span>
                      )}
                      {displayName && !isViewed ? (
                        <button onClick={() => handleMarkViewed(note.id)}
                          className="w-5 h-5 rounded border border-green/30 hover:border-green hover:bg-green/10 flex items-center justify-center transition-colors" title="Mark as seen">
                          <svg className="w-3 h-3 text-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </button>
                      ) : isViewed ? (
                        <div className="w-5 h-5 rounded bg-green/20 flex items-center justify-center" title="Seen">
                          <svg className="w-3 h-3 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Comments thread */}
                  {isExpanded && (
                    <div className="border-t-2 border-black/10 bg-white/70 max-h-48 overflow-y-auto">
                      {replies.map((reply) => (
                        <div key={reply.id} className="px-4 py-2 border-b border-black/5 last:border-0 group/reply flex items-start gap-2">
                          <Avatar name={reply.author} size="sm" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-black/50">{reply.author}</span>
                            <p className="text-xs leading-relaxed">{reply.message}</p>
                          </div>
                          <button onClick={() => handleDelete(reply.id)}
                            className="text-black/10 hover:text-red text-sm font-bold opacity-0 group-hover/reply:opacity-100 shrink-0">&times;</button>
                        </div>
                      ))}
                      <div className="px-4 py-2 flex gap-2 items-center">
                        {displayName && <Avatar name={displayName} size="sm" />}
                        <input
                          type="text"
                          value={replyingTo === note.id ? replyInput : ''}
                          onChange={(e) => { setReplyingTo(note.id); setReplyInput(e.target.value) }}
                          onFocus={() => setReplyingTo(note.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleReply(note.id) }}
                          placeholder="Reply..."
                          className="flex-1 border border-black/15 bg-white px-2 py-1 text-xs text-black focus:outline-none focus:border-amber-500 placeholder:text-black/25"
                        />
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
