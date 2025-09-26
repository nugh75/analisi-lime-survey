import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type ProjectContextType = {
  projectId: string | null
  projectName: string | null
  setProject: (id: string | null, name: string | null) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(() => {
    const stored = localStorage.getItem('projectId')
    if (!stored || stored === 'default') return null
    return stored
  })
  const [projectName, setProjectName] = useState<string | null>(() => {
    return localStorage.getItem('projectName') || null
  })

  const setProject = (id: string | null, name: string | null) => {
    const normalizedId = id && id !== 'default' ? id : null
    setProjectId(normalizedId)
    setProjectName(name)
    if (normalizedId) {
      localStorage.setItem('projectId', normalizedId)
    } else {
      localStorage.removeItem('projectId')
    }
    if (name) {
      localStorage.setItem('projectName', name)
    } else {
      localStorage.removeItem('projectName')
    }
  }

  return (
    <ProjectContext.Provider value={{ projectId, projectName, setProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}
