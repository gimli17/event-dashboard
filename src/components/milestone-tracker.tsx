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

interface MilestoneItem {
  id: string
  milestone_id: string
  text: string
  completed: boolean
  sort_order: number
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
  const [items, setItems] = useState<MilestoneItem[]>([])
  const [tasks, setTasks] = useState<MilestoneTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMonth, setActiveMonth] = useState<string>('04')
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)

  const config = INITIATIVES[initiative]

  useEffect(() => {
    async function fetch() {
      const [msRes, itemsRes, taskRes] = await Promise.all([
        supabase.from('milestones').select('*').eq('initiative', initiative).order('sort_order'),
        supabase.from('milestone_items').select('*').order('sort_order'),
        supabase.from('master_tasks')
          .select('id, title, assignee, status, priority, milestone_id')
          .eq('initiative', initiative)
          .is('deleted_at', null)
          .not('milestone_id', 'is', null),
      ])
      if (msRes.data) setMilestones(msRes.data as Milestone[])
      if (itemsRes.data) setItems(itemsRes.data as MilestoneItem[])
      if (taskRes.data) setTasks(taskRes.data as MilestoneTask[])

      // Auto-select current month
      const now = new Date()
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
      if (MONTHS.some(m => m.key === currentMonth)) {
        setActiveMonth(currentMonth)
      }

      setLoading(false)
    }
    fetch()
  }, [initiative])

  const toggleItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const newVal = !item.completed
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, completed: newVal } : i))
    await supabase.from('milestone_items').update({ completed: newVal } as never).eq('id', itemId)
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-16 text-center"><p className="text-muted uppercase tracking-widest text-xs font-bold">Loading milestones...</p></div>
  }

  // Group milestones by month
  const monthMilestones = milestones.filter(ms => {
    if (!ms.target_date) return false
    const month = ms.target_date.slice(5, 7)
    return month === activeMonth
  })

  // Get all milestones for the active month to check if any have content
  const monthsWithContent = MONTHS.map(m => ({
    ...m,
    count: milestones.filter(ms => ms.target_date?.slice(5, 7) === m.key).length,
  }))

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Month tabs */}
      <div className="flex gap-0 border-2 border-black/10 mb-8">
        {monthsWithContent.map(month => {
          const isActive = activeMonth === month.key
          const allComplete = month.count > 0 && milestones
            .filter(ms => ms.target_date?.slice(5, 7) === month.key)
            .every(ms => {
              const msItems = items.filter(i => i.milestone_id === ms.id)
              return msItems.length > 0 && msItems.every(i => i.completed)
            })

          return (
            <button
              key={month.key}
              onClick={() => { setActiveMonth(month.key); setExpandedMilestone(null) }}
              className={`flex-1 py-4 text-center transition-colors relative ${
                isActive
                  ? `${config.color} text-white`
                  : allComplete
                    ? 'bg-green/10 text-green hover:bg-green/20'
                    : 'bg-white text-black hover:bg-cream-dark'
              } ${month.key !== '04' ? 'border-l-2 border-black/10' : ''}`}
            >
              <span className="text-xs font-bold uppercase tracking-widest">{month.label}</span>
              {allComplete && !isActive && <span className="ml-1.5">✓</span>}
              {month.count > 0 && (
                <span className={`block text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isActive ? 'text-white/60' : 'text-muted'}`}>
                  {month.count} milestone{month.count !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Milestones for active month */}
      {monthMilestones.length === 0 ? (
        <div className="text-center py-16 border-2 border-black/10 bg-white">
          <p className="text-muted uppercase tracking-widest text-xs font-bold">No milestones for {MONTHS.find(m => m.key === activeMonth)?.label}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthMilestones.map(ms => {
            const msItems = items.filter(i => i.milestone_id === ms.id)
            const msTasks = tasks.filter(t => t.milestone_id === ms.id)
            const doneItems = msItems.filter(i => i.completed).length
            const totalItems = msItems.length
            const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0
            const isComplete = totalItems > 0 && doneItems === totalItems
            const isExpanded = expandedMilestone === ms.id

            return (
              <div key={ms.id} className={`border-2 ${isComplete ? 'border-green/30' : 'border-black/10'} bg-white`}>
                {/* Header */}
                <button
                  onClick={() => setExpandedMilestone(isExpanded ? null : ms.id)}
                  className={`w-full text-left px-6 py-5 transition-colors ${isComplete ? 'bg-green/5 hover:bg-green/10' : 'hover:bg-cream-dark'}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Status indicator */}
                    <div className={`w-12 h-12 flex items-center justify-center shrink-0 text-lg font-bold ${isComplete ? 'bg-green text-white' : config.color + ' text-white'}`}>
                      {isComplete ? '★' : `${progress}%`}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-lg font-bold ${isComplete ? 'text-green' : ''}`}>{ms.title}</h3>
                        {isComplete && <span className="text-lg">🎉</span>}
                      </div>
                      {ms.description && <p className="text-xs text-muted mt-0.5">{ms.description}</p>}

                      {/* Progress bar */}
                      {totalItems > 0 && (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-black/5">
                            <div
                              className={`h-2 transition-all duration-500 ${isComplete ? 'bg-green' : 'bg-[#2a4e80]'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold shrink-0 ${isComplete ? 'text-green' : 'text-muted'}`}>
                            {doneItems}/{totalItems}
                          </span>
                        </div>
                      )}
                    </div>

                    <span className="text-xs text-muted shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t-2 border-black/10">
                    {msItems.length === 0 && msTasks.length === 0 ? (
                      <div className="px-6 py-6 text-center">
                        <p className="text-xs text-muted">No items yet for this milestone.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-black/5">
                        {msItems.map(item => (
                          <div key={item.id} className="px-6 py-3 flex items-start gap-3">
                            <button
                              onClick={() => toggleItem(item.id)}
                              className={`mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 border-2 transition-colors ${
                                item.completed
                                  ? 'bg-green border-green text-white'
                                  : 'border-black/20 hover:border-black/40'
                              }`}
                            >
                              {item.completed && <span className="text-xs">✓</span>}
                            </button>
                            <span className={`text-sm leading-relaxed ${item.completed ? 'line-through text-muted' : ''}`}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                        {/* Linked master tasks */}
                        {msTasks.length > 0 && (
                          <>
                            {msItems.length > 0 && (
                              <div className="px-6 py-2 bg-cream-dark">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Linked Tasks</p>
                              </div>
                            )}
                            {msTasks.map(task => (
                              <div key={task.id} className="px-6 py-3 flex items-center gap-3">
                                <span className={`shrink-0 w-5 h-5 flex items-center justify-center border-2 ${
                                  task.status === 'complete' ? 'bg-green border-green text-white' : 'border-black/20'
                                }`}>
                                  {task.status === 'complete' && <span className="text-xs">✓</span>}
                                </span>
                                <span className={`text-sm ${task.status === 'complete' ? 'line-through text-muted' : ''}`}>{task.title}</span>
                                {task.assignee && <span className="text-[10px] font-bold text-blue uppercase tracking-wider ml-auto">{task.assignee}</span>}
                              </div>
                            ))}
                          </>
                        )}
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
  )
}
