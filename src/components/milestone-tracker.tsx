'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { INITIATIVES, type InitiativeKey } from '@/lib/initiatives'

interface Milestone {
  id: string
  title: string
  description: string | null
  initiative: string
  sort_order: number
  target_date: string | null
}

interface MilestoneTask {
  id: string
  title: string
  assignee: string | null
  status: string
  priority: string
  deadline: string | null
  milestone_id: string | null
}

const statusLabels: Record<string, string> = {
  'not-started': 'NOT STARTED',
  'in-progress': 'IN PROGRESS',
  review: 'REVIEW',
  blocked: 'BLOCKED',
  complete: 'DONE',
}

const statusColors: Record<string, string> = {
  'not-started': 'text-muted bg-black/5',
  'in-progress': 'text-orange bg-orange/10',
  review: 'text-blue bg-blue/10',
  blocked: 'text-red bg-red/10',
  complete: 'text-green bg-green/10',
}

export function MilestoneTracker({ initiative }: { initiative: InitiativeKey }) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [tasks, setTasks] = useState<MilestoneTask[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)

  const config = INITIATIVES[initiative]

  useEffect(() => {
    async function fetch() {
      const [msRes, taskRes] = await Promise.all([
        supabase.from('milestones').select('*').eq('initiative', initiative).order('sort_order'),
        supabase.from('master_tasks')
          .select('id, title, assignee, status, priority, deadline, milestone_id')
          .eq('initiative', initiative)
          .is('deleted_at', null)
          .order('sort_order'),
      ])
      if (msRes.data) setMilestones(msRes.data as Milestone[])
      if (taskRes.data) setTasks(taskRes.data as MilestoneTask[])
      setLoading(false)
    }
    fetch()
  }, [initiative])

  const handleStatusToggle = async (taskId: string) => {
    const order = ['not-started', 'in-progress', 'review', 'complete']
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const nextIdx = (order.indexOf(task.status) + 1) % order.length
    const newStatus = order[nextIdx]
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    await supabase.from('master_tasks').update({ status: newStatus, updated_at: new Date().toISOString() } as never).eq('id', taskId)
  }

  const handleAssignMilestone = async (taskId: string, milestoneId: string) => {
    const val = milestoneId || null
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, milestone_id: val } : t))
    await supabase.from('master_tasks').update({ milestone_id: val } as never).eq('id', taskId)
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading milestones...</p></div>
  }

  const unassignedTasks = tasks.filter(t => !t.milestone_id && t.status !== 'complete')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Milestones */}
      <div className="space-y-4">
        {milestones.map((ms, idx) => {
          const msTasks = tasks.filter(t => t.milestone_id === ms.id)
          const doneCount = msTasks.filter(t => t.status === 'complete').length
          const totalCount = msTasks.length
          const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
          const isComplete = totalCount > 0 && doneCount === totalCount
          const isExpanded = expandedMilestone === ms.id

          return (
            <div key={ms.id} className="border-2 border-black/10 bg-white">
              {/* Milestone header */}
              <button
                onClick={() => setExpandedMilestone(isExpanded ? null : ms.id)}
                className={`w-full text-left px-6 py-5 transition-colors ${isComplete ? 'bg-green/10 hover:bg-green/15' : 'hover:bg-cream-dark'}`}
              >
                <div className="flex items-start gap-4">
                  {/* Number badge */}
                  <div className={`w-10 h-10 flex items-center justify-center shrink-0 text-white font-bold text-sm ${isComplete ? 'bg-green' : config.color}`}>
                    {isComplete ? '★' : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-base font-bold ${isComplete ? 'text-green' : ''}`}>
                        {ms.title}
                      </h3>
                      {isComplete && (
                        <span className="text-green text-lg">🎉</span>
                      )}
                    </div>
                    {ms.description && (
                      <p className="text-xs text-muted mt-1">{ms.description}</p>
                    )}

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-black/5">
                        <div
                          className={`h-2 transition-all duration-500 ${isComplete ? 'bg-green' : 'bg-[var(--progress-color)]'}`}
                          style={{
                            width: `${progress}%`,
                            ['--progress-color' as string]: isComplete ? undefined : config.color.includes('#') ? config.color.replace('bg-[', '').replace(']', '') : undefined,
                          } as React.CSSProperties}
                        />
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${isComplete ? 'text-green' : 'text-muted'}`}>
                        {doneCount}/{totalCount}
                      </span>
                    </div>
                  </div>

                  {/* Target date + expand arrow */}
                  <div className="text-right shrink-0">
                    {ms.target_date && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        Target: {new Date(ms.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    <span className="text-xs text-muted mt-1 block">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
              </button>

              {/* Expanded task list */}
              {isExpanded && (
                <div className="border-t-2 border-black/10">
                  {msTasks.length === 0 ? (
                    <div className="px-6 py-6 text-center">
                      <p className="text-xs text-muted">No tasks assigned to this milestone yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-black/5">
                      {msTasks.map(task => (
                        <div key={task.id} className="px-6 py-3 flex items-center gap-4">
                          <button
                            onClick={() => handleStatusToggle(task.id)}
                            className={`shrink-0 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${statusColors[task.status]}`}
                            title="Click to toggle status"
                          >
                            {statusLabels[task.status]}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${task.status === 'complete' ? 'line-through text-muted' : ''}`}>{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {task.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{task.assignee}</span>}
                              {task.deadline && (
                                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                                  Due {new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Unassigned tasks */}
      {unassignedTasks.length > 0 && (
        <div className="mt-10">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mb-3">
            Unassigned Tasks ({unassignedTasks.length})
          </h3>
          <div className="border-2 border-black/10 bg-white divide-y divide-black/5">
            {unassignedTasks.map(task => (
              <div key={task.id} className="px-6 py-3 flex items-center gap-4">
                <span className={`shrink-0 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${statusColors[task.status]}`}>
                  {statusLabels[task.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{task.title}</p>
                  {task.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{task.assignee}</span>}
                </div>
                <select
                  value=""
                  onChange={(e) => handleAssignMilestone(task.id, e.target.value)}
                  className="border-2 border-black/10 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-black cursor-pointer shrink-0"
                >
                  <option value="">Assign to milestone...</option>
                  {milestones.map(ms => <option key={ms.id} value={ms.id}>{ms.title}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
