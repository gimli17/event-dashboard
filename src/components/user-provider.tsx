'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface UserContextValue {
  displayName: string | null
  setDisplayName: (name: string) => void
}

const UserContext = createContext<UserContextValue>({
  displayName: null,
  setDisplayName: () => {},
})

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayNameState] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('brmf_display_name')
    if (stored) {
      setDisplayNameState(stored)
    } else {
      setShowModal(true)
    }
    setLoaded(true)
  }, [])

  const setDisplayName = useCallback((name: string) => {
    localStorage.setItem('brmf_display_name', name)
    setDisplayNameState(name)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (trimmed) {
      setDisplayName(trimmed)
      setShowModal(false)
    }
  }

  if (!loaded) return null

  return (
    <UserContext.Provider value={{ displayName, setDisplayName }}>
      {children}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div
            className="w-full max-w-md mx-4 border-4 border-black bg-cream p-8"
            style={{ fontFamily: 'var(--font-body), DM Sans, Arial, sans-serif' }}
          >
            <h2 className="text-2xl font-bold uppercase tracking-wide text-black mb-2">
              Welcome to BRMF 2026
            </h2>
            <p className="text-sm uppercase tracking-wider text-muted mb-6 font-medium">
              Enter your name to join the chat
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="YOUR NAME"
                autoFocus
                className="w-full border-3 border-black bg-white px-4 py-3 text-sm font-bold uppercase tracking-wider text-black placeholder:text-muted/50 focus:outline-none focus:border-blue"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="mt-4 w-full bg-black text-cream py-3 px-6 text-sm font-bold uppercase tracking-widest hover:bg-blue transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enter
              </button>
            </form>
          </div>
        </div>
      )}
    </UserContext.Provider>
  )
}
