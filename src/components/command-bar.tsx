'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from './user-provider'

interface InterpretedCommand {
  type: 'query' | 'mutation' | 'answer'
  confirmation: string
  operations?: unknown[]
  answer?: string
}

// Minimal Web Speech API typing
interface SR {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: { resultIndex: number; results: { [i: number]: { transcript: string }; isFinal: boolean; length: number }[] & { length: number } }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

// Very small markdown renderer — handles **bold**, *italics*, bullet lines, and newlines.
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const trimmed = line.replace(/^\s*[-•]\s*/, '')
    const isBullet = /^\s*[-•]\s+/.test(line)
    const html = trimmed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
    if (isBullet) {
      return <li key={i} className="ml-5 list-disc" dangerouslySetInnerHTML={{ __html: html }} />
    }
    if (!trimmed.trim()) return <br key={i} />
    return <p key={i} className="mt-2 first:mt-0" dangerouslySetInnerHTML={{ __html: html }} />
  })
}

export function CommandBar() {
  const { displayName } = useUser()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [interpreted, setInterpreted] = useState<InterpretedCommand | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<{ command: string; result: string }[]>([])
  const [answerModal, setAnswerModal] = useState<{ command: string; answer: string } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Speech-to-text
  const [sttSupported, setSttSupported] = useState(false)
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<SR | null>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
    if (w.SpeechRecognition || w.webkitSpeechRecognition) setSttSupported(true)
  }, [])

  const startRecording = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      let finalAdd = ''
      let interimBuf = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i] as { [k: number]: { transcript: string }; isFinal: boolean }
        if (r.isFinal) finalAdd += r[0].transcript
        else interimBuf += r[0].transcript
      }
      if (finalAdd) {
        setInput((prev) => {
          const sep = !prev || prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' '
          return prev + sep + finalAdd.trim()
        })
      }
      setInterim(interimBuf)
    }
    rec.onerror = (e) => {
      if (e?.error === 'not-allowed') setError('Microphone permission denied.')
      setRecording(false)
      setInterim('')
    }
    rec.onend = () => { setRecording(false); setInterim('') }
    recognitionRef.current = rec
    rec.start()
    setRecording(true)
    setError(null)
  }

  const toggleMic = () => {
    if (recording) recognitionRef.current?.stop()
    else startRecording()
  }

  const handleInterpret = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    setInterpreted(null)

    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: input.trim(), userName: displayName }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else if (data.interpreted) {
        setInterpreted(data.interpreted)
        // Auto-execute pure queries and answers (safe, read-only)
        if (data.interpreted.type === 'query' || data.interpreted.type === 'answer') {
          handleExecute(data.interpreted)
        }
      }
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  const handleExecute = async (cmd?: InterpretedCommand) => {
    void cmd
    setLoading(true)
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: input.trim(), userName: displayName, execute: true }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        const currentCommand = input.trim()
        const resultLines = Array.isArray(data.results) ? data.results.filter(Boolean) : []
        // If this was a query/answer, show the full answer in a centered modal.
        if (data.answer) {
          setAnswerModal({ command: currentCommand, answer: data.answer })
          setHistory((prev) => [{ command: currentCommand, result: 'View answer' }, ...prev].slice(0, 10))
        } else {
          const msg = resultLines.length > 0 ? resultLines.join(' · ') : (data.confirmation || 'Done')
          setHistory((prev) => [{ command: currentCommand, result: msg }, ...prev].slice(0, 10))
          // Brief green ✓ flash that clears itself so the panel is ready for the next command
          setResult('Done')
          setTimeout(() => setResult((cur) => (cur === 'Done' ? null : cur)), 2000)
        }
        setInterpreted(null)
        setInput('')
        // Tell open task views to refresh (matches the Quick Add + Notion paths)
        window.dispatchEvent(new CustomEvent('master-tasks-changed'))
      }
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  const handleCancel = () => {
    setInterpreted(null)
    setError(null)
    setResult(null)
  }

  const handleClose = () => {
    if (recording) recognitionRef.current?.stop()
    setOpen(false)
    setInput('')
    setInterpreted(null)
    setResult(null)
    setError(null)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-purple-dark text-white px-4 py-3 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        AI Command
      </button>

      {/* Answer modal — centered, for query/answer responses */}
      {answerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40" onClick={() => setAnswerModal(null)}>
          <div className="w-full max-w-2xl bg-white border-2 border-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-purple-dark text-white px-6 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">You asked</p>
                <p className="text-sm font-bold mt-1 leading-snug">{answerModal.command}</p>
              </div>
              <button onClick={() => setAnswerModal(null)} className="text-white/80 hover:text-white text-xl font-bold shrink-0" aria-label="Close">&times;</button>
            </div>
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto text-sm leading-relaxed text-black">
              {renderMarkdown(answerModal.answer)}
            </div>
            <div className="border-t-2 border-black/10 px-6 py-3 flex items-center justify-end">
              <button
                onClick={() => setAnswerModal(null)}
                className="bg-black text-white px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6" onClick={handleClose}>
          <div
            className="w-full max-w-2xl bg-white border-2 border-black shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-purple-dark text-white px-5 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest">AI Command</h3>
                <p className="text-[10px] uppercase tracking-widest text-white/60 mt-0.5">
                  Create tasks, ping teammates, update fields — natural language
                </p>
              </div>
              <button onClick={handleClose} className="text-white/60 hover:text-white text-lg shrink-0">&times;</button>
            </div>

            {/* Examples hint */}
            {!history.length && !interpreted && !result && !error && (
              <div className="px-5 py-3 bg-cream-dark/30 border-b border-black/10 text-[11px] leading-relaxed text-black/70">
                <p className="font-bold uppercase tracking-widest text-[9px] text-muted mb-1.5">Try</p>
                <ul className="space-y-1">
                  <li>&middot; &ldquo;Send a slack to Cody telling him to review the partnership doc&rdquo;</li>
                  <li>&middot; &ldquo;Add a new task to Boulder Roots re final sponsor outreach, assign Sabrina, due Friday&rdquo;</li>
                  <li>&middot; &ldquo;Mark the RMP logo concepts task as done&rdquo;</li>
                  <li>&middot; &ldquo;How many open tasks does Bryan have?&rdquo;</li>
                </ul>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="max-h-32 overflow-y-auto border-b-2 border-black/10 bg-cream-dark/20">
                <div className="flex items-center justify-between px-5 py-1.5 border-b border-black/10 bg-cream-dark/40">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted">History</span>
                  <button
                    onClick={() => setHistory([])}
                    className="text-[9px] font-bold uppercase tracking-widest text-muted hover:text-red"
                  >
                    Clear
                  </button>
                </div>
                {history.map((h, i) => (
                  <div key={i} className="px-5 py-2 border-b border-black/5">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider truncate">{h.command}</p>
                    <p className="text-xs mt-0.5">{h.result}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Result / Error / Confirmation */}
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="px-5 py-3 bg-red/10 text-red text-xs font-bold">
                  {error}
                </div>
              )}

              {result && !interpreted && (
                <div className="px-5 py-3 bg-green/10 text-green text-xs font-bold flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green text-white text-[10px]">&#10003;</span>
                  <span>{result}</span>
                </div>
              )}

              {interpreted && interpreted.type === 'mutation' && (
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Confirm action</p>
                  <p className="text-sm font-bold mb-4">{interpreted.confirmation}</p>
                  {interpreted.operations && interpreted.operations.length > 0 && (
                    <details className="mb-4">
                      <summary className="text-[10px] font-bold uppercase tracking-widest text-muted cursor-pointer hover:text-black">
                        {interpreted.operations.length} operation{interpreted.operations.length === 1 ? '' : 's'} — show details
                      </summary>
                      <pre className="mt-2 text-[10px] text-muted whitespace-pre-wrap bg-cream-dark/30 p-2 max-h-40 overflow-auto">
                        {JSON.stringify(interpreted.operations, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExecute()}
                      disabled={loading}
                      className="bg-green text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      {loading ? 'Executing...' : 'Execute'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="text-xs font-bold uppercase tracking-widest text-muted hover:text-black px-4 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t-2 border-black/10 px-4 py-3">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleInterpret() }
                    if (e.key === 'Escape') handleClose()
                  }}
                  placeholder="Type or dictate… ⌘↵ to process"
                  rows={3}
                  className="w-full border-2 border-black/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-purple-dark resize-y"
                  disabled={loading}
                />
                {recording && interim && (
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-white text-[11px] px-3 py-1.5 italic pointer-events-none">
                    {interim}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {sttSupported && (
                  <button
                    onClick={toggleMic}
                    type="button"
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-2 transition-colors ${
                      recording ? 'bg-red text-white animate-pulse' : 'bg-white border-2 border-black/20 hover:border-black text-black'
                    }`}
                    title={recording ? 'Stop recording' : 'Dictate'}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${recording ? 'bg-white' : 'bg-red'}`} />
                    {recording ? 'Stop' : 'Dictate'}
                  </button>
                )}
                <button
                  onClick={handleInterpret}
                  disabled={!input.trim() || loading}
                  className="ml-auto bg-purple-dark text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {loading ? 'Processing…' : 'Process'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
