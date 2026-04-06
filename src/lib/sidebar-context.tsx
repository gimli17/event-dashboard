'use client'

import { createContext, useContext, useState, useCallback } from 'react'

export type SidebarTab = 'chat' | 'add-task' | 'add-event' | 'add-milestone' | 'pending'

interface SidebarState {
  isOpen: boolean
  eventFilter: string | null
  tab: SidebarTab
}

interface SidebarContextValue extends SidebarState {
  openSidebar: () => void
  closeSidebar: () => void
  openForEvent: (eventId: string) => void
  setTab: (tab: SidebarTab) => void
  setEventFilter: (eventId: string | null) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SidebarState>({
    isOpen: false,
    eventFilter: null,
    tab: 'chat',
  })

  const openSidebar = useCallback(() => {
    setState((s) => ({ ...s, isOpen: true }))
  }, [])

  const closeSidebar = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }))
  }, [])

  const openForEvent = useCallback((eventId: string) => {
    setState({ isOpen: true, eventFilter: eventId, tab: 'chat' })
  }, [])

  const setTab = useCallback((tab: SidebarTab) => {
    setState((s) => ({ ...s, tab }))
  }, [])

  const setEventFilter = useCallback((eventId: string | null) => {
    setState((s) => ({ ...s, eventFilter: eventId }))
  }, [])

  return (
    <SidebarContext.Provider
      value={{ ...state, openSidebar, closeSidebar, openForEvent, setTab, setEventFilter }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
