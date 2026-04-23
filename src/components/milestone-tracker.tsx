'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { INITIATIVES, type InitiativeKey } from '@/lib/initiatives'

interface Milestone {
  id: string
  title: string
  description: string | null
  initiative: string
  sort_order: number
  target_date: string | null
  completed_at: string | null
}

interface MilestoneTask {
  id: string
  title: string
  assignee: string | null
  status: string
  priority: string
  deadline: string | null
  sort_order: number
  milestone_id: string | null
}

const MONTHS = [
  { key: '04', label: 'April' },
  { key: '05', label: 'May' },
  { key: '06', label: 'June' },
  { key: '07', label: 'July' },
  { key: '08', label: 'August' },
]

export function MilestoneTracker({ initiative }: { initiative: InitiativeKey }) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [tasks, setTasks] = useState<MilestoneTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMonth, setActiveMonth] = useState<string>('04')
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')

  const config = INITIATIVES[initiative]

  // Sort tasks: by deadline (earliest first), then sort_order, completed last
  const sortTasks = (a: MilestoneTask, b: MilestoneTask) => {
    // Completed tasks go to the bottom
    if (a.status === 'complete' && b.status !== 'complete') return 1
    if (a.status !== 'complete' && b.status === 'complete') return -1
    // Then by deadline (tasks with deadlines first, earlier first)
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    // Then by sort_order
    return a.sort_order - b.sort_order
  }

  useEffect(() => {
    async function fetch() {
      const [msRes, taskRes] = await Promise.all([
        supabase.from('milestones').select('*').eq('initiative', initiative).order('sort_order'),
        supabase.from('master_tasks')
          .select('id, title, assignee, status, priority, deadline, sort_order, milestone_id')
          .eq('initiative', initiative)
          .is('deleted_at', null)
          .not('milestone_id', 'is', null),
      ])
      if (msRes.data) setMilestones(msRes.data as Milestone[])
      if (taskRes.data) setTasks(taskRes.data as MilestoneTask[])

      const now = new Date()
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
      if (MONTHS.some(m => m.key === currentMonth)) {
        setActiveMonth(currentMonth)
      }
      setLoading(false)
    }
    fetch()
  }, [initiative])

  // Realtime: listen for task inserts/updates with milestone_id
  useEffect(() => {
    const channel = supabase
      .channel('milestone-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_tasks' }, (payload) => {
        const t = payload.new as MilestoneTask & { initiative: string; deleted_at: string | null }
        if (!t || t.initiative !== initiative) return
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (t.milestone_id && !t.deleted_at) {
            setTasks(prev => {
              const exists = prev.find(x => x.id === t.id)
              if (exists) return prev.map(x => x.id === t.id ? t : x)
              return [...prev, t]
            })
          } else {
            // Milestone removed or task deleted — remove from list
            setTasks(prev => prev.filter(x => x.id !== t.id))
          }
        }
        if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(x => x.id !== (payload.old as { id: string }).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [initiative])

  const handleEditSave = async (msId: string) => {
    if (!editTitle.trim()) { setEditingId(null); return }
    setMilestones(prev => prev.map(m => m.id === msId ? { ...m, title: editTitle.trim() } : m))
    setEditingId(null)
    await supabase.from('milestones').update({ title: editTitle.trim() } as never).eq('id', msId)
  }

  const handleDateSave = async (msId: string) => {
    const newDate = editDate || null
    setMilestones(prev => prev.map(m => m.id === msId ? { ...m, target_date: newDate } : m))
    setEditingDate(null)
    await supabase.from('milestones').update({ target_date: newDate } as never).eq('id', msId)
  }

  const handleDelete = async (msId: string) => {
    if (!confirm('Delete this milestone? Tasks linked to it will be unlinked.')) return
    setMilestones(prev => prev.filter(m => m.id !== msId))
    setTasks(prev => prev.map(t => t.milestone_id === msId ? { ...t, milestone_id: null } : t))
    setExpandedMilestone(null)
    await supabase.from('master_tasks').update({ milestone_id: null } as never).eq('milestone_id', msId)
    await supabase.from('milestones').delete().eq('id', msId)
  }

  const handleToggleComplete = async (msId: string, currentlyComplete: boolean) => {
    const nextValue = currentlyComplete ? null : new Date().toISOString()
    setMilestones(prev => prev.map(m => m.id === msId ? { ...m, completed_at: nextValue } : m))
    await supabase.from('milestones').update({ completed_at: nextValue } as never).eq('id', msId)
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading milestones...</p></div>
  }

  const monthMilestones = milestones
    .filter(ms => ms.target_date?.slice(5, 7) === activeMonth)
    .sort((a, b) => (a.target_date || '').localeCompare(b.target_date || ''))

  const monthsWithContent = MONTHS.map(m => {
    const msList = milestones.filter(ms => ms.target_date?.slice(5, 7) === m.key)
    const allComplete = msList.length > 0 && msList.every(ms => {
      if (ms.completed_at) return true
      const msTasks = tasks.filter(t => t.milestone_id === ms.id).sort(sortTasks)
      return msTasks.length > 0 && msTasks.every(t => t.status === 'complete')
    })
    return { ...m, count: msList.length, allComplete }
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Month tabs */}
      <div className="flex gap-0 border-2 border-black/10 mb-8">
        {monthsWithContent.map(month => (
          <button
            key={month.key}
            onClick={() => { setActiveMonth(month.key); setExpandedMilestone(null) }}
            className={`flex-1 py-4 text-center transition-colors ${
              activeMonth === month.key
                ? `${config.color} text-white`
                : month.allComplete
                  ? 'bg-green/10 text-green hover:bg-green/20'
                  : 'bg-white text-black hover:bg-cream-dark'
            } ${month.key !== '04' ? 'border-l-2 border-black/10' : ''}`}
          >
            <span className="text-xs font-bold uppercase tracking-widest">{month.label}</span>
            {month.allComplete && activeMonth !== month.key && <span className="ml-1.5">✓</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {expandedMilestone ? (
        (() => {
          const ms = milestones.find(m => m.id === expandedMilestone)
          if (!ms) return null
          const msTasks = tasks.filter(t => t.milestone_id === ms.id).sort(sortTasks)
          const doneCount = msTasks.filter(t => t.status === 'complete').length
          const totalCount = msTasks.length
          const tasksAllDone = totalCount > 0 && doneCount === totalCount
          const manuallyComplete = !!ms.completed_at
          const isComplete = manuallyComplete || tasksAllDone
          const progress = manuallyComplete ? 100 : (totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0)

          return (
            <div>
              <button
                onClick={() => setExpandedMilestone(null)}
                className="text-xs font-bold uppercase tracking-widest text-muted hover:text-black transition-colors mb-4 flex items-center gap-2"
              >
                <span>&larr;</span> Back to {MONTHS.find(m => m.key === activeMonth)?.label}
              </button>

              <div className={`border-2 ${isComplete ? 'border-green/30' : 'border-black/10'} bg-white`}>
                {/* Header */}
                <div className={`px-6 py-5 flex items-center gap-4 ${isComplete ? 'bg-green/5' : ''}`}>
                  <div className={`w-12 h-12 flex items-center justify-center shrink-0 text-white font-bold ${isComplete ? 'bg-green' : config.color}`}>
                    {isComplete ? '★' : `${progress}%`}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {editingId === ms.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleEditSave(ms.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(ms.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="text-lg font-bold border-2 border-black bg-white px-2 py-1 focus:outline-none focus:border-blue flex-1"
                          autoFocus
                        />
                      ) : (
                        <>
                          <h3
                            className={`text-lg font-bold cursor-pointer hover:text-blue transition-colors ${isComplete ? 'text-green' : ''}`}
                            onClick={() => { setEditingId(ms.id); setEditTitle(ms.title) }}
                            title="Click to edit"
                          >
                            {ms.title}
                          </h3>
                          {isComplete && <span className="text-lg">🎉</span>}
                        </>
                      )}
                    </div>
                    {/* Editable date */}
                    <div className="mt-1">
                      {editingDate === ms.id ? (
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          onBlur={() => handleDateSave(ms.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleDateSave(ms.id); if (e.key === 'Escape') setEditingDate(null) }}
                          className="border-2 border-black bg-white px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-blue"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingDate(ms.id); setEditDate(ms.target_date || '') }}
                          className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-blue transition-colors"
                        >
                          {ms.target_date
                            ? `Due ${new Date(ms.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                            : 'Set target date'
                          }
                        </button>
                      )}
                    </div>
                    {totalCount > 0 && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-black/5">
                          <div className={`h-2 transition-all duration-500 ${isComplete ? 'bg-green' : 'bg-[#2a4e80]'}`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold ${isComplete ? 'text-green' : 'text-muted'}`}>{doneCount}/{totalCount}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleComplete(ms.id, manuallyComplete)}
                      className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-colors ${
                        manuallyComplete
                          ? 'bg-green text-white hover:bg-green/80'
                          : 'bg-white text-green border-2 border-green/40 hover:bg-green hover:text-white'
                      }`}
                      title={manuallyComplete ? 'Mark as incomplete' : 'Mark this milestone complete regardless of task status'}
                    >
                      {manuallyComplete ? '\u2713 Done' : 'Mark Complete'}
                    </button>
                    <button
                      onClick={() => handleDelete(ms.id)}
                      className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-red hover:bg-red/10 px-3 py-1.5 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Task list */}
                <div className="border-t-2 border-black/10 divide-y divide-black/5">
                  {msTasks.length === 0 ? (
                    <div className="px-6 py-6 text-center">
                      <p className="text-xs text-muted">No tasks linked to this milestone yet. Assign tasks from the master task list.</p>
                    </div>
                  ) : (
                    msTasks.map(task => (
                      <div key={task.id} className="px-6 py-3.5 flex items-center gap-3">
                        <span className={`w-5 h-5 flex items-center justify-center shrink-0 border-2 ${
                          task.status === 'complete' ? 'bg-green border-green text-white' : 'border-black/20'
                        }`}>
                          {task.status === 'complete' && <span className="text-xs">✓</span>}
                        </span>
                        <Link
                          href={`/tasks#${task.id}`}
                          className={`text-sm flex-1 hover:underline transition-colors ${
                            task.status === 'complete' ? 'line-through text-muted' : 'text-blue hover:text-black'
                          }`}
                        >
                          {task.title}
                        </Link>
                        {task.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider shrink-0">{task.assignee}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )
        })()
      ) : (
        <>
          {/* Tile grid */}
          {monthMilestones.length === 0 ? (
            <div className="text-center py-16 border-2 border-black/10 bg-white">
              <p className="text-muted uppercase tracking-widest text-xs font-bold">No milestones for {MONTHS.find(m => m.key === activeMonth)?.label}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {monthMilestones.map(ms => {
                const msTasks = tasks.filter(t => t.milestone_id === ms.id).sort(sortTasks)
                const doneCount = msTasks.filter(t => t.status === 'complete').length
                const totalCount = msTasks.length
                const manuallyComplete = !!ms.completed_at
                const tasksAllDone = totalCount > 0 && doneCount === totalCount
                const isComplete = manuallyComplete || tasksAllDone
                const progress = manuallyComplete ? 100 : (totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0)

                return (
                  <button
                    key={ms.id}
                    onClick={() => setExpandedMilestone(ms.id)}
                    className={`text-left border-2 ${isComplete ? 'border-green/30' : 'border-black/10'} bg-white hover:bg-cream-dark transition-colors group`}
                  >
                    <div className={`px-5 py-4 ${isComplete ? 'bg-green/5' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {ms.target_date && (
                            <p className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${isComplete ? 'text-green' : 'text-[#2a4e80]'}`}>
                              {new Date(ms.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            </p>
                          )}
                          <h3 className={`text-sm font-bold leading-tight ${isComplete ? 'text-green' : ''}`}>
                            {isComplete && <span className="mr-1.5">★</span>}
                            {ms.title}
                            {isComplete && <span className="ml-1.5">🎉</span>}
                          </h3>
                        </div>
                        <span className="text-xs text-muted shrink-0 group-hover:text-black transition-colors">&rarr;</span>
                      </div>

                      {totalCount > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-black/5">
                            <div className={`h-1.5 transition-all duration-500 ${isComplete ? 'bg-green' : 'bg-[#2a4e80]'}`} style={{ width: `${progress}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold shrink-0 ${isComplete ? 'text-green' : 'text-muted'}`}>
                            {doneCount}/{totalCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

        </>
      )}
    </div>
  )
}
