'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

const actionColors: Record<string, string> = {
  created: 'text-green',
  completed: 'text-green',
  updated: 'text-blue',
  assigned: 'text-purple',
  reviewed: 'text-purple',
  deleted: 'text-red',
  submitted: 'text-orange',
  posted: 'text-gold',
}

const teamMembers = ['All', 'Dan', 'Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

export function ActivityLog() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPerson, setFilterPerson] = useState('All')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    async function fetch() {
      // Fetch from activity_log
      let query = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200)

      const { data } = await query
      if (data) setEntries(data as LogEntry[])
      setLoading(false)
    }
    fetch()
  }, [])

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

                  return (
                    <div key={entry.id} className="flex items-start gap-3 py-2">
                      {/* Timeline dot */}
                      <div className={`w-2 h-2 rounded-full mt-1.5 -ml-[21px] ${color.replace('text-', 'bg-')}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-bold">{entry.actor}</span>
                          <span className={`text-sm ${color}`}>{entry.action}</span>
                          {entry.target_title && (
                            <span className="text-sm font-bold">{entry.target_title}</span>
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
