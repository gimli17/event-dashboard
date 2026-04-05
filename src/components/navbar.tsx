'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/lib/sidebar-context'
import { supabase } from '@/lib/supabase'

interface SearchResult {
  id: string
  title: string
  type: 'task' | 'event' | 'note'
  subtitle: string
  href: string
}

export function Navbar() {
  const sidebar = useSidebar()
  const router = useRouter()
  const [reviewCount, setReviewCount] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from('master_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'review')
      setReviewCount(count || 0)
    }
    fetchCount()
  }, [])

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
        setResults([])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Search as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const q = searchQuery.trim().toLowerCase()
      const allResults: SearchResult[] = []

      // Search master_tasks
      const { data: tasks } = await supabase
        .from('master_tasks')
        .select('id, title, status, assignee, priority, overview, current_status')
        .is('deleted_at', null)
        .ilike('title', `%${q}%`)
        .limit(10) as { data: { id: string; title: string; status: string; assignee: string | null; priority: string; overview: string | null; current_status: string | null }[] | null }

      if (tasks) {
        for (const t of tasks) {
          allResults.push({
            id: t.id,
            title: t.title,
            type: 'task',
            subtitle: [t.assignee, t.priority === 'ultra-high' ? 'Very High' : t.priority, t.status].filter(Boolean).join(' · '),
            href: `/tasks`,
          })
        }
      }

      // Also search in overview/current_status if title didn't match enough
      if (allResults.length < 5) {
        const { data: tasks2 } = await supabase
          .from('master_tasks')
          .select('id, title, status, assignee, priority, overview, current_status')
          .is('deleted_at', null)
          .or(`overview.ilike.%${q}%,current_status.ilike.%${q}%,action_items.ilike.%${q}%,dan_comments.ilike.%${q}%`)
          .limit(10) as { data: { id: string; title: string; status: string; assignee: string | null; priority: string; overview: string | null; current_status: string | null }[] | null }

        if (tasks2) {
          const existingIds = new Set(allResults.map(r => r.id))
          for (const t of tasks2) {
            if (!existingIds.has(t.id)) {
              allResults.push({
                id: t.id,
                title: t.title,
                type: 'task',
                subtitle: [t.assignee, t.priority === 'ultra-high' ? 'Very High' : t.priority, t.status].filter(Boolean).join(' · '),
                href: `/tasks`,
              })
            }
          }
        }
      }

      // Search deleted/archived tasks — these go to the log
      const { data: deletedTasks } = await supabase
        .from('master_tasks')
        .select('id, title, status, assignee, priority, deleted_at')
        .not('deleted_at', 'is', null)
        .ilike('title', `%${q}%`)
        .limit(5) as { data: { id: string; title: string; status: string; assignee: string | null; priority: string; deleted_at: string }[] | null }

      if (deletedTasks) {
        const existingIds = new Set(allResults.map(r => r.id))
        for (const t of deletedTasks) {
          if (!existingIds.has(t.id)) {
            allResults.push({
              id: t.id,
              title: t.title,
              type: 'task',
              subtitle: [t.status === 'complete' ? 'Archived' : 'Deleted', t.assignee, t.priority === 'ultra-high' ? 'Very High' : t.priority].filter(Boolean).join(' · '),
              href: `/log?task=${t.id}`,
            })
          }
        }
      }

      // Search events
      const { data: events } = await supabase
        .from('events')
        .select('id, title, date, time, location')
        .ilike('title', `%${q}%`)
        .limit(5) as { data: { id: string; title: string; date: string | null; time: string | null; location: string | null }[] | null }

      if (events) {
        for (const e of events) {
          allResults.push({
            id: e.id,
            title: e.title,
            type: 'event',
            subtitle: [e.date, e.time, e.location].filter(Boolean).join(' · '),
            href: `/events/${e.id}`,
          })
        }
      }

      // Search bulletin board notes
      const { data: notes } = await supabase
        .from('bulletin_notes')
        .select('id, title, body, author')
        .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
        .limit(5) as { data: { id: string; title: string | null; body: string | null; author: string }[] | null }

      if (notes) {
        for (const n of notes) {
          allResults.push({
            id: n.id,
            title: n.title || 'Untitled note',
            type: 'note',
            subtitle: `Board note by ${n.author}`,
            href: `/board`,
          })
        }
      }

      setResults(allResults.slice(0, 15))
      setSelectedIdx(0)
      setSearching(false)
    }, 250)
  }, [searchQuery])

  const handleSelect = (result: SearchResult) => {
    setSearchOpen(false)
    setSearchQuery('')
    setResults([])
    router.push(result.href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx])
    }
  }

  const typeIcons: Record<string, string> = { task: '☐', event: '◆', note: '■' }
  const typeColors: Record<string, string> = { task: 'text-blue', event: 'text-green', note: 'text-gold' }

  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav className="bg-blue text-white relative">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold tracking-widest uppercase">
            Boulder Roots 2026
          </Link>
          <div className="flex items-center gap-5">
            {/* Search trigger */}
            <button
              onClick={() => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
              className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <kbd className="hidden lg:inline text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>
            {/* Primary nav items */}
            <Link href="/tasks" className="text-xs font-bold tracking-widest uppercase hover:text-cream transition-colors">
              Tasks
            </Link>
            <Link href="/social" className="text-xs font-bold tracking-widest uppercase bg-pink-500/20 hover:bg-pink-500/30 px-3 py-1.5 transition-colors">
              Social
            </Link>
            <Link href="/board" className="text-xs font-bold tracking-widest uppercase bg-amber-500/30 hover:bg-amber-500/50 px-3 py-1.5 transition-colors">
              Board
            </Link>
            <Link href="/team" className="text-xs font-bold tracking-widest uppercase bg-purple-light/30 hover:bg-purple-light/50 px-3 py-1.5 transition-colors relative">
              Team Workspace
              {reviewCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-red text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {reviewCount}
                </span>
              )}
            </Link>
            {/* Hamburger menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="hover:text-cream transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
        {/* Dropdown menu */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-6 top-14 z-50 bg-white border-2 border-black shadow-lg min-w-[200px]">
              <Link href="/schedule" onClick={() => setMenuOpen(false)}
                className="block px-5 py-3 text-xs font-bold tracking-widest uppercase text-black hover:bg-cream transition-colors">
                Schedule
              </Link>
              <Link href="/bold-conversations" onClick={() => setMenuOpen(false)}
                className="block px-5 py-3 text-xs font-bold tracking-widest uppercase text-black hover:bg-cream transition-colors border-t border-black/10">
                Bold Conversations
              </Link>
              <Link href="/private-parties" onClick={() => setMenuOpen(false)}
                className="block px-5 py-3 text-xs font-bold tracking-widest uppercase text-black hover:bg-cream transition-colors border-t border-black/10">
                Private Parties
              </Link>
              <Link href="/log" onClick={() => setMenuOpen(false)}
                className="block px-5 py-3 text-xs font-bold tracking-widest uppercase text-black hover:bg-cream transition-colors border-t border-black/10">
                Activity Log
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* Search modal overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" onClick={() => { setSearchOpen(false); setSearchQuery(''); setResults([]) }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl bg-white shadow-2xl border-2 border-black" onClick={e => e.stopPropagation()}>
            {/* Search input */}
            <div className="flex items-center border-b-2 border-black/10 px-5">
              <svg className="w-4 h-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search tasks, events, notes..."
                className="flex-1 px-3 py-4 text-sm font-bold text-black placeholder:text-muted/40 focus:outline-none bg-transparent"
                autoFocus
              />
              <kbd className="text-[9px] text-muted bg-black/5 px-2 py-1 font-mono">ESC</kbd>
            </div>

            {/* Results */}
            {searching && (
              <div className="px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Searching...</p>
              </div>
            )}

            {!searching && results.length > 0 && (
              <div className="max-h-80 overflow-y-auto">
                {results.map((r, i) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    className={`w-full text-left px-5 py-3 flex items-start gap-3 transition-colors ${i === selectedIdx ? 'bg-cream' : 'hover:bg-cream/50'} ${i > 0 ? 'border-t border-black/5' : ''}`}
                  >
                    <span className={`text-sm mt-0.5 ${typeColors[r.type]}`}>{typeIcons[r.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black truncate">{r.title}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-0.5">{r.subtitle}</p>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted/50 shrink-0 mt-1">{r.type}</span>
                  </button>
                ))}
              </div>
            )}

            {!searching && searchQuery.trim() && results.length === 0 && (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-muted">No results for &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}

            {!searchQuery.trim() && (
              <div className="px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Type to search across tasks, events, and board notes</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
