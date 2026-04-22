'use client'

import { useState } from 'react'
import { Navbar } from '@/components/navbar'
import { BackLink } from '@/components/back-link'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { useUser } from '@/components/user-provider'

interface ParsedOperation {
  action: string
  table: string
  filters?: Record<string, unknown>
  filterType?: string
  updates?: Record<string, unknown>
  insertData?: Record<string, unknown>
  select?: string
}

interface InterpretedResult {
  type: 'query' | 'mutation' | 'answer'
  confirmation?: string
  operations?: ParsedOperation[]
  answer?: string
}

export default function BrainDumpPage() {
  const { displayName } = useUser()
  const [text, setText] = useState('')
  const [interpreted, setInterpreted] = useState<InterpretedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])

  const handleProcess = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setInterpreted(null)
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: text.trim(), userName: displayName, execute: false }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else if (data.interpreted) {
        setInterpreted(data.interpreted as InterpretedResult)
      } else {
        setError('No interpretation returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!text.trim()) return
    setApplying(true)
    setError(null)
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: text.trim(), userName: displayName, execute: true }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setLog((prev) => [`${new Date().toLocaleTimeString()} — applied: ${interpreted?.confirmation ?? '(done)'}`, ...prev])
        setText('')
        setInterpreted(null)
        // Tell open task/team views to refresh
        window.dispatchEvent(new CustomEvent('master-tasks-changed'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <Navbar />

      <section className="bg-black text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">Brain Dump</h1>
              <p className="text-xs text-white/60 mt-1">Write freely. Claude parses it into task/milestone/note changes you can review before applying.</p>
            </div>
          </div>
          <SidebarButtons />
        </div>
      </section>

      <section className="bg-cream flex-1">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-2">
              What&apos;s on your mind?
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Example: 'Reassign the sponsor funnel task from Dan to Sabrina. Create a new task for Cody to pressure-test the LLC structure due Friday. Mark the logo concepts task as done.'"
              rows={10}
              className="w-full border-2 border-black bg-white px-4 py-3 text-sm leading-relaxed text-black focus:outline-none focus:border-blue resize-y"
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleProcess}
                disabled={!text.trim() || loading}
                className="bg-black text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-black/80 disabled:opacity-40 transition-colors"
              >
                {loading ? 'Processing\u2026' : 'Process'}
              </button>
              <button
                onClick={() => { setText(''); setInterpreted(null); setError(null) }}
                className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-black"
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div className="border-2 border-red bg-red/10 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-red mb-1">Error</p>
              <p className="text-sm text-black/80">{error}</p>
            </div>
          )}

          {interpreted && (
            <div className="border-2 border-blue bg-white">
              <div className="bg-blue text-white px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Preview &middot; {interpreted.type}</p>
                <p className="text-sm font-bold mt-1">{interpreted.confirmation || 'No description returned'}</p>
              </div>

              {interpreted.type === 'answer' && interpreted.answer && (
                <div className="px-5 py-4">
                  <p className="text-sm leading-relaxed text-black/80 whitespace-pre-wrap">{interpreted.answer}</p>
                </div>
              )}

              {interpreted.operations && interpreted.operations.length > 0 && (
                <div className="px-5 py-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Planned operations</p>
                  <ol className="space-y-2 list-decimal list-inside">
                    {interpreted.operations.map((op, i) => (
                      <li key={i} className="text-sm text-black/80">
                        <span className="font-bold uppercase tracking-wider text-[11px]">{op.action}</span>
                        <span className="text-muted"> on </span>
                        <span className="font-mono text-[11px]">{op.table}</span>
                        {op.filters && Object.keys(op.filters).length > 0 && (
                          <div className="ml-6 text-[11px] text-muted mt-0.5">
                            where {Object.entries(op.filters).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')}
                          </div>
                        )}
                        {op.updates && Object.keys(op.updates).length > 0 && (
                          <div className="ml-6 text-[11px] text-muted mt-0.5">
                            set {Object.entries(op.updates).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')}
                          </div>
                        )}
                        {op.insertData && Object.keys(op.insertData).length > 0 && (
                          <div className="ml-6 text-[11px] text-muted mt-0.5">
                            values {Object.entries(op.insertData).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {interpreted.type !== 'answer' && interpreted.operations && interpreted.operations.length > 0 && (
                <div className="px-5 py-3 border-t-2 border-black/10 flex items-center gap-2">
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="bg-green text-white px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-green/80 disabled:opacity-40 transition-colors"
                  >
                    {applying ? 'Applying\u2026' : 'Apply'}
                  </button>
                  <button
                    onClick={() => setInterpreted(null)}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-black"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {log.length > 0 && (
            <div className="border-2 border-black/10 bg-white">
              <div className="bg-cream-dark/60 px-5 py-3 border-b border-black/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-black">Recent</p>
              </div>
              <div className="px-5 py-3 space-y-1">
                {log.map((entry, i) => (
                  <p key={i} className="text-xs text-black/70 font-mono">{entry}</p>
                ))}
              </div>
            </div>
          )}

          <div className="border border-black/10 bg-cream-dark/30 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">How it works</p>
            <ul className="text-[12px] text-black/70 leading-relaxed space-y-1">
              <li>&middot; Type anything — one line or a paragraph. Use natural language.</li>
              <li>&middot; Click <strong>Process</strong> to preview the operations Claude wants to perform.</li>
              <li>&middot; Click <strong>Apply</strong> to actually execute them. Nothing hits the DB until you approve.</li>
              <li>&middot; Can create/update/delete tasks, milestones, events, and board notes.</li>
              <li>&middot; Task views open elsewhere will refresh automatically after you apply.</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">Caruso Ventures &middot; 2026</p>
      </footer>
    </>
  )
}
