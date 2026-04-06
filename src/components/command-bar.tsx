'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from './user-provider'

interface InterpretedCommand {
  type: 'query' | 'mutation' | 'answer'
  confirmation: string
  operations?: unknown[]
  answer?: string
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

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
        // Auto-execute queries and answers
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
        const msg = data.answer || data.confirmation || 'Done'
        setResult(msg)
        setHistory(prev => [{ command: input.trim(), result: msg }, ...prev].slice(0, 10))
        setInterpreted(null)
        setInput('')
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

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6" onClick={handleClose}>
          <div
            className="w-full max-w-md bg-white border-2 border-black shadow-2xl flex flex-col max-h-[70vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-purple-dark text-white px-5 py-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest">AI Command</h3>
              <button onClick={handleClose} className="text-white/60 hover:text-white text-lg">&times;</button>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="max-h-40 overflow-y-auto border-b-2 border-black/10">
                {history.map((h, i) => (
                  <div key={i} className="px-5 py-2.5 border-b border-black/5">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{h.command}</p>
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
                <div className="px-5 py-3 bg-green/10 text-green text-xs font-bold">
                  {result}
                </div>
              )}

              {interpreted && interpreted.type === 'mutation' && (
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Confirm Action</p>
                  <p className="text-sm font-bold mb-4">{interpreted.confirmation}</p>
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
            <div className="border-t-2 border-black/10 px-4 py-3 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleInterpret(); if (e.key === 'Escape') handleClose() }}
                placeholder="Type a command..."
                className="flex-1 border-2 border-black/20 bg-white px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-dark"
                disabled={loading}
              />
              <button
                onClick={handleInterpret}
                disabled={!input.trim() || loading}
                className="bg-purple-dark text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {loading ? '...' : 'Go'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
