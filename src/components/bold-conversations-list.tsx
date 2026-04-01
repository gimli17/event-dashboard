'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'

interface Topic {
  id: string
  session_id: string
  track: string
  title: string
  description: string | null
  facilitator: string | null
  expert_guest: string | null
  capacity: number
}

interface Selection {
  id: string
  topic_id: string
  founder_name: string
}

const sessionLabels: Record<string, string> = {
  'wed-bold-s1': 'WEDNESDAY SESSION 1 — 12:30–2:00 PM',
  'wed-bold-s2': 'WEDNESDAY SESSION 2 — 2:45–4:15 PM',
  'thu-bold-s3': 'THURSDAY SESSION 3 — 1:00–2:30 PM',
  'thu-bold-s4': 'THURSDAY SESSION 4 — 3:15–4:45 PM',
}

const sessionOrder = ['wed-bold-s1', 'wed-bold-s2', 'thu-bold-s3', 'thu-bold-s4']

const trackColors: Record<string, string> = {
  health: 'bg-green',
  culture: 'bg-blue',
  tech: 'bg-orange',
}

const trackLabels: Record<string, string> = {
  health: 'Health & Well-Being',
  culture: 'Culture & Community',
  tech: 'Tech & Innovation',
}

const sessionDayColors: Record<string, string> = {
  'wed-bold-s1': 'bg-green',
  'wed-bold-s2': 'bg-green',
  'thu-bold-s3': 'bg-red',
  'thu-bold-s4': 'bg-red',
}

export function BoldConversationsList() {
  const { displayName } = useUser()
  const [topics, setTopics] = useState<Topic[]>([])
  const [selections, setSelections] = useState<Selection[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      const [topicsRes, selectionsRes] = await Promise.all([
        supabase.from('bc_topics').select('*').order('session_id'),
        supabase.from('bc_selections').select('*'),
      ])
      if (topicsRes.data) setTopics(topicsRes.data as Topic[])
      if (selectionsRes.data) setSelections(selectionsRes.data as Selection[])
      setLoading(false)
    }
    fetch()
  }, [])

  const handleSelect = async (topicId: string) => {
    if (!displayName) return

    const existing = selections.find(
      (s) => s.topic_id === topicId && s.founder_name === displayName
    )

    if (existing) {
      // Remove selection
      setSelections((prev) => prev.filter((s) => s.id !== existing.id))
      await supabase.from('bc_selections').delete().eq('id', existing.id)
    } else {
      // Check capacity
      const topicSelections = selections.filter((s) => s.topic_id === topicId)
      const topic = topics.find((t) => t.id === topicId)
      if (topic && topicSelections.length >= topic.capacity) return

      // Remove any other selection in the same session
      const thisTopic = topics.find((t) => t.id === topicId)
      if (thisTopic) {
        const sameSessionTopics = topics.filter((t) => t.session_id === thisTopic.session_id).map((t) => t.id)
        const conflicting = selections.find(
          (s) => sameSessionTopics.includes(s.topic_id) && s.founder_name === displayName
        )
        if (conflicting) {
          setSelections((prev) => prev.filter((s) => s.id !== conflicting.id))
          await supabase.from('bc_selections').delete().eq('id', conflicting.id)
        }
      }

      // Add selection
      const { data } = await supabase
        .from('bc_selections')
        .insert({ topic_id: topicId, founder_name: displayName } as never)
        .select()
        .single()

      if (data) {
        setSelections((prev) => [...prev, data as Selection])
      }
    }
  }

  // Stats
  const totalSlots = topics.reduce((sum, t) => sum + t.capacity, 0)
  const totalFilled = selections.length

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-muted uppercase tracking-widest text-xs font-bold">Loading topics...</p>
      </div>
    )
  }

  // Group topics by session
  const grouped: Record<string, Topic[]> = {}
  for (const topic of topics) {
    if (!grouped[topic.session_id]) grouped[topic.session_id] = []
    grouped[topic.session_id].push(topic)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Stats */}
      <div className="flex items-center gap-8 mb-8 flex-wrap">
        <div>
          <p className="text-3xl font-bold">{topics.length}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Topics</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green">{totalFilled}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Seats Taken</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-red">{totalSlots - totalFilled}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Seats Available</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        {Object.entries(trackLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 ${trackColors[key]}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Sessions */}
      <div className="space-y-10">
        {sessionOrder
          .filter((sid) => grouped[sid])
          .map((sessionId) => {
            const sessionTopics = grouped[sessionId]

            return (
              <div key={sessionId}>
                <div className={`${sessionDayColors[sessionId]} text-white px-6 py-4`}>
                  <h2 className="text-sm font-bold tracking-widest uppercase">
                    {sessionLabels[sessionId]}
                  </h2>
                </div>

                <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                  {sessionTopics.map((topic, i) => {
                    const topicSelections = selections.filter((s) => s.topic_id === topic.id)
                    const isFull = topicSelections.length >= topic.capacity
                    const isSelected = topicSelections.some((s) => s.founder_name === displayName)
                    const isExpanded = expandedTopic === topic.id

                    return (
                      <div
                        key={topic.id}
                        className={`${i > 0 ? 'border-t border-black/5' : ''}`}
                      >
                        <div className="px-5 py-4 flex items-start gap-4">
                          {/* Track badge */}
                          <div className={`${trackColors[topic.track]} text-white px-2 py-1 text-[9px] font-bold tracking-widest uppercase shrink-0 w-16 text-center`}>
                            {topic.track === 'health' ? 'HEALTH' : topic.track === 'culture' ? 'CULTURE' : 'TECH'}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold">{topic.title}</h3>
                            {topic.description && (
                              <p className="text-xs text-muted mt-1">{topic.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {topic.facilitator && (
                                <span className="text-[10px] font-bold text-blue uppercase tracking-wider">
                                  Facilitator: {topic.facilitator}
                                </span>
                              )}
                              {topic.expert_guest && (
                                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                                  Guest: {topic.expert_guest}
                                </span>
                              )}
                            </div>

                            {/* Founder list toggle */}
                            {topicSelections.length > 0 && (
                              <button
                                onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                                className="mt-2 text-[10px] font-bold text-blue uppercase tracking-widest hover:text-red transition-colors"
                              >
                                {isExpanded ? 'Hide' : 'Show'} {topicSelections.length} founder{topicSelections.length !== 1 ? 's' : ''}
                              </button>
                            )}

                            {isExpanded && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {topicSelections.map((s) => (
                                  <span
                                    key={s.id}
                                    className="text-[10px] font-bold uppercase tracking-wider bg-blue/10 text-blue px-2 py-0.5"
                                  >
                                    {s.founder_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Seats + select */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-bold ${isFull ? 'text-red' : 'text-muted'}`}>
                              {topicSelections.length}/{topic.capacity}
                            </span>
                            <button
                              onClick={() => handleSelect(topic.id)}
                              disabled={!displayName || (isFull && !isSelected)}
                              className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                isSelected
                                  ? 'bg-green text-white hover:bg-red'
                                  : 'bg-black/5 text-muted hover:bg-black/10'
                              }`}
                            >
                              {isSelected ? 'JOINED' : isFull ? 'FULL' : 'JOIN'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
