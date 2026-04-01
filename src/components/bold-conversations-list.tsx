'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'

interface Topic {
  id: string
  session_id: string | null
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

const trackSubtitles: Record<string, string> = {
  health: 'Performance, Energy, and Personal Mastery',
  culture: "Building Boulder's Next Chapter",
  tech: 'Innovation, Collaboration, and the Colorado Edge',
}

const trackOrder = ['health', 'culture', 'tech']

export function BoldConversationsList() {
  const { displayName } = useUser()
  const [topics, setTopics] = useState<Topic[]>([])
  const [selections, setSelections] = useState<Selection[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      const [topicsRes, selectionsRes] = await Promise.all([
        supabase.from('bc_topics').select('*'),
        supabase.from('bc_selections').select('*'),
      ])
      if (topicsRes.data) setTopics(topicsRes.data as Topic[])
      if (selectionsRes.data) setSelections(selectionsRes.data as Selection[])
      setLoading(false)
    }
    fetch()
  }, [])

  const handleToggleInterest = async (topicId: string) => {
    if (!displayName) return

    const existing = selections.find(
      (s) => s.topic_id === topicId && s.founder_name === displayName
    )

    if (existing) {
      setSelections((prev) => prev.filter((s) => s.id !== existing.id))
      await supabase.from('bc_selections').delete().eq('id', existing.id)
    } else {
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-muted uppercase tracking-widest text-xs font-bold">Loading topics...</p>
      </div>
    )
  }

  // Group by track
  const grouped: Record<string, Topic[]> = {}
  for (const topic of topics) {
    if (!grouped[topic.track]) grouped[topic.track] = []
    grouped[topic.track].push(topic)
  }

  // Sort topics within each track by interest count (most popular first)
  for (const track of Object.keys(grouped)) {
    grouped[track].sort((a, b) => {
      const aCount = selections.filter((s) => s.topic_id === a.id).length
      const bCount = selections.filter((s) => s.topic_id === b.id).length
      return bCount - aCount
    })
  }

  const totalInterest = selections.length
  const topicsWithInterest = topics.filter(
    (t) => selections.some((s) => s.topic_id === t.id)
  ).length

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Stats */}
      <div className="flex items-center gap-8 mb-8 flex-wrap">
        <div>
          <p className="text-3xl font-bold">{topics.length}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Topics</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green">{totalInterest}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Interest Signals</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-blue">{topicsWithInterest}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Topics With Interest</p>
        </div>
      </div>

      <p className="text-xs text-muted mb-8 max-w-xl">
        Topics have not yet been assigned to sessions. Founders can indicate interest in as many topics as they like. Interest counts will help determine which topics make it into the final schedule.
      </p>

      {/* Topics by track */}
      <div className="space-y-10">
        {trackOrder
          .filter((track) => grouped[track])
          .map((track) => (
            <div key={track}>
              <div className={`${trackColors[track]} text-white px-6 py-4`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold tracking-widest uppercase">
                    {trackLabels[track]}
                  </h2>
                  <span className="text-xs font-bold tracking-wider opacity-70">
                    {grouped[track].length} TOPICS
                  </span>
                </div>
                <p className="text-xs font-medium text-white/60 mt-1 italic">
                  {trackSubtitles[track]}
                </p>
              </div>

              <div className="border-l-2 border-r-2 border-b-2 border-black/10">
                {grouped[track].map((topic, i) => {
                  const interestCount = selections.filter((s) => s.topic_id === topic.id).length
                  const isInterested = selections.some(
                    (s) => s.topic_id === topic.id && s.founder_name === displayName
                  )
                  const isExpanded = expandedTopic === topic.id
                  const topicSelections = selections.filter((s) => s.topic_id === topic.id)

                  return (
                    <div
                      key={topic.id}
                      className={`${i > 0 ? 'border-t border-black/5' : ''}`}
                    >
                      <div className="px-5 py-4 flex items-start gap-4">
                        {/* Interest count */}
                        <div className="shrink-0 w-12 text-center pt-0.5">
                          <p className={`text-2xl font-bold ${interestCount > 0 ? 'text-black' : 'text-muted/30'}`}>
                            {interestCount}
                          </p>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-muted">
                            {interestCount === 1 ? 'vote' : 'votes'}
                          </p>
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
                            {topic.session_id && (
                              <span className="text-[10px] font-bold text-green uppercase tracking-wider">
                                Assigned to session
                              </span>
                            )}
                          </div>

                          {/* Founder list */}
                          {interestCount > 0 && (
                            <button
                              onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                              className="mt-2 text-[10px] font-bold text-blue uppercase tracking-widest hover:text-red transition-colors"
                            >
                              {isExpanded ? 'Hide' : 'Show'} {interestCount} interested
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

                        {/* Interest button */}
                        <button
                          onClick={() => handleToggleInterest(topic.id)}
                          disabled={!displayName}
                          className={`shrink-0 px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            isInterested
                              ? 'bg-green text-white hover:bg-red'
                              : 'bg-black/5 text-muted hover:bg-black/10'
                          }`}
                        >
                          {isInterested ? 'INTERESTED' : 'I\'M IN'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
