import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type AppMode = 'edit' | 'view'

interface ModeContextType {
  mode: AppMode
  setMode: (m: AppMode) => void
}

const ModeContext = createContext<ModeContextType | undefined>(undefined)

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem('appMode') as AppMode | null
    return saved || 'edit'
  })

  const update = (m: AppMode) => {
    setMode(m)
    localStorage.setItem('appMode', m)
  }

  return (
    <ModeContext.Provider value={{ mode, setMode: update }}>
      {children}
    </ModeContext.Provider>
  )
}

export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
