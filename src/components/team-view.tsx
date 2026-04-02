'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import type { EventTask, TaskStatus } from '@/lib/types'

interface MasterTaskReview {
  id: string
  title: string
  status: string
  assignee: string | null
  priority: string
  links: string | null
  current_status: string | null
  overview: string | null
  action_items: string | null
  dan_comments: string | null
  update_to_dan: string | null
  dan_feedback: string | null
  deadline: string | null
}

interface TeamMember {
  name: string
  ultraHighTasks: string[]
  highTasks: string[]
  totalActive: number
}

const teamMembers = ['Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

export function TeamView() {
  const { displayName } = useUser()
  const [reviewTasks, setReviewTasks] = useState<MasterTaskReview[]>([])
  const [reviewEventTasks, setReviewEventTasks] = useState<(EventTask & { event_title: string })[]>([])
  const [teamData, setTeamData] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [updateText, setUpdateText] = useState('')
  const [feedbackText, setFeedbackText] = useState('')

  useEffect(() => {
    async function fetch() {
      // Fetch master tasks in review
      const { data: mt } = await supabase.from('master_tasks')
        .select('id, title, status, assignee, priority, links, current_status, overview, action_items, dan_comments, update_to_dan, dan_feedback, deadline')
        .eq('status', 'review')
      if (mt) setReviewTasks(mt as MasterTaskReview[])

      // Fetch event tasks in review
      const { data: et } = await supabase.from('event_tasks').select('*').eq('status', 'review')
      if (et && (et as EventTask[]).length > 0) {
        const eventIds = [...new Set((et as EventTask[]).map(t => t.event_id).filter(Boolean))]
        const { data: events } = await supabase.from('events').select('id, title').in('id', eventIds as string[])
        const eventMap: Record<string, string> = {}
        if (events) for (const e of events as { id: string; title: string }[]) eventMap[e.id] = e.title
        setReviewEventTasks((et as EventTask[]).map(t => ({ ...t, event_title: eventMap[t.event_id] || 'General' })))
      }

      // Build team data — who's working on what
      const { data: allMaster } = await supabase.from('master_tasks')
        .select('title, assignee, priority, status')
        .neq('status', 'complete')
      const { data: allEvent } = await supabase.from('event_tasks')
        .select('title, assignee, priority, status')
        .neq('status', 'complete')
        .not('assignee', 'is', null)

      const memberMap: Record<string, TeamMember> = {}
      for (const name of teamMembers) {
        memberMap[name] = { name, ultraHighTasks: [], highTasks: [], totalActive: 0 }
      }

      if (allMaster) {
        for (const t of allMaster as { title: string; assignee: string | null; priority: string; status: string }[]) {
          if (!t.assignee) continue
          for (const name of t.assignee.split(', ')) {
            if (memberMap[name]) {
              memberMap[name].totalActive++
              if (t.priority === 'ultra-high') memberMap[name].ultraHighTasks.push(t.title)
              if (t.priority === 'high') memberMap[name].highTasks.push(t.title)
            }
          }
        }
      }
      if (allEvent) {
        for (const t of allEvent as { title: string; assignee: string | null; priority?: string; status: string }[]) {
          if (!t.assignee || !memberMap[t.assignee]) continue
          memberMap[t.assignee].totalActive++
        }
      }

      setTeamData(Object.values(memberMap).filter(m => m.totalActive > 0).sort((a, b) => b.totalActive - a.totalActive))
      setLoading(false)
    }
    fetch()
  }, [])

  const handleSaveUpdate = async (taskId: string) => {
    await supabase.from('master_tasks').update({ update_to_dan: updateText, updated_at: new Date().toISOString() } as never).eq('id', taskId)
  }

  const handleDanRespond = async (taskId: string, action: 'approve' | 'revise') => {
    const newStatus = action === 'approve' ? 'complete' : 'in-progress'
    await supabase.from('master_tasks').update({
      status: newStatus,
      dan_feedback: feedbackText.trim() || null,
      update_to_dan: null,
      updated_at: new Date().toISOString(),
    } as never).eq('id', taskId)
    setReviewTasks((prev) => prev.filter((t) => t.id !== taskId))
    setFeedbackText('')
    setExpandedTask(null)
  }

  const handleEventTaskAction = async (taskId: string, action: 'approve' | 'revise') => {
    const newStatus = action === 'approve' ? 'complete' : 'in-progress'
    await supabase.from('event_tasks').update({ status: newStatus } as never).eq('id', taskId)
    setReviewEventTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const totalReview = reviewTasks.length + reviewEventTasks.length

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading...</p></div>
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex gap-6 items-start">
        {/* Left panel — Team */}
        <div className="w-64 shrink-0">
          <div className="bg-blue text-white px-4 py-3">
            <h2 className="text-xs font-bold tracking-widest uppercase">Team</h2>
          </div>
          <div className="border-l-2 border-r-2 border-b-2 border-black/10">
            {teamData.map((member) => {
              const isExpanded = expandedMember === member.name
              return (
                <div key={member.name} className="border-b border-black/5 last:border-0">
                  <button
                    onClick={() => setExpandedMember(isExpanded ? null : member.name)}
                    className="w-full text-left px-4 py-3 hover:bg-cream-dark transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{member.name}</span>
                      <span className="text-[10px] font-bold text-muted">{member.totalActive}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2">
                      {member.ultraHighTasks.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-red mb-1">Ultra-High</p>
                          {member.ultraHighTasks.map((t, i) => (
                            <p key={i} className="text-[10px] font-bold text-red pl-2 truncate">&mdash; {t}</p>
                          ))}
                        </div>
                      )}
                      {member.highTasks.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-orange mb-1">High</p>
                          {member.highTasks.map((t, i) => (
                            <p key={i} className="text-[10px] font-bold text-orange pl-2 truncate">&mdash; {t}</p>
                          ))}
                        </div>
                      )}
                      {member.ultraHighTasks.length === 0 && member.highTasks.length === 0 && (
                        <p className="text-[10px] text-muted italic">No ultra-high or high priority tasks</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {teamData.length === 0 && (
              <p className="px-4 py-3 text-xs text-muted">No active assignments</p>
            )}
          </div>
        </div>

        {/* Main panel — Dan's Dashboard */}
        <div className="flex-1 min-w-0">
          <div className="bg-red text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest uppercase">Dan&apos;s Dashboard</h2>
            <span className="text-xs font-bold tracking-wider opacity-70">
              {totalReview} ITEM{totalReview !== 1 ? 'S' : ''} FOR REVIEW
            </span>
          </div>

          {totalReview === 0 ? (
            <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-6 py-16 text-center">
              <p className="text-sm font-bold text-muted mb-1">All clear</p>
              <p className="text-xs text-muted">No items awaiting review right now.</p>
            </div>
          ) : (
            <div className="border-l-2 border-r-2 border-b-2 border-black/10">
              {/* Master tasks in review */}
              {reviewTasks.map((task, i) => {
                const isExpanded = expandedTask === task.id

                return (
                  <div key={task.id} className={i > 0 ? 'border-t-2 border-black/10' : ''}>
                    <button
                      onClick={() => { setExpandedTask(isExpanded ? null : task.id); setUpdateText(task.update_to_dan || ''); setFeedbackText('') }}
                      className="w-full text-left px-6 py-5 hover:bg-cream-dark transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold">{task.title}</h3>
                          <div className="flex items-center gap-3 mt-1.5">
                            {task.assignee && <span className="text-xs font-bold text-blue uppercase tracking-wider">{task.assignee}</span>}
                            <span className={`text-xs font-bold uppercase tracking-wider ${task.priority === 'ultra-high' ? 'text-red' : task.priority === 'high' ? 'text-orange' : 'text-muted'}`}>{task.priority}</span>
                            {task.deadline && <span className="text-xs font-bold text-red">Due {new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue bg-blue/10 px-3 py-1.5 shrink-0">
                          {isExpanded ? 'COLLAPSE' : 'REVIEW'}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6 bg-white border-t border-black/5">
                        {/* Team member's update */}
                        <div className="pt-5 mb-5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
                            Update from {task.assignee || 'Team'}
                          </p>
                          <textarea
                            value={updateText}
                            onChange={(e) => setUpdateText(e.target.value)}
                            onBlur={() => handleSaveUpdate(task.id)}
                            placeholder={"Dan,\n\nHere's the update on this task...\n\nNext Steps:\n- ...\n- ...\n\n— " + (task.assignee || 'Team')}
                            rows={10}
                            className="w-full border-2 border-black/20 bg-white px-5 py-4 text-sm text-black leading-relaxed focus:outline-none focus:border-blue placeholder:text-muted/30"
                          />
                        </div>

                        {/* Links */}
                        {task.links && (
                          <div className="mb-5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Attachments</p>
                            <div className="space-y-1.5">
                              {task.links.split('\n').filter(Boolean).map((link, li) => (
                                <a key={li} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} target="_blank" rel="noopener noreferrer"
                                  className="text-sm text-blue hover:text-red underline block">
                                  {link.trim()}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Context */}
                        {(task.current_status || task.overview || task.action_items) && (
                          <details className="mb-5">
                            <summary className="text-[10px] font-bold uppercase tracking-widest text-muted cursor-pointer hover:text-black">Show Task Context</summary>
                            <div className="mt-3 pl-4 border-l-2 border-black/10 space-y-3">
                              {task.current_status && <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-0.5">Current Status</p><p className="text-sm">{task.current_status}</p></div>}
                              {task.overview && <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-0.5">Overview</p><p className="text-sm">{task.overview}</p></div>}
                              {task.action_items && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-0.5">Action Items</p>
                                  <ul className="space-y-1">{task.action_items.split('\n').map((item, idx) => <li key={idx} className="text-sm">&mdash; {item}</li>)}</ul>
                                </div>
                              )}
                            </div>
                          </details>
                        )}

                        {/* Dan's previous feedback */}
                        {task.dan_feedback && (
                          <div className="mb-5 border-l-4 border-red pl-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red mb-1">Previous Feedback</p>
                            <p className="text-sm">{task.dan_feedback}</p>
                          </div>
                        )}

                        {task.dan_comments && (
                          <div className="mb-5 border-l-4 border-muted/30 pl-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Original Comments</p>
                            <p className="text-sm italic text-muted">{task.dan_comments}</p>
                          </div>
                        )}

                        {/* Dan's feedback input */}
                        <div className="border-t-2 border-black/10 pt-5">
                          <p className="text-xs font-bold uppercase tracking-widest text-red mb-2">Dan&apos;s Feedback</p>
                          <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Leave feedback, direction, or next steps..."
                            rows={5}
                            className="w-full border-2 border-red/30 bg-white px-5 py-4 text-sm text-black leading-relaxed focus:outline-none focus:border-red placeholder:text-muted/30 mb-4"
                          />
                          <div className="flex gap-3">
                            <button onClick={() => handleDanRespond(task.id, 'approve')}
                              className="bg-green text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-green-light transition-colors">
                              Approve &amp; Complete
                            </button>
                            <button onClick={() => handleDanRespond(task.id, 'revise')}
                              className="bg-orange text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-red transition-colors">
                              Send Back with Feedback
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Event tasks in review */}
              {reviewEventTasks.map((task) => (
                <div key={task.id} className="border-t-2 border-black/10 px-6 py-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-bold">{task.event_title} &mdash; {task.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {task.assignee && <span className="text-xs font-bold text-blue uppercase tracking-wider">{task.assignee}</span>}
                      <span className="text-xs text-muted uppercase tracking-wider">{task.category}</span>
                      {task.event_id && <a href={`/events/${task.event_id}`} className="text-xs font-bold text-blue uppercase tracking-widest hover:text-red">View Event &rarr;</a>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEventTaskAction(task.id, 'approve')}
                      className="text-xs font-bold uppercase tracking-widest text-green bg-green/10 px-3 py-2 hover:bg-green/20 transition-colors">
                      Done
                    </button>
                    <button onClick={() => handleEventTaskAction(task.id, 'revise')}
                      className="text-xs font-bold uppercase tracking-widest text-orange bg-orange/10 px-3 py-2 hover:bg-orange/20 transition-colors">
                      Revise
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
