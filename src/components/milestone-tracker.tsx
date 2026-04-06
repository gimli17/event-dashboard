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
}

interface MilestoneTask {
  id: string
  title: string
  assignee: string | null
  status: string
  priority: string
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

  const config = INITIATIVES[initiative]

  useEffect(() => {
    async function fetch() {
      const [msRes, taskRes] = await Promise.all([
        supabase.from('milestones').select('*').eq('initiative', initiative).order('sort_order'),
        supabase.from('master_tasks')
          .select('id, title, assignee, status, priority, milestone_id')
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

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading milestones...</p></div>
  }

  const monthMilestones = milestones.filter(ms => ms.target_date?.slice(5, 7) === activeMonth)

  const monthsWithContent = MONTHS.map(m => {
    const msList = milestones.filter(ms => ms.target_date?.slice(5, 7) === m.key)
    const allComplete = msList.length > 0 && msList.every(ms => {
      const msTasks = tasks.filter(t => t.milestone_id === ms.id)
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
      {monthMilestones.length === 0 ? (
        <div className="text-center py-16 border-2 border-black/10 bg-white">
          <p className="text-muted uppercase tracking-widest text-xs font-bold">No milestones for {MONTHS.find(m => m.key === activeMonth)?.label}</p>
        </div>
      ) : expandedMilestone ? (
        (() => {
          const ms = milestones.find(m => m.id === expandedMilestone)
          if (!ms) return null
          const msTasks = tasks.filter(t => t.milestone_id === ms.id)
          const doneCount = msTasks.filter(t => t.status === 'complete').length
          const totalCount = msTasks.length
          const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
          const isComplete = totalCount > 0 && doneCount === totalCount

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
                      <h3 className={`text-lg font-bold ${isComplete ? 'text-green' : ''}`}>{ms.title}</h3>
                      {isComplete && <span className="text-lg">🎉</span>}
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
                </div>

                {/* Task list — read only, links to master task list */}
                <div className="border-t-2 border-black/10 divide-y divide-black/5">
                  {msTasks.length === 0 ? (
                    <div className="px-6 py-6 text-center">
                      <p className="text-xs text-muted">No tasks linked to this milestone yet.</p>
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
        // Tile grid
        <div className="grid grid-cols-2 gap-4">
          {monthMilestones.map(ms => {
            const msTasks = tasks.filter(t => t.milestone_id === ms.id)
            const doneCount = msTasks.filter(t => t.status === 'complete').length
            const totalCount = msTasks.length
            const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
            const isComplete = totalCount > 0 && doneCount === totalCount

            return (
              <button
                key={ms.id}
                onClick={() => setExpandedMilestone(ms.id)}
                className={`text-left border-2 ${isComplete ? 'border-green/30' : 'border-black/10'} bg-white hover:bg-cream-dark transition-colors group`}
              >
                <div className={`px-5 py-4 ${isComplete ? 'bg-green/5' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`text-sm font-bold leading-tight ${isComplete ? 'text-green' : ''}`}>
                      {isComplete && <span className="mr-1.5">★</span>}
                      {ms.title}
                      {isComplete && <span className="ml-1.5">🎉</span>}
                    </h3>
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
    </div>
  )
}
