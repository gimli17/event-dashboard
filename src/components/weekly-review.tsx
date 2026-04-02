'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'

interface ScheduledChange {
  id: string
  task_id: string
  new_priority: string
  effective_date: string
  reason: string | null
  applied: boolean
  task_title?: string
  current_priority?: string
}

const priorityLabels: Record<string, string> = {
  'ultra-high': 'VERY HIGH',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  backlog: 'BACKLOG',
}

const priorityColors: Record<string, string> = {
  'ultra-high': 'bg-red text-white',
  high: 'bg-orange text-white',
  medium: 'bg-gold text-white',
  low: 'bg-blue text-white',
  backlog: 'bg-black/20 text-black',
}

export function WeeklyReviewButton() {
  const { displayName } = useUser()
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState<ScheduledChange[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    async function fetch() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      const { data: scheduled } = await supabase
        .from('scheduled_reprioritizations')
        .select('*')
        .eq('applied', false)
        .lte('effective_date', today)
        .order('effective_date')

      if (scheduled && scheduled.length > 0) {
        const taskIds = scheduled.map((s: ScheduledChange) => s.task_id)
        const { data: tasks } = await supabase
          .from('master_tasks')
          .select('id, title, priority')
          .in('id', taskIds)

        const taskMap: Record<string, { title: string; priority: string }> = {}
        if (tasks) {
          for (const t of tasks as { id: string; title: string; priority: string }[]) {
            taskMap[t.id] = { title: t.title, priority: t.priority }
          }
        }

        setChanges(
          (scheduled as ScheduledChange[]).map((s) => ({
            ...s,
            task_title: taskMap[s.task_id]?.title ?? 'Unknown',
            current_priority: taskMap[s.task_id]?.priority ?? 'unknown',
          }))
        )
      } else {
        setChanges([])
      }
      setLoading(false)
    }
    fetch()
  }, [open])

  const handleApprove = async (change: ScheduledChange) => {
    // Apply the priority change
    await supabase.from('master_tasks').update({
      priority: change.new_priority,
      updated_at: new Date().toISOString(),
    } as never).eq('id', change.task_id)

    // Mark as applied
    await supabase.from('scheduled_reprioritizations').update({ applied: true } as never).eq('id', change.id)

    // Log comment
    if (displayName) {
      await supabase.from('master_task_comments').insert({
        task_id: change.task_id,
        author: displayName,
        message: `Approved scheduled reprioritization to ${priorityLabels[change.new_priority]} (${change.reason})`,
      } as never)
    }

    setChanges((prev) => prev.filter((c) => c.id !== change.id))
  }

  const handleDeny = async (change: ScheduledChange) => {
    // Mark as applied (dismissed) without changing priority
    await supabase.from('scheduled_reprioritizations').update({ applied: true } as never).eq('id', change.id)

    if (displayName) {
      await supabase.from('master_task_comments').insert({
        task_id: change.task_id,
        author: displayName,
        message: `Denied scheduled reprioritization to ${priorityLabels[change.new_priority]} — keeping current priority`,
      } as never)
    }

    setChanges((prev) => prev.filter((c) => c.id !== change.id))
  }

  const handleApproveAll = async () => {
    for (const change of changes) {
      await handleApprove(change)
    }
  }

  const pendingCount = changes.length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${
          pendingCount > 0 ? 'bg-red text-white border-red animate-pulse' : 'bg-white text-black border-black/20 hover:border-black'
        }`}
      >
        Weekly Review {pendingCount > 0 ? `(${pendingCount})` : ''}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[9991] bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9992] bg-cream border-4 border-black w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="bg-black text-white px-6 py-4 flex items-center justify-between sticky top-0">
              <h2 className="text-sm font-bold uppercase tracking-widest">Weekly Priority Review</h2>
              <button onClick={() => setOpen(false)} className="text-white hover:text-red text-lg font-bold">&times;</button>
            </div>

            <div className="px-6 py-4">
              {loading ? (
                <p className="text-xs text-muted uppercase tracking-widest text-center py-8">Loading...</p>
              ) : changes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-bold mb-2">No pending reprioritizations</p>
                  <p className="text-xs text-muted">All scheduled priority changes have been reviewed or aren&apos;t due yet.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted mb-4">
                    {changes.length} scheduled priority change{changes.length !== 1 ? 's' : ''} ready for review. Based on Dan&apos;s comments.
                  </p>

                  <div className="space-y-3 mb-4">
                    {changes.map((change) => (
                      <div key={change.id} className="border-2 border-black/10 bg-white p-4">
                        <h3 className="text-sm font-bold mb-1">{change.task_title}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase ${priorityColors[change.current_priority || 'medium']}`}>
                            {priorityLabels[change.current_priority || 'medium']}
                          </span>
                          <span className="text-muted text-xs">&rarr;</span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase ${priorityColors[change.new_priority]}`}>
                            {priorityLabels[change.new_priority]}
                          </span>
                        </div>
                        {change.reason && (
                          <p className="text-xs text-muted italic mb-3">{change.reason}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(change)}
                            className="bg-green text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-green-light transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDeny(change)}
                            className="bg-black/10 text-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-black/20 transition-colors"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleApproveAll}
                    className="w-full bg-green text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-green-light transition-colors"
                  >
                    Approve All ({changes.length})
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
