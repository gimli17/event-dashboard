'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import type { EventTask } from '@/lib/types'

interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

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
  dan_checklist: ChecklistItem[]
  deadline: string | null
}

interface TeamMember {
  name: string
  ultraHighTasks: { title: string; id: string }[]
  highTasks: { title: string; id: string }[]
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
  const [newCheckItem, setNewCheckItem] = useState('')
  const [editingCheckItem, setEditingCheckItem] = useState<string | null>(null)
  const [editCheckText, setEditCheckText] = useState('')

  useEffect(() => {
    async function fetch() {
      const { data: mt } = await supabase.from('master_tasks')
        .select('id, title, status, assignee, priority, links, current_status, overview, action_items, dan_comments, update_to_dan, dan_feedback, dan_checklist, deadline')
        .eq('status', 'review')
      if (mt) setReviewTasks(mt as MasterTaskReview[])

      const { data: et } = await supabase.from('event_tasks').select('*').eq('status', 'review')
      if (et && (et as EventTask[]).length > 0) {
        const eventIds = [...new Set((et as EventTask[]).map(t => t.event_id).filter(Boolean))]
        const { data: events } = await supabase.from('events').select('id, title').in('id', eventIds as string[])
        const eventMap: Record<string, string> = {}
        if (events) for (const e of events as { id: string; title: string }[]) eventMap[e.id] = e.title
        setReviewEventTasks((et as EventTask[]).map(t => ({ ...t, event_title: eventMap[t.event_id] || 'General' })))
      }

      const { data: allMaster } = await supabase.from('master_tasks')
        .select('id, title, assignee, priority, status')
        .neq('status', 'complete')
      const { data: allEvent } = await supabase.from('event_tasks')
        .select('id, title, assignee, priority, status')
        .neq('status', 'complete')
        .not('assignee', 'is', null)

      const memberMap: Record<string, TeamMember> = {}
      for (const name of teamMembers) {
        memberMap[name] = { name, ultraHighTasks: [], highTasks: [], totalActive: 0 }
      }

      if (allMaster) {
        for (const t of allMaster as { id: string; title: string; assignee: string | null; priority: string; status: string }[]) {
          if (!t.assignee) continue
          for (const name of t.assignee.split(', ')) {
            if (memberMap[name]) {
              memberMap[name].totalActive++
              if (t.priority === 'ultra-high') memberMap[name].ultraHighTasks.push({ title: t.title, id: t.id })
              if (t.priority === 'high') memberMap[name].highTasks.push({ title: t.title, id: t.id })
            }
          }
        }
      }
      if (allEvent) {
        for (const t of allEvent as { id: string; title: string; assignee: string | null; priority?: string; status: string }[]) {
          if (!t.assignee || !memberMap[t.assignee]) continue
          memberMap[t.assignee].totalActive++
        }
      }

      setTeamData(Object.values(memberMap))
      setLoading(false)
    }
    fetch()
  }, [])

