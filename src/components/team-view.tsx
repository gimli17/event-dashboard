'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import type { EventTask } from '@/lib/types'

interface ChecklistItem { id: string; text: string; checked: boolean }

interface MasterTaskFull {
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

const allTeamMembers = ['Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

const priorityLabels: Record<string, string> = { 'ultra-high': 'VERY HIGH', high: 'HIGH', medium: 'MEDIUM', backlog: 'BACKLOG' }
const priorityColors: Record<string, string> = { 'ultra-high': 'bg-red text-white', high: 'bg-orange text-white', medium: 'bg-gold text-white', backlog: 'bg-black/20 text-black' }

export function TeamView() {
  const { displayName } = useUser()
  const [allMasterTasks, setAllMasterTasks] = useState<MasterTaskFull[]>([])
  const [reviewEventTasks, setReviewEventTasks] = useState<(EventTask & { event_title: string })[]>([])
  const [teamData, setTeamData] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  // View state: null = Dan's dashboard, string = person's view
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [updateText, setUpdateText] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [newCheckItem, setNewCheckItem] = useState('')
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newPriority, setNewPriority] = useState('high')
  const [newDeadline, setNewDeadline] = useState('')
  const [editingCheckItem, setEditingCheckItem] = useState<string | null>(null)
  const [editCheckText, setEditCheckText] = useState('')

  useEffect(() => {
    async function fetch() {
      // Fetch ALL master tasks (not just review)
      const { data: mt } = await supabase.from('master_tasks')
        .select('id, title, status, assignee, priority, links, current_status, overview, action_items, dan_comments, update_to_dan, dan_feedback, dan_checklist, deadline')
        .neq('status', 'complete')
        .order('sort_order')
      if (mt) setAllMasterTasks(mt as MasterTaskFull[])

      // Event tasks in review
      const { data: et } = await supabase.from('event_tasks').select('*').eq('status', 'review')
      if (et && (et as EventTask[]).length > 0) {
        const eventIds = [...new Set((et as EventTask[]).map(t => t.event_id).filter(Boolean))]
        const { data: events } = await supabase.from('events').select('id, title').in('id', eventIds as string[])
        const eventMap: Record<string, string> = {}
        if (events) for (const e of events as { id: string; title: string }[]) eventMap[e.id] = e.title
        setReviewEventTasks((et as EventTask[]).map(t => ({ ...t, event_title: eventMap[t.event_id] || 'General' })))
      }

      // Build team data
      const memberMap: Record<string, TeamMember> = {}
      for (const name of allTeamMembers) memberMap[name] = { name, ultraHighTasks: [], highTasks: [], totalActive: 0 }
      if (mt) {
        for (const t of mt as MasterTaskFull[]) {
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
      setTeamData(Object.values(memberMap))
      setLoading(false)
    }
    fetch()
  }, [])

  // Handlers
  const handleCreateTask = async () => {
    if (!newTitle.trim()) return
    const taskId = `mt-${Date.now()}`
    const task: MasterTaskFull = {
      id: taskId,
      title: newTitle.trim(),
      assignee: newAssignee || null,
      priority: newPriority,
      status: 'not-started',
      deadline: newDeadline || null,
      links: null,
      current_status: null,
      overview: null,
      action_items: null,
      dan_comments: null,
      update_to_dan: null,
      dan_feedback: null,
      dan_checklist: [],
    }
    setAllMasterTasks((prev) => [task, ...prev])
    setShowNewTask(false)
    setNewTitle('')
    setNewAssignee('')
    setNewPriority('high')
    setNewDeadline('')

    await supabase.from('master_tasks').insert({
      ...task,
      sort_order: 0,
      event_id: null,
      week_of: null,
    } as never)
  }

  const handleSaveUpdate = async (taskId: string) => {
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, update_to_dan: updateText } : t)))
    await supabase.from('master_tasks').update({ update_to_dan: updateText, updated_at: new Date().toISOString() } as never).eq('id', taskId)
  }

  const handleSubmitForReview = async (taskId: string) => {
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'review' } : t)))
    await supabase.from('master_tasks').update({ status: 'review', updated_at: new Date().toISOString() } as never).eq('id', taskId)
    setExpandedTask(null)
  }

  const handleDanReassign = async (taskId: string, newAssignee: string | null) => {
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, assignee: newAssignee } : t)))
    await supabase.from('master_tasks').update({ assignee: newAssignee, updated_at: new Date().toISOString() } as never).eq('id', taskId)
  }

  const handleDanPriority = async (taskId: string, newPriority: string) => {
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t)))
    await supabase.from('master_tasks').update({ priority: newPriority, updated_at: new Date().toISOString() } as never).eq('id', taskId)
  }

  const handleDanRespond = async (taskId: string, action: 'approve' | 'revise') => {
    const newStatus = action === 'approve' ? 'complete' : 'in-progress'
    setAllMasterTasks((prev) => action === 'approve' ? prev.filter((t) => t.id !== taskId) : prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, dan_feedback: feedbackText.trim() || t.dan_feedback } : t)))
    await supabase.from('master_tasks').update({ status: newStatus, dan_feedback: feedbackText.trim() || null, update_to_dan: null, updated_at: new Date().toISOString() } as never).eq('id', taskId)
    setFeedbackText('')
    setExpandedTask(null)
  }

  const handleAddCheckItem = async (taskId: string) => {
    if (!newCheckItem.trim()) return
    const task = allMasterTasks.find((t) => t.id === taskId)
    if (!task) return
    const checklist = [...(task.dan_checklist || []), { id: `ci-${Date.now()}`, text: newCheckItem.trim(), checked: false }]
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dan_checklist: checklist } : t)))
    setNewCheckItem('')
    await supabase.from('master_tasks').update({ dan_checklist: checklist } as never).eq('id', taskId)
  }

  const handleToggleCheckItem = async (taskId: string, itemId: string) => {
    const task = allMasterTasks.find((t) => t.id === taskId)
    if (!task) return
    const checklist = (task.dan_checklist || []).map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item)
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dan_checklist: checklist } : t)))
    await supabase.from('master_tasks').update({ dan_checklist: checklist } as never).eq('id', taskId)
  }

  const handleDeleteCheckItem = async (taskId: string, itemId: string) => {
    const task = allMasterTasks.find((t) => t.id === taskId)
    if (!task) return
    const checklist = (task.dan_checklist || []).filter((item) => item.id !== itemId)
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dan_checklist: checklist } : t)))
    await supabase.from('master_tasks').update({ dan_checklist: checklist } as never).eq('id', taskId)
  }

  const handleEditCheckItem = async (taskId: string, itemId: string) => {
    if (!editCheckText.trim()) { setEditingCheckItem(null); return }
    const task = allMasterTasks.find((t) => t.id === taskId)
    if (!task) return
    const checklist = (task.dan_checklist || []).map((item) => item.id === itemId ? { ...item, text: editCheckText.trim() } : item)
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dan_checklist: checklist } : t)))
    setEditingCheckItem(null)
    await supabase.from('master_tasks').update({ dan_checklist: checklist } as never).eq('id', taskId)
  }

  // Derived data
  const reviewTasks = allMasterTasks.filter((t) => t.status === 'review')
  const totalReview = reviewTasks.length + reviewEventTasks.length
  const personTasks = selectedPerson
    ? allMasterTasks
        .filter((t) => t.assignee?.includes(selectedPerson))
        .sort((a, b) => {
          // Tasks with Dan's feedback come first
          const aFeedback = a.dan_feedback && a.status === 'in-progress' ? 1 : 0
          const bFeedback = b.dan_feedback && b.status === 'in-progress' ? 1 : 0
          if (aFeedback !== bFeedback) return bFeedback - aFeedback
          // Then tasks in review
          if (a.status === 'review' && b.status !== 'review') return -1
          if (a.status !== 'review' && b.status === 'review') return 1
          return 0
        })
    : []

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-sm font-bold">Loading...</p></div>
  }

  // Shared task detail renderer
  function renderTaskDetail(task: MasterTaskFull, isDanView: boolean) {
    return (
      <div className="px-8 pb-8 bg-white border-t border-black/5">
        {/* Update to Dan */}
        <div className="pt-6 mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-purple mb-3">
            {isDanView ? `Update from ${task.assignee || 'Team'}` : 'Your Update for Dan'}
          </p>
          <textarea
            value={expandedTask === task.id ? updateText : (task.update_to_dan || '')}
            onChange={(e) => setUpdateText(e.target.value)}
            onBlur={() => handleSaveUpdate(task.id)}
            placeholder={"Dan,\n\nHere's the update...\n\nNext Steps:\n- ...\n\n— " + (task.assignee || 'Team')}
            rows={10}
            className="w-full border-2 border-black/20 bg-white px-6 py-5 text-base text-black leading-relaxed focus:outline-none focus:border-purple placeholder:text-muted/30"
          />
        </div>

        {/* Dan Advise Checklist */}
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-purple mb-3">Dan Advise</p>
          {(task.dan_checklist || []).length > 0 && (
            <div className="space-y-2 mb-3">
              {(task.dan_checklist || []).map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <input type="checkbox" checked={item.checked} onChange={() => handleToggleCheckItem(task.id, item.id)}
                    className="mt-1 w-5 h-5 border-2 border-purple-light/50 accent-purple cursor-pointer shrink-0" />
                  {editingCheckItem === item.id ? (
                    <input type="text" value={editCheckText} onChange={(e) => setEditCheckText(e.target.value)}
                      onBlur={() => handleEditCheckItem(task.id, item.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEditCheckItem(task.id, item.id); if (e.key === 'Escape') setEditingCheckItem(null) }}
                      autoFocus className="flex-1 border-2 border-purple bg-white px-3 py-1 text-base text-black focus:outline-none" />
                  ) : (
                    <span onClick={() => { setEditingCheckItem(item.id); setEditCheckText(item.text) }}
                      className={`text-base leading-relaxed flex-1 cursor-pointer hover:text-purple transition-colors ${item.checked ? 'line-through text-muted' : ''}`}>
                      {item.text}
                    </span>
                  )}
                  <button onClick={() => handleDeleteCheckItem(task.id, item.id)}
                    className="text-muted/40 hover:text-red transition-colors text-xl font-bold shrink-0 w-8 h-8 flex items-center justify-center">&times;</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCheckItem(task.id) }}
              placeholder="Add a checkbox item for Dan..."
              className="flex-1 border-2 border-purple-light/40 bg-white px-4 py-2.5 text-sm text-black focus:outline-none focus:border-purple placeholder:text-muted/30" />
            <button onClick={() => handleAddCheckItem(task.id)} disabled={!newCheckItem.trim()}
              className="bg-purple text-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-purple-light transition-colors disabled:opacity-40">Add</button>
          </div>
        </div>

        {/* Links */}
        {task.links && (
          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Attachments</p>
            <div className="space-y-2">
              {task.links.split('\n').filter(Boolean).map((link, li) => (
                <a key={li} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} target="_blank" rel="noopener noreferrer"
                  className="text-base text-blue hover:text-red underline block">{link.trim()}</a>
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
              {task.action_items && <div><p className="text-xs font-bold uppercase tracking-widest text-muted mb-1">Action Items</p><ul className="space-y-1">{task.action_items.split('\n').map((item, idx) => <li key={idx} className="text-base">&mdash; {item}</li>)}</ul></div>}
            </div>
          </details>
        )}

        {/* Dan's previous feedback */}
        {task.dan_feedback && (
          <div className="mb-6 border-l-4 border-red pl-5">
            <p className="text-sm font-bold uppercase tracking-widest text-red mb-1">Dan&apos;s Feedback</p>
            <p className="text-base whitespace-pre-wrap">{task.dan_feedback}</p>
          </div>
        )}

        {task.dan_comments && (
          <div className="mb-6 border-l-4 border-muted/30 pl-5">
            <p className="text-sm font-bold uppercase tracking-widest text-muted mb-1">Original Comments</p>
            <p className="text-base italic text-muted">{task.dan_comments}</p>
          </div>
        )}

        {/* Actions — different for Dan vs team member */}
        {isDanView ? (
          <>
            <div className="flex items-center gap-6 mb-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-widest text-muted">Assign:</span>
                <select value={task.assignee || ''} onChange={(e) => handleDanReassign(task.id, e.target.value || null)}
                  className="border-2 border-black/20 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:border-purple cursor-pointer">
                  <option value="">Unassigned</option>
                  {allTeamMembers.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-widest text-muted">Priority:</span>
                {['ultra-high', 'high', 'medium', 'backlog'].map((p) => (
                  <button key={p} onClick={() => handleDanPriority(task.id, p)}
                    className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-all ${task.priority === p ? priorityColors[p] : 'bg-black/5 text-muted/40 hover:text-muted'}`}>
                    {p === 'ultra-high' ? 'VERY' : p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t-2 border-purple-light/40 pt-6">
              <p className="text-sm font-bold uppercase tracking-widest text-purple mb-3">Dan&apos;s Feedback</p>
              <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Leave feedback, direction, or next steps..."
                rows={6} className="w-full border-2 border-purple-light/50 bg-white px-6 py-5 text-base text-black leading-relaxed focus:outline-none focus:border-purple placeholder:text-muted/30 mb-4" />
              <div className="flex gap-3">
                <button onClick={() => handleDanRespond(task.id, 'approve')} className="bg-green text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-green-light transition-colors">Approve &amp; Complete</button>
                <button onClick={() => handleDanRespond(task.id, 'revise')} className="bg-orange text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-red transition-colors">Send Back with Feedback</button>
              </div>
            </div>
          </>
        ) : (
          <div className="border-t-2 border-purple-light/40 pt-6">
            <div className="flex gap-3">
              <button onClick={() => handleSubmitForReview(task.id)}
                className="bg-purple text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-purple-light transition-colors">
                Submit for Dan&apos;s Review
              </button>
              <button onClick={async () => {
                await supabase.from('master_tasks').update({ status: 'complete', updated_at: new Date().toISOString() } as never).eq('id', task.id)
                setAllMasterTasks((prev) => prev.filter((t) => t.id !== task.id))
                setExpandedTask(null)
              }}
                className="bg-green text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-green-light transition-colors">
                Mark as Done
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex gap-8 items-start">
        {/* Left panel — Team */}
        <div className="w-72 shrink-0">
          {/* Dan's Dashboard button */}
          <div
            onClick={() => { setSelectedPerson(null); setExpandedTask(null) }}
            className={`px-5 py-4 cursor-pointer transition-colors flex items-center justify-between ${selectedPerson === null ? 'bg-purple text-white' : 'bg-purple/10 text-purple hover:bg-purple/20'}`}
          >
            <span className="text-sm font-bold tracking-widest uppercase">Dan&apos;s Dashboard</span>
            {totalReview > 0 && (
              <span className="bg-red text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center">{totalReview}</span>
            )}
          </div>

          <div className="border-l-2 border-r-2 border-b-2 border-black/10">
            {allTeamMembers.map((name) => {
              const member = teamData.find((m) => m.name === name)
              const isSelected = selectedPerson === name
              const isExpanded = expandedMember === name && !isSelected
              const count = member?.totalActive || 0
              const hasFeedback = allMasterTasks.some((t) => t.assignee?.includes(name) && t.dan_feedback && t.status === 'in-progress')

              return (
                <div key={name}>
                  <div
                    onClick={() => {
                      if (isSelected) { setSelectedPerson(null) }
                      else { setSelectedPerson(name); setExpandedTask(null); setExpandedMember(null) }
                    }}
                    className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors border-b border-black/5 ${isSelected ? 'bg-purple/10' : 'hover:bg-cream-dark'}`}
                  >
                    <span className={`text-sm font-bold ${isSelected ? 'text-purple' : count > 0 ? '' : 'text-muted/40'}`}>{name}</span>
                    <div className="flex items-center gap-2">
                      {hasFeedback && <span className="w-2.5 h-2.5 rounded-full bg-red animate-pulse" title="Has feedback from Dan" />}
                      {count > 0 && <span className="text-xs font-bold text-purple bg-purple-light/20 px-2 py-0.5">{count}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 min-w-0">
          {selectedPerson === null ? (
            <>
              {/* Dan's Dashboard */}
              <div className="bg-purple text-white px-6 py-5 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-widest uppercase">Dan&apos;s Dashboard</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tracking-wider opacity-70">{totalReview} for review</span>
                  <button onClick={() => setShowNewTask(!showNewTask)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${showNewTask ? 'bg-white text-purple' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                    {showNewTask ? 'Cancel' : '+ New Task'}
                  </button>
                </div>
              </div>

              {/* New task form */}
              {showNewTask && (
                <div className="border-l-2 border-r-2 border-b-2 border-purple/20 bg-white px-6 py-5 space-y-3">
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newTitle.trim()) handleCreateTask() }}
                    placeholder="WHAT NEEDS TO BE DONE..."
                    autoFocus
                    className="w-full border-2 border-black bg-white px-4 py-3 text-sm font-bold text-black placeholder:text-muted/40 focus:outline-none focus:border-purple" />
                  <div className="flex gap-3 flex-wrap">
                    <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}
                      className="border-2 border-black/20 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-black">
                      <option value="">Unassigned</option>
                      {allTeamMembers.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}
                      className="border-2 border-black/20 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-black">
                      <option value="ultra-high">Very High</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="backlog">Backlog</option>
                    </select>
                    <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)}
                      className="border-2 border-black/20 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer" />
                    <button onClick={handleCreateTask} disabled={!newTitle.trim()}
                      className="bg-purple text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-purple-light transition-colors disabled:opacity-40">
                      Create &amp; Assign
                    </button>
                  </div>
                </div>
              )}

              {totalReview === 0 && !showNewTask ? (
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
                        <button onClick={() => { setExpandedTask(isExpanded ? null : task.id); setUpdateText(task.update_to_dan || ''); setFeedbackText(''); setNewCheckItem('') }}
                          className="w-full text-left px-8 py-6 hover:bg-cream-dark transition-colors">
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
                        {isExpanded && renderTaskDetail(task, true)}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Person's view */}
              <div className="bg-blue text-white px-6 py-5 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-widest uppercase">{selectedPerson}&apos;s Tasks</h2>
                <span className="text-sm font-bold tracking-wider opacity-70">{personTasks.length} task{personTasks.length !== 1 ? 's' : ''}</span>
              </div>

              {personTasks.length === 0 ? (
                <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-8 py-20 text-center">
                  <p className="text-lg font-bold text-muted mb-2">No tasks</p>
                  <p className="text-sm text-muted">No active tasks assigned to {selectedPerson}.</p>
                </div>
              ) : (
                <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                  {personTasks.map((task, i) => {
                    const isExpanded = expandedTask === task.id
                    const hasDanFeedback = task.dan_feedback && task.status === 'in-progress'
                    return (
                      <div key={task.id} className={i > 0 ? 'border-t-2 border-black/10' : ''}>
                        <button onClick={() => { setExpandedTask(isExpanded ? null : task.id); setUpdateText(task.update_to_dan || ''); setNewCheckItem('') }}
                          className="w-full text-left px-8 py-6 hover:bg-cream-dark transition-colors">
                          <div className="flex items-start justify-between gap-6">
                            <div>
                              <h3 className="text-lg font-bold">{task.title}</h3>
                              <div className="flex items-center gap-4 mt-2">
                                <span className={`text-sm font-bold uppercase tracking-wider ${task.priority === 'ultra-high' ? 'text-red' : task.priority === 'high' ? 'text-orange' : 'text-muted'}`}>{priorityLabels[task.priority] || task.priority}</span>
                                {task.deadline && <span className="text-sm font-bold text-red">Due {new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                                {task.status === 'review' && <span className="text-sm font-bold text-purple">Awaiting Dan&apos;s Review</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {hasDanFeedback && <span className="w-3 h-3 rounded-full bg-red animate-pulse" title="Dan sent feedback" />}
                              <span className={`text-xs font-bold uppercase tracking-widest px-4 py-2 ${
                                task.status === 'review' ? 'bg-purple text-white' :
                                hasDanFeedback ? 'bg-red/10 text-red' :
                                'bg-black/5 text-muted'
                              }`}>
                                {task.status === 'review' ? 'IN REVIEW' : hasDanFeedback ? 'FEEDBACK' : task.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </button>
                        {isExpanded && renderTaskDetail(task, false)}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
