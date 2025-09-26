import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Upload, FileText, List, Plus, Shield, Home } from 'lucide-react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../services/api'
import { useProject } from '../context/ProjectContext'
import { useMode } from '../context/ModeContext'
import type { ProjectInfo } from '../types/api'

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { projectId, projectName, setProject } = useProject()
  const { mode, setMode } = useMode()
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [selectedId, setSelectedId] = useState<string>('')

  const isActive = (path: string) => location.pathname === path

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/projects`)
        let list: ProjectInfo[] = res.data.projects || []
        setProjects(list)
        // Sync stored project by id if present
        if (projectId) {
          const foundById = list.find((p) => p.id === projectId)
          if (foundById) setProject(foundById.id, foundById.name)
        }
        // If we have only a name stored and it doesn't exist on server, create it
        if (!projectId && projectName) {
          const foundByName = list.find((p) => p.name === projectName)
          if (foundByName) {
            setProject(foundByName.id, foundByName.name)
          } else {
            try {
              const created = await axios.post(`${API_BASE_URL}/projects`, { name: projectName })
              const p = { id: created.data.id, name: created.data.name }
              setProject(p.id, p.name)
              list = [...list, p]
              setProjects(list)
            } catch (e) {
              console.warn('Auto-create project failed', e)
            }
          }
        }
      } catch (e) {
        console.warn('Load projects failed', e)
      }
    }
    load()
  }, [projectId, projectName, setProject])

  // Keep local select value in sync with context
  useEffect(() => {
    setSelectedId(projectId || '')
  }, [projectId])

  const createProject = async () => {
    const name = window.prompt('Nome del progetto (opzionale):', '') || ''
    try {
      const res = await axios.post(`${API_BASE_URL}/projects`, { name })
      const p = { id: res.data.id, name: res.data.name }
      setProjects(prev => [...prev, p])
      setProject(p.id, p.name)
    } catch (e) {
      console.warn('Create project failed', e)
    }
  }

  const requestAdminAccess = () => {
    if (mode === 'edit') return
    const pwd = window.prompt('Password amministratore:')
    if (pwd === null) return
    if (pwd.trim() !== 'Prin') {
      window.alert('Password errata')
      return
    }
    setMode('edit')
  }

  const exitAdmin = () => {
    if (mode !== 'edit') return
    setMode('view')
    navigate('/results')
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Analisi Questionari</h1>
            </div>
            <Link
              to="/projects"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive('/projects')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Lista progetti</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Project selector */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedId ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null
                  const name = id ? (projects.find(p => p.id === id)?.name || null) : null
                  setSelectedId(e.target.value)
                  setProject(id, name)
                  if (mode === 'view') navigate('/results')
                }}
                className="text-base py-2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                disabled={projects.length === 0}
              >
                <option value="">{projects.length ? 'Seleziona un progetto' : 'Nessun progetto disponibile'}</option>
                {/* Ensure current selection is visible even if not in list */}
                {projectId && !projects.some(p => p.id === projectId) && (
                  <option value={projectId}>{projectName || projectId}</option>
                )}
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {mode !== 'view' && (
                <button onClick={createProject} className="btn-secondary py-1 px-2">
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            {projectId && (
              <div className="hidden md:block text-sm text-gray-600 self-center">
                Progetto: <span className="font-medium">{projectName}</span>
              </div>
            )}

            {mode !== 'view' && (
              <Link
                to="/"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive('/') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Upload className="h-4 w-4" />
                <span>Caricamento</span>
              </Link>
            )}
            
            {mode !== 'view' && (
              <Link
                to="/dashboard"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive('/dashboard') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            )}

            <Link
              to="/questions"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive('/questions') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Domande</span>
            </Link>

            <Link
              to="/results"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive('/results') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Risultati</span>
            </Link>

            <div className="flex items-center space-x-2 ml-6">
              <button
                onClick={mode === 'edit' ? exitAdmin : requestAdminAccess}
                className={`btn-secondary py-1 px-3 flex items-center gap-2 ${mode === 'edit' ? 'border-green-300 text-green-700 hover:bg-green-50' : ''}`}
              >
                <Shield className="h-4 w-4" />
                {mode === 'edit' ? 'Admin attivo' : 'Admin'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