  const handleAddCheckItem = async (taskId: string) => {
    if (!newCheckItem.trim()) return
    const task = reviewTasks.find((t) => t.id === taskId)
    if (!task) return
    const checklist = [...(task.dan_checklist || []), { id: `ci-${Date.now()}`, text: newCheckItem.trim(), checked: false }]
    setReviewTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dan_checklist: checklist } : t)))
    setNewCheckItem('')
    await supabase.from('master_tasks').update({ dan_checklist: checklist } as never).eq('id', taskId)
  }

  const handleToggleCheckItem = async (taskId: string, itemId: string) => {
    const task = reviewTasks.find((t) => t.id === taskId)
    if (!task) return
    const checklist = (task.dan_checklist || []).map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )
    setReviewTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dan_checklist: checklist } : t)))
    await supabase.from('master_tasks').update({ dan_checklist: checklist } as never).eq('id', taskId)
  }

  const handleDeleteCheckItem = async (taskId: string, itemId: string) => {
    const task = reviewTasks.find((t) => t.id === taskId)
    if (!task) return
    const checklist = (task.dan_checklist || []).filter((item) => item.id !== itemId)
    setReviewTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dan_checklist: checklist } : t)))
    await supabase.from('master_tasks').update({ dan_checklist: checklist } as never).eq('id', taskId)
  }

  const handleEditCheckItem = async (taskId: string, itemId: string) => {
    if (!editCheckText.trim()) { setEditingCheckItem(null); return }
    const task = reviewTasks.find((t) => t.id === taskId)
    if (!task) return
    const checklist = (task.dan_checklist || []).map((item) =>
      item.id === itemId ? { ...item, text: editCheckText.trim() } : item
    )
    setReviewTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dan_checklist: checklist } : t)))
    setEditingCheckItem(null)
    await supabase.from('master_tasks').update({ dan_checklist: checklist } as never).eq('id', taskId)
  }

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
    return <div className="max-w-7xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-sm font-bold">Loading...</p></div>
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex gap-8 items-start">
        {/* Left panel — Team */}
        <div className="w-72 shrink-0">
          <div className="bg-purple text-white px-5 py-4">
            <h2 className="text-sm font-bold tracking-widest uppercase">Team</h2>
          </div>
          <div className="border-l-2 border-r-2 border-b-2 border-black/10">
            {teamMembers.map((name) => {
              const member = teamData.find((m) => m.name === name)
              const isExpanded = expandedMember === name
              const count = member?.totalActive || 0

              return (
                <div key={name}>
                  <div
                    onClick={() => setExpandedMember(isExpanded ? null : name)}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-cream-dark transition-colors border-b border-black/5"
                  >
                    <span className={`text-sm font-bold ${count > 0 ? '' : 'text-muted/40'}`}>{name}</span>
                    {count > 0 && <span className="text-xs font-bold text-purple bg-purple-light/20 px-2 py-0.5">{count}</span>}
                  </div>
                  {isExpanded && member && (
                    <div className="px-5 py-4 bg-cream-dark border-b border-black/5 space-y-3">
                      {member.ultraHighTasks.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-red mb-2">Ultra-High</p>
                          {member.ultraHighTasks.map((t) => (
                            <a key={t.id} href="/tasks" className="text-xs font-bold text-red hover:underline block py-0.5 pl-2">&mdash; {t.title}</a>
                          ))}
                        </div>
                      )}
                      {member.highTasks.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-orange mb-2">High</p>
                          {member.highTasks.map((t) => (
                            <a key={t.id} href="/tasks" className="text-xs font-bold text-orange hover:underline block py-0.5 pl-2">&mdash; {t.title}</a>
                          ))}
                        </div>
                      )}
                      {member.ultraHighTasks.length === 0 && member.highTasks.length === 0 && (
                        <p className="text-xs text-muted italic">No ultra-high or high priority tasks</p>
                      )}
                    </div>
                  )}
                  {isExpanded && !member && (
                    <div className="px-5 py-4 bg-cream-dark border-b border-black/5">
                      <p className="text-xs text-muted italic">No tasks assigned</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Main panel — Dan's Dashboard */}
        <div className="flex-1 min-w-0">
          <div className="bg-purple text-white px-6 py-5 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-widest uppercase">Dan&apos;s Dashboard</h2>
            <span className="text-sm font-bold tracking-wider opacity-70">
              {totalReview} item{totalReview !== 1 ? 's' : ''} for review
            </span>
          </div>

          {totalReview === 0 ? (
            <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-8 py-20 text-center">
              <p className="text-lg font-bold text-muted mb-2">All clear</p>
              <p className="text-sm text-muted">No items awaiting review right now.</p>
            </div>
          ) : (
            <div className="border-l-2 border-r-2 border-b-2 border-black/10">
              {reviewTasks.map((task, i) => {
                const isExpanded = expandedTask === task.id

                return (
                  <div key={task.id} className={i > 0 ? 'border-t-2 border-black/10' : ''}>
                    <button
                      onClick={() => { setExpandedTask(isExpanded ? null : task.id); setUpdateText(task.update_to_dan || ''); setFeedbackText('') }}
                      className="w-full text-left px-8 py-6 hover:bg-cream-dark transition-colors"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <h3 className="text-lg font-bold">{task.title}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            {task.assignee && <span className="text-sm font-bold text-purple">{task.assignee}</span>}
                            <span className={`text-sm font-bold ${task.priority === 'ultra-high' ? 'text-red' : task.priority === 'high' ? 'text-orange' : 'text-muted'}`}>{task.priority}</span>
                            {task.deadline && <span className="text-sm font-bold text-red">Due {new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                          </div>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-widest shrink-0 px-4 py-2 ${isExpanded ? 'bg-purple text-white' : 'text-purple bg-purple-light/20'}`}>
                          {isExpanded ? 'VIEWING' : 'REVIEW'}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-8 pb-8 bg-white border-t border-black/5">
                        {/* Team member's update */}
                        <div className="pt-6 mb-6">
                          <p className="text-sm font-bold uppercase tracking-widest text-purple mb-3">
                            Update from {task.assignee || 'Team'}
                          </p>
                          <textarea
                            value={updateText}
                            onChange={(e) => setUpdateText(e.target.value)}
                            onBlur={() => handleSaveUpdate(task.id)}
                            placeholder={"Dan,\n\nHere's the update on this task...\n\nNext Steps:\n- ...\n- ...\n\n— " + (task.assignee || 'Team')}
                            rows={12}
                            className="w-full border-2 border-black/20 bg-white px-6 py-5 text-base text-black leading-relaxed focus:outline-none focus:border-purple placeholder:text-muted/30"
                          />
                        </div>

                        {/* Dan Advise — Checklist */}
                        <div className="mb-6">
                          <p className="text-sm font-bold uppercase tracking-widest text-purple mb-3">Dan Advise</p>
                          {(task.dan_checklist || []).length > 0 && (
                            <div className="space-y-2 mb-3">
                              {(task.dan_checklist || []).map((item) => (
                                <div key={item.id} className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={item.checked}
                                    onChange={() => handleToggleCheckItem(task.id, item.id)}
                                    className="mt-1 w-5 h-5 border-2 border-purple-light/50 accent-purple cursor-pointer shrink-0"
                                  />
                                  {editingCheckItem === item.id ? (
                                    <input
                                      type="text"
                                      value={editCheckText}
                                      onChange={(e) => setEditCheckText(e.target.value)}
                                      onBlur={() => handleEditCheckItem(task.id, item.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleEditCheckItem(task.id, item.id)
                                        if (e.key === 'Escape') setEditingCheckItem(null)
                                      }}
                                      autoFocus
                                      className="flex-1 border-2 border-purple bg-white px-3 py-1 text-base text-black focus:outline-none"
                                    />
                                  ) : (
                                    <span
                                      onClick={() => { setEditingCheckItem(item.id); setEditCheckText(item.text) }}
                                      className={`text-base leading-relaxed flex-1 cursor-pointer hover:text-purple transition-colors ${item.checked ? 'line-through text-muted' : ''}`}
                                      title="Click to edit"
                                    >
                                      {item.text}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleDeleteCheckItem(task.id, item.id)}
                                    className="text-muted/40 hover:text-red transition-colors text-xl font-bold shrink-0 w-8 h-8 flex items-center justify-center"
                                    title="Delete"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newCheckItem}
                              onChange={(e) => setNewCheckItem(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCheckItem(task.id) }}
                              placeholder="Add a checkbox item for Dan..."
                              className="flex-1 border-2 border-purple-light/40 bg-white px-4 py-2.5 text-sm text-black focus:outline-none focus:border-purple placeholder:text-muted/30"
                            />
                            <button
                              onClick={() => handleAddCheckItem(task.id)}
                              disabled={!newCheckItem.trim()}
                              className="bg-purple text-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-purple-light transition-colors disabled:opacity-40"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Links */}
                        {task.links && (
                          <div className="mb-6">
                            <p className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Attachments</p>
                            <div className="space-y-2">
                              {task.links.split('\n').filter(Boolean).map((link, li) => (
                                <a key={li} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} target="_blank" rel="noopener noreferrer"
                                  className="text-base text-blue hover:text-red underline block">
                                  {link.trim()}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Context */}
                        {(task.current_status || task.overview || task.action_items) && (
                          <details className="mb-6">
                            <summary className="text-sm font-bold uppercase tracking-widest text-muted cursor-pointer hover:text-black">Show Task Context</summary>
                            <div className="mt-4 pl-5 border-l-2 border-black/10 space-y-4">
                              {task.current_status && <div><p className="text-xs font-bold uppercase tracking-widest text-muted mb-1">Current Status</p><p className="text-base">{task.current_status}</p></div>}
                              {task.overview && <div><p className="text-xs font-bold uppercase tracking-widest text-muted mb-1">Overview</p><p className="text-base">{task.overview}</p></div>}
                              {task.action_items && (
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-widest text-muted mb-1">Action Items</p>
                                  <ul className="space-y-1">{task.action_items.split('\n').map((item, idx) => <li key={idx} className="text-base">&mdash; {item}</li>)}</ul>
                                </div>
                              )}
                            </div>
                          </details>
                        )}

                        {/* Previous feedback */}
                        {task.dan_feedback && (
                          <div className="mb-6 border-l-4 border-purple pl-5">
                            <p className="text-sm font-bold uppercase tracking-widest text-purple mb-1">Previous Feedback</p>
                            <p className="text-base">{task.dan_feedback}</p>
                          </div>
                        )}

                        {task.dan_comments && (
                          <div className="mb-6 border-l-4 border-muted/30 pl-5">
                            <p className="text-sm font-bold uppercase tracking-widest text-muted mb-1">Original Comments</p>
                            <p className="text-base italic text-muted">{task.dan_comments}</p>
                          </div>
                        )}

                        {/* Dan's feedback input */}
                        <div className="border-t-2 border-purple-light/40 pt-6">
                          <p className="text-sm font-bold uppercase tracking-widest text-purple mb-3">Dan&apos;s Feedback</p>
                          <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Leave feedback, direction, or next steps..."
                            rows={6}
                            className="w-full border-2 border-purple-light/50 bg-white px-6 py-5 text-base text-black leading-relaxed focus:outline-none focus:border-purple placeholder:text-muted/30 mb-4"
                          />
                          <div className="flex gap-3">
                            <button onClick={() => handleDanRespond(task.id, 'approve')}
                              className="bg-green text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-green-light transition-colors">
                              Approve &amp; Complete
                            </button>
                            <button onClick={() => handleDanRespond(task.id, 'revise')}
                              className="bg-orange text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-red transition-colors">
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
                <div key={task.id} className="border-t-2 border-black/10 px-8 py-6 flex items-start justify-between gap-6">
                  <div>
                    <p className="text-lg font-bold">{task.event_title} &mdash; {task.title}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {task.assignee && <span className="text-sm font-bold text-purple">{task.assignee}</span>}
                      <span className="text-sm text-muted">{task.category}</span>
                      {task.event_id && <a href={`/events/${task.event_id}`} className="text-sm font-bold text-blue hover:text-red">View Event &rarr;</a>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEventTaskAction(task.id, 'approve')}
                      className="text-sm font-bold uppercase tracking-widest text-green bg-green/10 px-4 py-2.5 hover:bg-green/20 transition-colors">
                      Done
                    </button>
                    <button onClick={() => handleEventTaskAction(task.id, 'revise')}
                      className="text-sm font-bold uppercase tracking-widest text-orange bg-orange/10 px-4 py-2.5 hover:bg-orange/20 transition-colors">
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
