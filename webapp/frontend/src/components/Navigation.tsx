import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Upload, FileText, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useProject } from '../context/ProjectContext'

export default function Navigation() {
  const location = useLocation()
  const { projectId, setProjectId } = useProject()
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])

  const isActive = (path: string) => location.pathname === path

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('http://localhost:8000/projects')
        setProjects(res.data.projects || [])
      } catch {}
    }
    load()
  }, [])

  const createProject = async () => {
    try {
      const res = await axios.post('http://localhost:8000/projects', { name: '' })
      const p = { id: res.data.id, name: res.data.name }
      setProjects(prev => [...prev, p])
      setProjectId(p.id)
    } catch (e) {
      // ignore
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Survey Analyzer</h1>
          </div>
          
          <div className="flex space-x-4">
            {/* Project selector */}
            <div className="flex items-center space-x-2">
              <select
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value || null)}
                className="text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Default</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={createProject} className="btn-secondary py-1 px-2">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Link
              to="/"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive('/') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Link>
            
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
            
            <Link
              to="/results"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive('/results') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Results</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
