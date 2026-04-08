'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'

interface LogEntry {
  id: string
  actor: string
  action: string
  target_type: string | null
  target_id: string | null
  target_title: string | null
  details: string | null
  created_at: string
}

interface TaskContext {
  title: string | null
  current_status: string | null
  overview: string | null
  action_items: string | null
  dan_comments: string | null
  update_to_dan: string | null
  dan_feedback: string | null
  dan_checklist: { id: string; text: string; checked: boolean }[] | null
  links: string | null
  status: string | null
  assignee: string | null
  priority: string | null
  deadline: string | null
  initiative: string | null
}

const actionColors: Record<string, string> = {
  created: 'text-green',
  completed: 'text-green',
  approved: 'text-green',
  updated: 'text-blue',
  assigned: 'text-purple',
  reviewed: 'text-purple',
  deleted: 'text-red',
  submitted: 'text-orange',
  posted: 'text-gold',
  sent: 'text-orange',
  archived: 'text-muted',
}

const teamMembers = ['All', 'Dan', 'Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

export function ActivityLog() {
  const { displayName } = useUser()
  const searchParams = useSearchParams()
  const highlightTaskId = searchParams.get('task')
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set())
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPerson, setFilterPerson] = useState('All')
  const [filterDate, setFilterDate] = useState('')
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [taskContexts, setTaskContexts] = useState<Record<string, TaskContext>>({})
  const highlightRef = useRef<HTMLDivElement>(null)
  const didScrollRef = useRef(false)

  useEffect(() => {
    async function fetch() {
      const query = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200)
      const { data } = await query
      if (data) {
        setEntries(data as LogEntry[])
        // Auto-expand the first entry matching the highlighted task
        if (highlightTaskId) {
          const match = (data as LogEntry[]).find(e => e.target_id === highlightTaskId)
          if (match) {
            setExpandedEntry(match.id)
            // Pre-load context
            const { data: mt } = await supabase.from('master_tasks')
              .select('title, current_status, overview, action_items, dan_comments, update_to_dan, dan_feedback, dan_checklist, links, status, assignee, priority, deadline, initiative')
              .eq('id', highlightTaskId)
              .single()
            if (mt) {
              setTaskContexts(prev => ({ ...prev, [highlightTaskId]: mt as TaskContext }))
            }
          }
        }
      }
      setLoading(false)
    }
    fetch()
  }, [highlightTaskId])

  // Scroll to highlighted entry once loaded
  useEffect(() => {
    if (!loading && highlightRef.current && !didScrollRef.current) {
      didScrollRef.current = true
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
  }, [loading, expandedEntry])

  const loadTaskContext = async (entryId: string, taskId: string) => {
    if (taskContexts[taskId]) {
      setExpandedEntry(expandedEntry === entryId ? null : entryId)
      return
    }
    // Try master_tasks first
    const { data: mt } = await supabase.from('master_tasks')
      .select('title, current_status, overview, action_items, dan_comments, update_to_dan, dan_feedback, dan_checklist, links, status, assignee, priority, deadline, initiative')
      .eq('id', taskId)
      .single()
    if (mt) {
      setTaskContexts(prev => ({ ...prev, [taskId]: mt as TaskContext }))
    }
    setExpandedEntry(expandedEntry === entryId ? null : entryId)
  }

  // Filter
  let filtered = entries
  if (filterPerson !== 'All') {
    filtered = filtered.filter(e => e.actor === filterPerson)
  }
  if (filterDate) {
    filtered = filtered.filter(e => e.created_at.startsWith(filterDate))
  }

  // Group by date
  const grouped: Record<string, LogEntry[]> = {}
  for (const entry of filtered) {
    const date = new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(entry)
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading...</p></div>
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Person:</span>
          <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)}
            className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer">
            {teamMembers.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Date:</span>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="border-2 border-black/20 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer" />
          {filterDate && <button onClick={() => setFilterDate('')} className="text-[10px] font-bold text-red">&times; Clear</button>}
        </div>
        <span className="text-[10px] text-muted">{filtered.length} entries</span>
      </div>

      {/* Log entries */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-center text-muted py-12 text-sm">No activity recorded yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date}>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted mb-3">{date}</h2>
              <div className="border-l-2 border-black/10 pl-4 space-y-0">
                {dayEntries.map((entry) => {
                  const actionWord = entry.action.split(' ')[0].toLowerCase()
                  const color = actionColors[actionWord] || 'text-muted'
                  const hasTaskContext = entry.target_type === 'task' && entry.target_id
                  const isExpanded = expandedEntry === entry.id
                  const ctx = entry.target_id ? taskContexts[entry.target_id] : null
                  const actionLower = entry.action.toLowerCase()
                  const isDeleteOrArchive = actionLower.includes('deleted') || actionLower.includes('archived') || actionLower.includes('delete')
                  const canRestore = isDeleteOrArchive && entry.target_type === 'task' && entry.target_id && !restoredIds.has(entry.id)

                  return (
                    <div key={entry.id} className="py-2"
                      ref={highlightTaskId && entry.target_id === highlightTaskId ? highlightRef : undefined}>
                      <div className={`flex items-start gap-3 ${highlightTaskId && entry.target_id === highlightTaskId ? 'bg-gold/10 -mx-2 px-2 py-1 border-l-4 border-gold' : ''}`}>
                        {/* Timeline dot */}
                        <div className={`w-2 h-2 rounded-full mt-1.5 -ml-[21px] ${color.replace('text-', 'bg-')}`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm font-bold">{entry.actor}</span>
                            <span className={`text-sm ${color}`}>{entry.action}</span>
                            {entry.target_title && (
                              <span className="text-sm font-bold">{entry.target_title}</span>
                            )}
                            {hasTaskContext && (
                              <button
                                onClick={() => loadTaskContext(entry.id, entry.target_id!)}
                                className="text-[10px] font-bold uppercase tracking-widest text-blue hover:text-purple transition-colors"
                              >
                                {isExpanded ? '▲ Hide context' : '▼ View context'}
                              </button>
                            )}
                            {canRestore && (
                              <button
                                onClick={async () => {
                                  await supabase.from('master_tasks').update({ deleted_at: null } as never).eq('id', entry.target_id!)
                                  setRestoredIds(prev => new Set([...prev, entry.id]))
                                  if (displayName) {
                                    await supabase.from('activity_log').insert({
                                      actor: displayName,
                                      action: 'restored',
                                      target_type: 'task',
                                      target_id: entry.target_id,
                                      target_title: entry.target_title,
                                    } as never)
                                  }
                                }}
                                className="text-xs font-bold uppercase tracking-widest text-green bg-green/10 hover:bg-green hover:text-white px-3 py-1 transition-colors border border-green/30"
                              >
                                Restore
                              </button>
                            )}
                            {restoredIds.has(entry.id) && (
                              <span className="text-xs font-bold uppercase tracking-widest text-green bg-green/10 px-3 py-1">Restored ✓</span>
                            )}
                          </div>
                          {entry.details && (
                            <p className="text-xs text-muted mt-0.5">{entry.details}</p>
                          )}
                          <span className="text-[10px] text-muted/50">
                            {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Expanded task context — full view */}
                      {isExpanded && ctx && (
                        <div className="ml-4 mt-2 mb-2 border-l-4 border-blue/20 bg-white px-5 py-4 space-y-4">
                          {/* Status badges */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {ctx.status && (
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${
                                ctx.status === 'complete' ? 'bg-green text-white' :
                                ctx.status === 'review' ? 'bg-purple text-white' :
                                ctx.status === 'in-progress' ? 'bg-blue text-white' :
                                ctx.status === 'blocked' ? 'bg-red text-white' :
                                'bg-black/10 text-black'
                              }`}>{ctx.status}</span>
                            )}
                            {ctx.priority && (
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${
                                ctx.priority === 'ultra-high' ? 'bg-red text-white' :
                                ctx.priority === 'high' ? 'bg-orange text-white' :
                                ctx.priority === 'medium' ? 'bg-gold text-white' :
                                'bg-black/10 text-black'
                              }`}>{ctx.priority === 'ultra-high' ? 'Very High' : ctx.priority}</span>
                            )}
                            {ctx.assignee && (
                              <span className="text-[10px] font-bold text-blue uppercase tracking-widest">{ctx.assignee}</span>
                            )}
                            {ctx.deadline && (
                              <span className="text-[10px] font-bold text-red uppercase tracking-widest">
                                Due {new Date(ctx.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            {ctx.initiative && (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{ctx.initiative}</span>
                            )}
                          </div>

                          {/* Current Status */}
                          {ctx.current_status && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Current Status</p>
                              <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: ctx.current_status }} />
                            </div>
                          )}

                          {/* Action Items */}
                          {ctx.action_items && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Action Items</p>
                              <div className="space-y-1">
                                {ctx.action_items.split('\n').filter(Boolean).map((item, ai) => {
                                  const trimmed = item.replace(/^[-•*]\s*/, '').replace(/^\[[ x]\]\s*/i, '').trim()
                                  const isChecked = item.match(/^\[x\]/i) !== null
                                  return (
                                    <div key={ai} className="flex items-start gap-2">
                                      <span className={`mt-0.5 w-4 h-4 flex items-center justify-center shrink-0 border-2 ${isChecked ? 'bg-green border-green text-white' : 'border-black/20'}`}>
                                        {isChecked && <span className="text-[9px]">✓</span>}
                                      </span>
                                      <span className={`text-sm ${isChecked ? 'line-through text-muted' : ''}`}>{trimmed}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Links */}
                          {ctx.links && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Links</p>
                              {ctx.links.split('\n').filter(Boolean).map((line, li) => {
                                const trimmed = line.trim()
                                const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/)
                                const url = urlMatch ? urlMatch[1] : (trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
                                return (
                                  <a key={li} href={url} target="_blank" rel="noopener noreferrer"
                                    className="text-sm text-blue hover:text-red underline block">{trimmed}</a>
                                )
                              })}
                            </div>
                          )}

                          {/* Dan's Comments */}
                          {ctx.dan_comments && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Dan&apos;s Comments</p>
                              <div className="text-sm leading-relaxed border-l-4 border-muted/20 pl-3 italic text-muted" dangerouslySetInnerHTML={{ __html: ctx.dan_comments }} />
                            </div>
                          )}

                          {/* Update to Dan */}
                          {ctx.update_to_dan && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-purple mb-1">Update Submitted to Dan</p>
                              <div className="text-sm leading-relaxed border-l-4 border-purple pl-3" dangerouslySetInnerHTML={{ __html: ctx.update_to_dan }} />
                            </div>
                          )}

                          {/* Dan's Feedback */}
                          {ctx.dan_feedback && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-red mb-1">Dan&apos;s Feedback</p>
                              <div className="text-sm leading-relaxed border-l-4 border-red pl-3" dangerouslySetInnerHTML={{ __html: ctx.dan_feedback }} />
                            </div>
                          )}

                          {/* Dan's Checklist */}
                          {ctx.dan_checklist && ctx.dan_checklist.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-purple mb-1">Dan&apos;s Checklist</p>
                              <div className="space-y-1">
                                {ctx.dan_checklist.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <span className={`text-sm ${item.checked ? 'text-green' : 'text-muted'}`}>{item.checked ? '☑' : '☐'}</span>
                                    <span className={`text-sm ${item.checked ? 'line-through text-muted' : ''}`}>{item.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Overview */}
                          {ctx.overview && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Overview</p>
                              <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: ctx.overview }} />
                            </div>
                          )}

                          {!ctx.current_status && !ctx.action_items && !ctx.update_to_dan && !ctx.dan_feedback && !ctx.dan_comments && !ctx.overview && !ctx.links && (
                            <p className="text-xs text-muted italic">No additional context on this task.</p>
                          )}
                        </div>
                      )}
                      {isExpanded && !ctx && entry.target_id && (
                        <div className="ml-4 mt-2 mb-2 border-l-4 border-black/10 bg-white px-5 py-3">
                          <p className="text-xs text-muted italic">Loading task context...</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
