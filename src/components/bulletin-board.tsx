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
  created_at: string
}

const teamMembers = ['Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin', 'Dan']

const noteColors = [
  'bg-yellow-100 border-yellow-300',
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-pink-50 border-pink-200',
  'bg-purple-50 border-purple-200',
  'bg-orange-50 border-orange-200',
  'bg-rose-50 border-rose-200',
  'bg-cyan-50 border-cyan-200',
]

const pinColors = ['bg-red', 'bg-blue', 'bg-green', 'bg-orange', 'bg-purple', 'bg-pink-500']

function renderMessage(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-bold text-red bg-red/10 px-0.5">{part}</span>
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
  const [filter, setFilter] = useState<'all' | 'tagged'>('all')

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

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('board-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        const n = payload.new as Note
        if (n.type !== 'chat') return
        setNotes((prev) => {
          if (prev.some((p) => p.id === n.id)) return prev
          return [{ ...n, tagged: Array.isArray(n.tagged) ? n.tagged : [], viewed_by: Array.isArray(n.viewed_by) ? n.viewed_by : [] }, ...prev]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handlePost = async () => {
    if (!input.trim() || !displayName || sending) return
    setSending(true)

    // Auto-detect @mentions in text
    const mentionedInText = (input.match(/@(\w+)/g) || []).map(m => m.slice(1))
    const allTagged = [...new Set([...taggedPeople, ...mentionedInText])]

    const { data } = await supabase.from('comments').insert({
      author: displayName,
      message: input.trim(),
      type: 'chat',
      tagged: allTagged,
      viewed_by: [displayName],
    } as never).select().single()

    if (data) {
      setNotes((prev) => [{ ...(data as Note), tagged: allTagged, viewed_by: [displayName] }, ...prev])
    }

    setInput('')
    setTaggedPeople([])
    setSending(false)
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
    setNotes((prev) => prev.filter(n => n.id !== noteId))
    await supabase.from('comments').delete().eq('id', noteId)
  }

  const toggleTag = (name: string) => {
    setTaggedPeople(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  const filtered = filter === 'tagged' && displayName
    ? notes.filter(n => n.tagged.includes(displayName) || n.author === displayName)
    : notes

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-amber-50"><p className="text-muted text-sm">Loading board...</p></div>
  }

  return (
    <div className="flex-1 flex flex-col bg-amber-50/80" style={{ backgroundImage: 'radial-gradient(circle, #d4a574 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      {/* Top bar */}
      <div className="bg-amber-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white">&larr; Back</a>
          <h1 className="text-lg font-bold uppercase tracking-widest">Bulletin Board</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${filter === 'all' ? 'bg-white text-amber-700' : 'bg-white/20 text-white'}`}>
            All Notes
          </button>
          <button onClick={() => setFilter('tagged')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${filter === 'tagged' ? 'bg-white text-amber-700' : 'bg-white/20 text-white'}`}>
            My Notes
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
          rows={3}
          className="w-full border-2 border-amber-300 bg-yellow-50 px-4 py-3 text-sm text-black leading-relaxed focus:outline-none focus:border-amber-500 disabled:opacity-40 placeholder:text-amber-400 resize-none shadow-inner"
        />
        <div className="flex items-center justify-between mt-3 gap-4">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Tag:</span>
            {teamMembers.map(name => (
              <button key={name} onClick={() => toggleTag(name)}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
                  taggedPeople.includes(name) ? 'bg-red text-white' : 'bg-amber-200/50 text-amber-700 hover:bg-amber-200'
                }`}>
                {name}
              </button>
            ))}
          </div>
          <button onClick={handlePost} disabled={!input.trim() || !displayName || sending}
            className="bg-amber-700 text-white px-8 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-amber-800 transition-colors disabled:opacity-40 shrink-0 shadow-md">
            {sending ? 'Pinning...' : 'Pin Note'}
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filtered.length === 0 ? (
          <p className="text-center text-amber-600 text-lg mt-20 italic">No notes yet. Pin one to the board!</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {filtered.map((note, idx) => {
              const color = noteColors[note.author.length % noteColors.length]
              const pin = pinColors[idx % pinColors.length]
              const rotations = ['-rotate-1', 'rotate-0.5', 'rotate-1', '-rotate-0.5', 'rotate-0']
              const rotation = rotations[idx % rotations.length]
              const isViewed = displayName ? note.viewed_by.includes(displayName) : false
              const isTagged = displayName ? note.tagged.includes(displayName) : false

              return (
                <div key={note.id} className={`${color} border-2 p-5 shadow-lg ${rotation} relative break-inside-avoid group/note ${isTagged && !isViewed ? 'ring-2 ring-red ring-offset-2' : ''}`}>
                  {/* Pin */}
                  <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${pin} shadow-md border-2 border-white`} />

                  {/* Delete */}
                  <button onClick={() => handleDelete(note.id)}
                    className="absolute top-1 right-2 text-black/10 hover:text-red transition-colors text-lg font-bold opacity-0 group-hover/note:opacity-100">
                    &times;
                  </button>

                  {/* Content */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap mt-1">{renderMessage(note.message)}</p>

                  {/* Tagged people */}
                  {note.tagged.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {note.tagged.map(name => (
                        <span key={name} className="text-[9px] font-bold uppercase tracking-wider bg-red/10 text-red px-1.5 py-0.5">
                          @{name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
                    <div>
                      <span className="text-[10px] font-bold text-black/50">{note.author}</span>
                      <span className="text-[10px] text-black/30 ml-2">
                        {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' '}
                        {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Viewed checkmark */}
                    <div className="flex items-center gap-1">
                      {note.viewed_by.length > 0 && (
                        <span className="text-[9px] text-black/30" title={`Viewed by: ${note.viewed_by.join(', ')}`}>
                          {note.viewed_by.length} viewed
                        </span>
                      )}
                      {displayName && !isViewed && (
                        <button onClick={() => handleMarkViewed(note.id)}
                          className="w-6 h-6 rounded border-2 border-green/30 hover:border-green hover:bg-green/10 flex items-center justify-center transition-colors"
                          title="Mark as viewed">
                          <svg className="w-3.5 h-3.5 text-green/40 hover:text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      {isViewed && (
                        <div className="w-6 h-6 rounded bg-green/20 flex items-center justify-center" title="You viewed this">
                          <svg className="w-3.5 h-3.5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
