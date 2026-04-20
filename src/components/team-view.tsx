'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'
import type { EventTask } from '@/lib/types'
import { logActivity } from '@/lib/activity-log'
import Link from 'next/link'
import { INITIATIVES, ALL_INITIATIVE_KEYS, type InitiativeKey } from '@/lib/initiatives'

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
  created_by: string | null
  initiative: string
}

interface TeamMember {
  name: string
  ultraHighTasks: { title: string; id: string }[]
  highTasks: { title: string; id: string }[]
  totalActive: number
}

const allTeamMembers = ['Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

const priorityLabels: Record<string, string> = { 'ultra-high': 'VERY HIGH', high: 'HIGH', medium: 'MEDIUM', low: 'LOW', backlog: 'BACKLOG' }
const priorityColors: Record<string, string> = { 'ultra-high': 'bg-red text-white', high: 'bg-orange text-white', medium: 'bg-gold text-white', low: 'bg-blue text-white', backlog: 'bg-black/20 text-black' }

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
  const [newNotes, setNewNotes] = useState('')
  const [newLinks, setNewLinks] = useState('')
  const [showPersonNewTask, setShowPersonNewTask] = useState(false)
  const [personNewTitle, setPersonNewTitle] = useState('')
  const [personNewPriority, setPersonNewPriority] = useState('medium')
  const [personNewDeadline, setPersonNewDeadline] = useState('')
  const [personNewNotes, setPersonNewNotes] = useState('')
  const [personNewLinks, setPersonNewLinks] = useState('')
  const [personNewChecklist, setPersonNewChecklist] = useState<{ id: string; text: string; checked: boolean }[]>([])
  const [personNewCheckInput, setPersonNewCheckInput] = useState('')
  const [editingCheckItem, setEditingCheckItem] = useState<string | null>(null)
  const [editCheckText, setEditCheckText] = useState('')
  const [editingTaskTitle, setEditingTaskTitle] = useState<string | null>(null)
  const [titleEditValue, setTitleEditValue] = useState('')
  const [showCompleted, setShowCompleted] = useState(true)
  const [filterInitiative, setFilterInitiative] = useState<string>('all')

  useEffect(() => {
    async function fetch() {
      // Fetch ALL master tasks (not just review)
      const { data: mt } = await supabase.from('master_tasks')
        .select('id, title, status, assignee, priority, links, current_status, overview, action_items, dan_comments, update_to_dan, dan_feedback, dan_checklist, deadline, created_by, initiative')
        .is('deleted_at', null)
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
      links: newLinks.trim() || null,
      current_status: null,
      overview: newNotes.trim() || null,
      action_items: null,
      dan_comments: newNotes.trim() || null,
      update_to_dan: null,
      dan_feedback: null,
      dan_checklist: [],
      created_by: displayName || 'Dan',
      initiative: filterInitiative !== 'all' ? filterInitiative : 'brmf',
    }
    setAllMasterTasks((prev) => [task, ...prev])
    setShowNewTask(false)
    setNewTitle('')
    setNewAssignee('')
    setNewPriority('high')
    setNewDeadline('')
    setNewNotes('')
    setNewLinks('')

    await supabase.from('master_tasks').insert({
      ...task,
      sort_order: 0,
      event_id: null,
      week_of: null,
    } as never)
    if (displayName) logActivity(displayName, 'created task', 'task', taskId, newTitle.trim(), newAssignee ? `Assigned to ${newAssignee}` : undefined)
  }

  const handleTitleSave = async (taskId: string) => {
    if (!titleEditValue.trim()) { setEditingTaskTitle(null); return }
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: titleEditValue.trim() } : t)))
    setEditingTaskTitle(null)
    await supabase.from('master_tasks').update({ title: titleEditValue.trim(), updated_at: new Date().toISOString() } as never).eq('id', taskId)
  }

  const handlePersonCreateTask = async () => {
    if (!personNewTitle.trim() || !selectedPerson) return
    const taskId = `mt-${Date.now()}`
    const task: MasterTaskFull = {
      id: taskId,
      title: personNewTitle.trim(),
      assignee: selectedPerson,
      priority: personNewPriority,
      status: 'not-started',
      deadline: personNewDeadline || null,
      links: personNewLinks.trim() || null,
      current_status: null,
      overview: (document.getElementById('rich-editor')?.innerHTML || personNewNotes).trim() || null,
      action_items: null,
      dan_comments: null,
      update_to_dan: null,
      dan_feedback: null,
      dan_checklist: personNewChecklist.length > 0 ? personNewChecklist : [],
      created_by: displayName || selectedPerson,
      initiative: filterInitiative !== 'all' ? filterInitiative : 'brmf',
    }
    setAllMasterTasks((prev) => [task, ...prev])
    setShowPersonNewTask(false)
    setPersonNewTitle('')
    setPersonNewPriority('medium')
    setPersonNewDeadline('')
    setPersonNewNotes('')
    setPersonNewLinks('')
    setPersonNewChecklist([])
    setPersonNewCheckInput('')

    await supabase.from('master_tasks').insert({
      ...task,
      sort_order: 0,
      event_id: null,
      week_of: null,
    } as never)
    if (displayName) logActivity(displayName, 'created task', 'task', taskId, personNewTitle.trim(), `Assigned to ${selectedPerson}`)
  }

  const handleWithdrawFromReview = async (taskId: string) => {
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'in-progress' } : t)))
    await supabase.from('master_tasks').update({ status: 'in-progress', updated_at: new Date().toISOString() } as never).eq('id', taskId)
    setExpandedTask(null)
  }

  const handleSaveUpdate = async (taskId: string) => {
    const editor = document.getElementById(`editor-${taskId}`)
    const html = editor?.innerHTML || updateText
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, update_to_dan: html } : t)))
    await supabase.from('master_tasks').update({ update_to_dan: html, updated_at: new Date().toISOString() } as never).eq('id', taskId)
  }

  const handleSubmitForReview = async (taskId: string) => {
    const task = allMasterTasks.find(t => t.id === taskId)
    setAllMasterTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'review' } : t)))
    await supabase.from('master_tasks').update({ status: 'review', updated_at: new Date().toISOString() } as never).eq('id', taskId)
    if (displayName) logActivity(displayName, 'submitted for review', 'task', taskId, task?.title)
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
    const task = allMasterTasks.find(t => t.id === taskId)
    const newStatus = action === 'approve' ? 'complete' : 'in-progress'
    setAllMasterTasks((prev) => action === 'approve' ? prev.filter((t) => t.id !== taskId) : prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, dan_feedback: feedbackText.trim() || t.dan_feedback } : t)))
    await supabase.from('master_tasks').update({ status: newStatus, dan_feedback: feedbackText.trim() || null, update_to_dan: null, updated_at: new Date().toISOString() } as never).eq('id', taskId)
    if (displayName) logActivity(displayName, action === 'approve' ? 'approved' : 'sent back', 'task', taskId, task?.title, feedbackText.trim() || undefined)
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
  const priorityRank: Record<string, number> = { 'ultra-high': 0, high: 1, medium: 2, low: 3, backlog: 4 }
  const filteredTasks = filterInitiative === 'all' ? allMasterTasks : allMasterTasks.filter((t) => t.initiative === filterInitiative)
  const reviewTasks = filteredTasks.filter((t) => t.status === 'review').sort((a, b) => (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4))
  const totalReview = reviewTasks.length + reviewEventTasks.length
  const completedTasks = selectedPerson
    ? filteredTasks.filter((t) => t.assignee?.includes(selectedPerson) && t.status === 'complete')
    : []

  // Compute team data dynamically based on initiative filter
  const filteredTeamData = (() => {
    const memberMap: Record<string, TeamMember> = {}
    for (const name of allTeamMembers) memberMap[name] = { name, ultraHighTasks: [], highTasks: [], totalActive: 0 }
    for (const t of filteredTasks) {
      if (!t.assignee || t.status === 'complete') continue
      for (const name of t.assignee.split(', ')) {
        if (memberMap[name]) {
          memberMap[name].totalActive++
          if (t.priority === 'ultra-high') memberMap[name].ultraHighTasks.push({ title: t.title, id: t.id })
          if (t.priority === 'high') memberMap[name].highTasks.push({ title: t.title, id: t.id })
        }
      }
    }
    return Object.values(memberMap)
  })()

  const personTasks = selectedPerson
    ? filteredTasks
        .filter((t) => t.assignee?.includes(selectedPerson) && t.status !== 'complete')
        .sort((a, b) => {
          // New from Dan come first
          const aNewDan = (a.created_by === 'Dan' || a.created_by === 'dan') && a.status === 'not-started' ? 1 : 0
          const bNewDan = (b.created_by === 'Dan' || b.created_by === 'dan') && b.status === 'not-started' ? 1 : 0
          if (aNewDan !== bNewDan) return bNewDan - aNewDan
          // Then tasks with Dan's feedback
          const aFeedback = a.dan_feedback && a.status === 'in-progress' ? 1 : 0
          const bFeedback = b.dan_feedback && b.status === 'in-progress' ? 1 : 0
          if (aFeedback !== bFeedback) return bFeedback - aFeedback
          // Then tasks in review
          if (a.status === 'review' && b.status !== 'review') return -1
          if (a.status !== 'review' && b.status === 'review') return 1
          // Then by priority
          return (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4)
        })
    : []

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-sm font-bold">Loading...</p></div>
  }

  // Shared task detail renderer
  function renderTaskDetail(task: MasterTaskFull, isDanView: boolean) {
    const taskIsFromDan = task.created_by === 'Dan' || task.created_by === 'dan'

    return (
      <div className="px-8 pb-8 bg-white border-t border-black/5">
        {/* Assigned by Dan banner */}
        {!isDanView && taskIsFromDan && (
          <div className="bg-purple text-white px-5 py-4 -mx-8 mb-6">
            <p className="text-sm font-bold uppercase tracking-widest">Assigned by Dan</p>
            {task.dan_comments && (
              <div className="text-base mt-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: task.dan_comments }} />
            )}
            {task.links && (
              <div className="mt-2 space-y-1">
                {task.links.split('\n').filter(Boolean).map((link, li) => (
                  <a key={li} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-white/80 hover:text-white underline block">{link.trim()}</a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Current Status + Action Items from master task list */}
        {(task.current_status || task.action_items) && (
          <div className="pt-6 mb-6 grid gap-4 sm:grid-cols-2">
            {task.current_status && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Current Status</p>
                <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: task.current_status }} />
              </div>
            )}
            {task.action_items && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Action Items</p>
                <div className="space-y-1.5">
                  {task.action_items.split('\n').filter(Boolean).map((item, ai) => {
                    const trimmed = item.replace(/^[-•*]\s*/, '').replace(/^\[[ x]\]\s*/i, '').trim()
                    const isChecked = item.match(/^\[x\]/i) !== null
                    return (
                      <div key={ai} className="flex items-start gap-2">
                        <span className={`mt-0.5 w-4 h-4 flex items-center justify-center shrink-0 border-2 ${
                          isChecked ? 'bg-green border-green text-white' : 'border-black/20'
                        }`}>
                          {isChecked && <span className="text-[9px]">✓</span>}
                        </span>
                        <span className={`text-xs ${isChecked ? 'line-through text-muted' : ''}`}>{trimmed}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Overview if present */}
        {task.overview && (
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Overview</p>
            <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: task.overview }} />
          </div>
        )}

        {/* Update to Dan */}
        <div className="pt-2 mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-purple mb-3">
            {isDanView ? `Update from ${task.assignee || 'Team'}` : 'Your Update for Dan'}
          </p>
          <div className="flex items-center gap-1 border-2 border-b-0 border-black/20 bg-cream-dark px-3 py-2">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.getElementById(`editor-${task.id}`)?.focus(); setTimeout(() => document.execCommand('bold', false), 0) }}
              className="px-2.5 py-1 text-sm font-bold hover:bg-black/10 transition-colors rounded" title="Bold"><strong>B</strong></button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.getElementById(`editor-${task.id}`)?.focus(); setTimeout(() => document.execCommand('italic', false), 0) }}
              className="px-2.5 py-1 text-sm italic hover:bg-black/10 transition-colors rounded" title="Italic"><em>I</em></button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.getElementById(`editor-${task.id}`)?.focus(); setTimeout(() => document.execCommand('underline', false), 0) }}
              className="px-2.5 py-1 text-sm underline hover:bg-black/10 transition-colors rounded" title="Underline">U</button>
            <div className="w-px h-5 bg-black/10 mx-1" />
            <button type="button" onMouseDown={(e) => { e.preventDefault(); const el = document.getElementById(`editor-${task.id}`); if (el) { el.focus(); document.execCommand('insertHTML', false, '<br>&bull;&nbsp;') } }}
              className="px-2.5 py-1 text-sm hover:bg-black/10 transition-colors rounded" title="Bullet">&bull;</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); const el = document.getElementById(`editor-${task.id}`); if (el) { el.focus(); document.execCommand('insertHTML', false, '<br>&mdash;&nbsp;') } }}
              className="px-2.5 py-1 text-sm hover:bg-black/10 transition-colors rounded" title="Dash">&mdash;</button>
          </div>
          <div
            id={`editor-${task.id}`}
            contentEditable
            suppressContentEditableWarning
            ref={(el) => {
              if (el && !el.dataset.initialized) {
                el.innerHTML = task.update_to_dan || ''
                el.dataset.initialized = 'true'
              }
            }}
            onBlur={(e) => { setUpdateText(e.currentTarget.innerHTML); handleSaveUpdate(task.id) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.execCommand('insertLineBreak') } }}
            className="w-full border-2 border-black/20 bg-white px-6 py-5 text-base text-black leading-relaxed focus:outline-none focus:border-purple overflow-auto"
            style={{ minHeight: '200px' }}
          />
          <div
            className="w-full h-3 border-2 border-t-0 border-black/20 bg-cream-dark cursor-ns-resize flex items-center justify-center hover:bg-black/10 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault()
              const editor = document.getElementById(`editor-${task.id}`)
              if (!editor) return
              const startY = e.clientY
              const startH = editor.offsetHeight
              const onMove = (ev: MouseEvent) => { editor.style.height = Math.max(150, startH + ev.clientY - startY) + 'px' }
              const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
              document.addEventListener('mousemove', onMove)
              document.addEventListener('mouseup', onUp)
            }}
          >
            <div className="w-8 h-1 bg-black/20 rounded-full" />
          </div>
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

        {/* Links — editable */}
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Links &amp; Attachments</p>
          {task.links && (
            <div className="space-y-1.5 mb-2">
              {task.links.split('\n').filter(Boolean).map((link, li) => (
                <a key={li} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} target="_blank" rel="noopener noreferrer"
                  className="text-base text-blue hover:text-red underline block">{link.trim()}</a>
              ))}
            </div>
          )}
          <input
            type="text"
            placeholder="Paste a link and press Enter..."
            className="w-full border-2 border-black/20 bg-white px-4 py-2.5 text-sm text-black focus:outline-none focus:border-blue placeholder:text-muted/30"
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (!val) return
                const currentLinks = task.links || ''
                const newLinks = currentLinks ? currentLinks + '\n' + val : val
                setAllMasterTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, links: newLinks } : t)))
                ;(e.target as HTMLInputElement).value = ''
                await supabase.from('master_tasks').update({ links: newLinks, updated_at: new Date().toISOString() } as never).eq('id', task.id)
              }
            }}
          />
        </div>


        {/* Dan's previous feedback */}
        {task.dan_feedback && (
          <div className="mb-6 border-l-4 border-red pl-5">
            <p className="text-sm font-bold uppercase tracking-widest text-red mb-1">Dan&apos;s Feedback</p>
            <div className="text-base" dangerouslySetInnerHTML={{ __html: task.dan_feedback }} />
          </div>
        )}

        {task.dan_comments && (
          <div className="mb-6 border-l-4 border-muted/30 pl-5">
            <p className="text-sm font-bold uppercase tracking-widest text-muted mb-1">Original Comments</p>
            <div className="text-base italic text-muted" dangerouslySetInnerHTML={{ __html: task.dan_comments }} />
          </div>
        )}

        {/* Actions — different for Dan vs team member */}
        {isDanView ? (
          <>
            <div className="flex items-center gap-6 mb-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-widest text-muted">Assign:</span>
                <span className="text-sm font-bold text-purple">{task.assignee || 'Unassigned'}</span>
                <select value="" onChange={(e) => {
                    if (!e.target.value) return
                    const current = task.assignee || ''
                    const names = current.split(', ').filter(Boolean)
                    if (names.includes(e.target.value)) return
                    handleDanReassign(task.id, names.length > 0 ? current + ', ' + e.target.value : e.target.value)
                  }}
                  className="border-2 border-black/20 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-purple cursor-pointer">
                  <option value="">+ Add</option>
                  {allTeamMembers.filter(n => !(task.assignee || '').includes(n)).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {task.assignee && (
                  <select value="" onChange={(e) => {
                      if (!e.target.value) return
                      const names = (task.assignee || '').split(', ').filter(n => n !== e.target.value)
                      handleDanReassign(task.id, names.length > 0 ? names.join(', ') : null)
                    }}
                    className="border-2 border-black/20 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-red cursor-pointer">
                    <option value="">- Remove</option>
                    {(task.assignee || '').split(', ').filter(Boolean).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-widest text-muted">Priority:</span>
                {['ultra-high', 'high', 'medium', 'low', 'backlog'].map((p) => (
                  <button key={p} onClick={() => handleDanPriority(task.id, p)}
                    className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-all ${task.priority === p ? priorityColors[p] : 'bg-black/5 text-muted/40 hover:text-muted'}`}>
                    {p === 'ultra-high' ? 'VERY HIGH' : p.toUpperCase()}
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
          <>
            {/* Created by indicator */}
            {task.created_by && (
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-purple bg-purple-light/20 px-3 py-1.5">
                  Created by {task.created_by}
                </span>
              </div>
            )}

            {/* Priority, Owner, Deadline controls */}
            <div className="flex items-center gap-6 mb-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-widest text-muted">Priority:</span>
                {['ultra-high', 'high', 'medium', 'low', 'backlog'].map((p) => (
                  <button key={p} onClick={() => handleDanPriority(task.id, p)}
                    className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-all ${task.priority === p ? priorityColors[p] : 'bg-black/5 text-muted/40 hover:text-muted'}`}>
                    {p === 'ultra-high' ? 'VERY HIGH' : p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6 mb-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-widest text-muted">Owner:</span>
                <span className="text-sm font-bold text-blue">{task.assignee || 'Unassigned'}</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return
                    const current = task.assignee || ''
                    const names = current.split(', ').filter(Boolean)
                    if (names.includes(e.target.value)) return
                    const newAssignee = names.length > 0 ? current + ', ' + e.target.value : e.target.value
                    handleDanReassign(task.id, newAssignee)
                  }}
                  className="border-2 border-black/20 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-purple cursor-pointer"
                >
                  <option value="">+ Add</option>
                  {allTeamMembers.filter(n => !(task.assignee || '').includes(n)).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {task.assignee && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return
                      const names = (task.assignee || '').split(', ').filter(n => n !== e.target.value)
                      handleDanReassign(task.id, names.length > 0 ? names.join(', ') : null)
                    }}
                    className="border-2 border-black/20 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-red cursor-pointer"
                  >
                    <option value="">- Remove</option>
                    {(task.assignee || '').split(', ').filter(Boolean).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-widest text-muted">Deadline:</span>
                <input
                  type="date"
                  value={task.deadline || ''}
                  onChange={async (e) => {
                    const val = e.target.value || null
                    setAllMasterTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, deadline: val } : t)))
                    await supabase.from('master_tasks').update({ deadline: val, updated_at: new Date().toISOString() } as never).eq('id', task.id)
                  }}
                  className="border-2 border-black/20 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:border-purple cursor-pointer"
                />
              </div>
            </div>

            <div className="border-t-2 border-purple-light/40 pt-6">
              <div className="flex gap-3 flex-wrap">
                {task.status === 'review' ? (
                  <button onClick={() => handleWithdrawFromReview(task.id)}
                    className="bg-muted text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors">
                    Withdraw from Review
                  </button>
                ) : (
                  <button onClick={() => handleSubmitForReview(task.id)}
                    className="bg-purple text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-purple-light transition-colors">
                    Submit for Dan&apos;s Review
                  </button>
                )}
                <button onClick={async () => {
                  await supabase.from('master_tasks').update({ status: 'complete', updated_at: new Date().toISOString() } as never).eq('id', task.id)
                  setAllMasterTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'complete' } : t))
                  setExpandedTask(null)
                  if (displayName) logActivity(displayName, 'completed', 'task', task.id, task.title)
                }}
                  className="bg-green text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-green-light transition-colors">
                  Mark as Done
                </button>
                <button onClick={async () => {
                  if (!confirm(`Delete "${task.title}"? It will be moved to the deleted backlog.`)) return
                  await supabase.from('master_tasks').update({ deleted_at: new Date().toISOString() } as never).eq('id', task.id)
                  setAllMasterTasks((prev) => prev.filter((t) => t.id !== task.id))
                  setExpandedTask(null)
                }}
                  className="text-red bg-red/10 hover:bg-red hover:text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </>
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
              const member = filteredTeamData.find((m) => m.name === name)
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
              <div className="bg-[#8855c0] text-white px-6 py-5 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-widest uppercase">Dan&apos;s Dashboard</h2>
                <div className="flex items-center gap-3">
                  <select value={filterInitiative} onChange={(e) => setFilterInitiative(e.target.value)}
                    className="bg-white/20 text-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none cursor-pointer border border-white/30">
                    <option value="all" className="text-black">All Initiatives</option>
                    {ALL_INITIATIVE_KEYS.map((k) => <option key={k} value={k} className="text-black">{INITIATIVES[k].shortLabel}</option>)}
                  </select>
                  <span className="text-sm font-bold tracking-wider opacity-70">{totalReview} for review</span>
                  <button onClick={() => setShowNewTask(!showNewTask)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${showNewTask ? 'bg-white text-purple' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                    {showNewTask ? 'Cancel' : '+ New Task'}
                  </button>
                </div>
              </div>

              {/* New task form */}
              {showNewTask && (
                <div className="border-l-2 border-r-2 border-b-2 border-purple/20 bg-white px-6 py-5 space-y-4">
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="TASK TITLE..."
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
                      <option value="low">Low</option>
                      <option value="backlog">Backlog</option>
                    </select>
                    <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)}
                      className="border-2 border-black/20 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer" />
                  </div>
                  <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Notes, context, or instructions..."
                    rows={4}
                    className="w-full border-2 border-black/20 bg-white px-4 py-3 text-sm text-black leading-relaxed focus:outline-none focus:border-purple placeholder:text-muted/30" />
                  <input type="text" value={newLinks} onChange={(e) => setNewLinks(e.target.value)}
                    placeholder="Links (one per line — Google Docs, etc.)"
                    className="w-full border-2 border-black/20 bg-white px-4 py-2.5 text-xs text-black focus:outline-none focus:border-purple placeholder:text-muted/30" />
                  <button onClick={handleCreateTask} disabled={!newTitle.trim()}
                    className="bg-purple text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-purple-light transition-colors disabled:opacity-40">
                    Create &amp; Assign
                  </button>
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
                        <div className="px-8 py-6 hover:bg-cream-dark transition-colors">
                          {/* Title — editable */}
                          {editingTaskTitle === task.id ? (
                            <input type="text" value={titleEditValue}
                              onChange={(e) => setTitleEditValue(e.target.value)}
                              onBlur={() => handleTitleSave(task.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(task.id); if (e.key === 'Escape') setEditingTaskTitle(null) }}
                              autoFocus
                              className="text-lg font-bold w-full border-2 border-black bg-white px-3 py-2 focus:outline-none focus:border-purple mb-2" />
                          ) : (
                            <h3 className="text-lg font-bold cursor-pointer hover:text-purple transition-colors mb-2"
                              onClick={() => { setEditingTaskTitle(task.id); setTitleEditValue(task.title) }}
                              title="Click to edit title">{task.title}</h3>
                          )}
                          {/* Meta + expand */}
                          <div className="flex items-center justify-between gap-4 cursor-pointer"
                            onClick={() => { setExpandedTask(isExpanded ? null : task.id); setUpdateText(task.update_to_dan || ''); setFeedbackText(''); setNewCheckItem('') }}>
                            <div className="flex items-center gap-4">
                              {task.assignee && <span className="text-sm font-bold text-purple">{task.assignee}</span>}
                              <span className={`text-sm font-bold ${task.priority === 'ultra-high' ? 'text-red' : task.priority === 'high' ? 'text-orange' : 'text-muted'}`}>{task.priority}</span>
                              {task.deadline && <span className="text-sm font-bold text-red">Due {new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                              {filterInitiative === 'all' && task.initiative && INITIATIVES[task.initiative as InitiativeKey] && (
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${INITIATIVES[task.initiative as InitiativeKey].color} text-white`}>
                                  {INITIATIVES[task.initiative as InitiativeKey].shortLabel}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-widest shrink-0 px-4 py-2 ${isExpanded ? 'bg-purple text-white' : 'text-purple bg-purple-light/20'}`}>
                              {isExpanded ? 'VIEWING' : 'REVIEW'}
                            </span>
                          </div>
                        </div>
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
              {selectedPerson === 'Sabrina' && (
                <Link
                  href="/priorities"
                  className="mb-4 flex items-center justify-between bg-black text-white px-6 py-4 hover:bg-black/80 transition-colors border-2 border-black"
                >
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest">My Priorities Dashboard</p>
                    <p className="text-[11px] uppercase tracking-widest text-white/60 mt-0.5">
                      Streams of work, brain dump, morning meeting view
                    </p>
                  </div>
                  <span className="text-xl">&#x2192;</span>
                </Link>
              )}
              <div className="bg-blue text-white px-6 py-5 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-widest uppercase">{selectedPerson}&apos;s Tasks</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tracking-wider opacity-70">{personTasks.length} tasks</span>
                  <button onClick={() => setShowPersonNewTask(!showPersonNewTask)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${showPersonNewTask ? 'bg-white text-blue' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                    {showPersonNewTask ? 'Cancel' : '+ New Task'}
                  </button>
                </div>
              </div>

              {showPersonNewTask && (
                <div className="border-l-2 border-r-2 border-b-2 border-blue/20 bg-white px-6 py-6 space-y-4">
                  {/* Title */}
                  <input type="text" value={personNewTitle} onChange={(e) => setPersonNewTitle(e.target.value)}
                    placeholder="Task title..."
                    autoFocus
                    className="w-full border-2 border-black bg-white px-4 py-3 text-lg font-bold text-black placeholder:text-muted/40 focus:outline-none focus:border-blue" />

                  {/* Priority + Deadline */}
                  <div className="flex gap-3 flex-wrap">
                    <select value={personNewPriority} onChange={(e) => setPersonNewPriority(e.target.value)}
                      className="border-2 border-black/20 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-black">
                      <option value="ultra-high">Very High</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="backlog">Backlog</option>
                    </select>
                    <input type="date" value={personNewDeadline} onChange={(e) => setPersonNewDeadline(e.target.value)}
                      className="border-2 border-black/20 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer" />
                  </div>

                  {/* Rich text area with toolbar */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Notes &amp; Context</p>
                    <div className="flex items-center gap-1 border-2 border-b-0 border-black/20 bg-cream-dark px-3 py-2">
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); document.getElementById('rich-editor')?.focus(); setTimeout(() => document.execCommand('bold', false), 0) }}
                        className="px-2.5 py-1 text-sm font-bold hover:bg-black/10 transition-colors rounded" title="Bold"><strong>B</strong></button>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); document.getElementById('rich-editor')?.focus(); setTimeout(() => document.execCommand('italic', false), 0) }}
                        className="px-2.5 py-1 text-sm italic hover:bg-black/10 transition-colors rounded" title="Italic"><em>I</em></button>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); document.getElementById('rich-editor')?.focus(); setTimeout(() => document.execCommand('underline', false), 0) }}
                        className="px-2.5 py-1 text-sm underline hover:bg-black/10 transition-colors rounded" title="Underline">U</button>
                      <div className="w-px h-5 bg-black/10 mx-1" />
                      <button type="button" onMouseDown={(e) => {
                        e.preventDefault()
                        const editor = document.getElementById('rich-editor')
                        if (editor) {
                          editor.focus()
                          document.execCommand('insertHTML', false, '<br>&bull;&nbsp;')
                        }
                      }}
                        className="px-2.5 py-1 text-sm hover:bg-black/10 transition-colors rounded" title="Bullet point">&bull;</button>
                      <button type="button" onMouseDown={(e) => {
                        e.preventDefault()
                        const editor = document.getElementById('rich-editor')
                        if (editor) {
                          editor.focus()
                          document.execCommand('insertHTML', false, '<br>&mdash;&nbsp;')
                        }
                      }}
                        className="px-2.5 py-1 text-sm hover:bg-black/10 transition-colors rounded" title="Dash">&mdash;</button>
                    </div>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setPersonNewNotes(e.currentTarget.innerHTML)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          document.execCommand('insertLineBreak')
                        }
                      }}
                      id="rich-editor"
                      className="w-full border-2 border-b-0 border-black/20 bg-white px-4 py-4 text-sm text-black leading-relaxed focus:outline-none focus:border-blue overflow-auto"
                      style={{ minHeight: '200px', height: '200px' }}
                    />
                    <div
                      className="w-full h-3 border-2 border-t-0 border-black/20 bg-cream-dark cursor-ns-resize flex items-center justify-center hover:bg-black/10 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        const editor = document.getElementById('rich-editor')
                        if (!editor) return
                        const startY = e.clientY
                        const startH = editor.offsetHeight
                        const onMove = (ev: MouseEvent) => {
                          editor.style.height = Math.max(150, startH + ev.clientY - startY) + 'px'
                        }
                        const onUp = () => {
                          document.removeEventListener('mousemove', onMove)
                          document.removeEventListener('mouseup', onUp)
                        }
                        document.addEventListener('mousemove', onMove)
                        document.addEventListener('mouseup', onUp)
                      }}
                    >
                      <div className="w-8 h-1 bg-black/20 rounded-full" />
                    </div>
                  </div>

                  {/* Links */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Links</p>
                    <input type="text" value={personNewLinks} onChange={(e) => setPersonNewLinks(e.target.value)}
                      placeholder="Paste URLs (one per line)"
                      className="w-full border-2 border-black/20 bg-white px-4 py-2.5 text-sm text-black focus:outline-none focus:border-blue placeholder:text-muted/30" />
                  </div>

                  {/* Checklist for Dan */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple mb-2">Dan Advise Checklist</p>
                    {personNewChecklist.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {personNewChecklist.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <span className="text-sm">{'\u2610'} {item.text}</span>
                            <button onClick={() => setPersonNewChecklist(prev => prev.filter(i => i.id !== item.id))}
                              className="text-muted/30 hover:text-red text-lg font-bold">&times;</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input type="text" value={personNewCheckInput} onChange={(e) => setPersonNewCheckInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && personNewCheckInput.trim()) {
                            setPersonNewChecklist(prev => [...prev, { id: `ci-${Date.now()}`, text: personNewCheckInput.trim(), checked: false }])
                            setPersonNewCheckInput('')
                          }
                        }}
                        placeholder="Add checkbox item for Dan..."
                        className="flex-1 border-2 border-purple-light/40 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:border-purple placeholder:text-muted/30" />
                      <button onClick={() => {
                        if (!personNewCheckInput.trim()) return
                        setPersonNewChecklist(prev => [...prev, { id: `ci-${Date.now()}`, text: personNewCheckInput.trim(), checked: false }])
                        setPersonNewCheckInput('')
                      }} className="bg-purple text-white px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-purple-light transition-colors">Add</button>
                    </div>
                  </div>

                  {/* Create button */}
                  <button onClick={handlePersonCreateTask} disabled={!personNewTitle.trim()}
                    className="w-full bg-blue text-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-blue-light transition-colors disabled:opacity-40">
                    Create Task
                  </button>
                </div>
              )}

              {personTasks.length === 0 && !showPersonNewTask ? (
                <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-8 py-20 text-center">
                  <p className="text-lg font-bold text-muted mb-2">No tasks</p>
                  <p className="text-sm text-muted">No active tasks assigned to {selectedPerson}.</p>
                </div>
              ) : (
                <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                  {personTasks.map((task, i) => {
                    const isExpanded = expandedTask === task.id
                    const hasDanFeedback = task.dan_feedback && task.status === 'in-progress'
                    const isFromDan = task.created_by === 'Dan' || task.created_by === 'dan'
                    const isNewFromDan = isFromDan && task.status === 'not-started'
                    return (
                      <div key={task.id} className={i > 0 ? 'border-t-2 border-black/10' : ''}>
                        <div className="px-8 py-6 hover:bg-cream-dark transition-colors">
                          {/* Title — editable */}
                          {editingTaskTitle === task.id ? (
                            <input type="text" value={titleEditValue}
                              onChange={(e) => setTitleEditValue(e.target.value)}
                              onBlur={() => handleTitleSave(task.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(task.id); if (e.key === 'Escape') setEditingTaskTitle(null) }}
                              autoFocus
                              className="text-lg font-bold w-full border-2 border-black bg-white px-3 py-2 focus:outline-none focus:border-blue mb-2" />
                          ) : (
                            <h3 className="text-lg font-bold cursor-pointer hover:text-blue transition-colors mb-2"
                              onClick={() => { setEditingTaskTitle(task.id); setTitleEditValue(task.title) }}
                              title="Click to edit title">{task.title}</h3>
                          )}
                          {/* Meta + expand */}
                          <div className="flex items-center justify-between gap-4 cursor-pointer"
                            onClick={() => { setExpandedTask(isExpanded ? null : task.id); setUpdateText(task.update_to_dan || ''); setNewCheckItem('') }}>
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className={`text-sm font-bold uppercase tracking-wider ${task.priority === 'ultra-high' ? 'text-red' : task.priority === 'high' ? 'text-orange' : 'text-muted'}`}>{priorityLabels[task.priority] || task.priority}</span>
                              {task.deadline && <span className="text-sm font-bold text-red">Due {new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                              {task.status === 'review' && <span className="text-sm font-bold text-purple">Awaiting Dan&apos;s Review</span>}
                              {isFromDan && <span className="text-sm font-bold text-purple">From Dan</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isNewFromDan && <span className="w-3 h-3 rounded-full bg-purple animate-pulse" title="New task from Dan" />}
                              {hasDanFeedback && <span className="w-3 h-3 rounded-full bg-red animate-pulse" title="Dan sent feedback" />}
                              <span className={`text-xs font-bold uppercase tracking-widest px-4 py-2 ${
                                isNewFromDan ? 'bg-purple text-white' :
                                task.status === 'review' ? 'bg-purple text-white' :
                                hasDanFeedback ? 'bg-red/10 text-red' :
                                'bg-black/5 text-muted'
                              }`}>
                                {isNewFromDan ? 'NEW FROM DAN' : task.status === 'review' ? 'IN REVIEW' : hasDanFeedback ? 'FEEDBACK' : task.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isExpanded && renderTaskDetail(task, false)}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div className="mt-4">
                  <button onClick={() => setShowCompleted(!showCompleted)}
                    className="w-full text-left px-6 py-3 bg-green/10 border-2 border-green/20 flex items-center justify-between hover:bg-green/15 transition-colors">
                    <span className="text-sm font-bold text-green uppercase tracking-widest">Completed ({completedTasks.length})</span>
                    <span className="text-xs text-green">{showCompleted ? '▲ Hide' : '▼ Show'}</span>
                  </button>
                  {showCompleted && (
                    <div className="border-l-2 border-r-2 border-b-2 border-green/20">
                      {completedTasks.map((task, i) => {
                        const isExpanded = expandedTask === task.id
                        return (
                          <div key={task.id} className={i > 0 ? 'border-t border-black/5' : ''}>
                            <div className="px-8 py-5 hover:bg-cream-dark transition-colors flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                                <h3 className="text-lg font-bold text-muted line-through">
                                  {task.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs font-bold text-green uppercase tracking-widest">Done</span>
                                  {task.dan_feedback && <span className="text-xs text-purple">Dan left feedback</span>}
                                </div>
                              </div>
                              <button onClick={async () => {
                                await supabase.from('master_tasks').update({ deleted_at: new Date().toISOString() } as never).eq('id', task.id)
                                setAllMasterTasks((prev) => prev.filter((t) => t.id !== task.id))
                                if (displayName) logActivity(displayName, 'archived', 'task', task.id, task.title)
                              }}
                                className="text-[10px] font-bold uppercase tracking-widest text-muted bg-black/5 hover:bg-red hover:text-white px-3 py-1.5 transition-colors shrink-0 mt-1">
                                Archive
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="px-8 pb-6 bg-white border-t border-black/5">
                                {/* Show full context of completed task */}
                                {task.update_to_dan && (
                                  <div className="pt-4 mb-4">
                                    <p className="text-sm font-bold uppercase tracking-widest text-purple mb-2">Update Submitted</p>
                                    <div className="text-sm leading-relaxed border-l-4 border-purple pl-4" dangerouslySetInnerHTML={{ __html: task.update_to_dan }} />
                                  </div>
                                )}
                                {task.dan_feedback && (
                                  <div className="mb-4">
                                    <p className="text-sm font-bold uppercase tracking-widest text-red mb-2">Dan&apos;s Feedback</p>
                                    <div className="text-sm leading-relaxed border-l-4 border-red pl-4" dangerouslySetInnerHTML={{ __html: task.dan_feedback }} />
                                  </div>
                                )}
                                {task.dan_checklist && task.dan_checklist.length > 0 && (
                                  <div className="mb-4">
                                    <p className="text-sm font-bold uppercase tracking-widest text-purple mb-2">Dan Advise Checklist</p>
                                    <div className="space-y-1">
                                      {task.dan_checklist.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2">
                                          <span className={`text-sm ${item.checked ? 'text-green' : 'text-muted'}`}>{item.checked ? '☑' : '☐'}</span>
                                          <span className={`text-sm ${item.checked ? 'line-through text-muted' : ''}`}>{item.text}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {task.links && (
                                  <div className="mb-4">
                                    <p className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Links</p>
                                    {task.links.split('\n').filter(Boolean).map((link, li) => (
                                      <a key={li} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} target="_blank" rel="noopener noreferrer"
                                        className="text-sm text-blue hover:text-red underline block">{link.trim()}</a>
                                    ))}
                                  </div>
                                )}
                                {task.overview && (
                                  <div className="mb-4">
                                    <p className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Overview</p>
                                    <div className="text-sm" dangerouslySetInnerHTML={{ __html: task.overview }} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
