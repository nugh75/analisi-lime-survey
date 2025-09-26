import { useEffect, useState, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import FileUpload from './components/FileUpload'
import Dashboard from './components/Dashboard'
import AnalysisResults from './components/AnalysisResults'
import QuestionExplorer from './components/QuestionExplorer'
import Navigation from './components/Navigation'
import ErrorBoundary from './components/ErrorBoundary'
import ProjectsOverview from './components/ProjectsOverview'
import { useProject } from './context/ProjectContext'
import { useMode } from './context/ModeContext'
import axios from 'axios'
import { API_BASE_URL } from './services/api'
import type { DatasetSummary, ProjectInfo } from './types/api'

type ProjectCacheEntry = {
  files: string[]
  merged: string | null
  dataset: DatasetSummary | null
  fetchedAt: number
}

function App() {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [mergedFile, setMergedFile] = useState<string | null>(null)
  const [dataset, setDataset] = useState<DatasetSummary | null>(null)
  const [projectLoading, setProjectLoading] = useState(false)
  const [datasetLoading, setDatasetLoading] = useState(false)
  const { projectId, projectName, setProject } = useProject()
  const { mode } = useMode()
  const projectCache = useRef<Record<string, ProjectCacheEntry>>({})

  // Debug logs (keep minimal)
  console.log('App render:', { uploadedFilesLen: uploadedFiles?.length ?? 'NA', mergedFile: !!mergedFile, dataset: !!dataset })

  // Restore project metadata (files, merged_file) when project changes
  useEffect(() => {
    let cancelled = false

    const applyCached = (entry?: ProjectCacheEntry) => {
      if (!entry) return
      setUploadedFiles(entry.files)
      setMergedFile(entry.merged)
      if (entry.dataset) {
        setDataset(entry.dataset)
        setDatasetLoading(false)
      }
    }

    const restore = async () => {
      setProjectLoading(true)
      let effectiveId = projectId
      let cachedList: ProjectInfo[] | null = null

      const fetchList = async () => {
        if (cachedList) return cachedList
        const listRes = await axios.get(`${API_BASE_URL}/projects`)
        const projects: ProjectInfo[] = (listRes.data?.projects || []).filter((p: ProjectInfo) => p.id !== 'default')
        cachedList = projects
        return projects
      }

      const ensureFromName = async () => {
        if (effectiveId || !projectName) return
        try {
          const projects = await fetchList()
          const found = projects.find((p) => p.name === projectName)
          if (found && !cancelled) {
            setProject(found.id, found.name)
            effectiveId = found.id
          }
        } catch {}
      }

      const ensureFallback = async () => {
        if (effectiveId) return
        try {
          const projects = await fetchList()
          const withMerged = projects.find((p) => !!p.merged_file)
          const pick = withMerged || projects[0]
          if (pick && !cancelled) {
            setProject(pick.id, pick.name)
            effectiveId = pick.id
          }
        } catch {}
      }

      await ensureFromName()
      await ensureFallback()

      if (!effectiveId || cancelled) {
        setUploadedFiles([])
        setMergedFile(null)
        setDataset(null)
        setProjectLoading(false)
        setDatasetLoading(false)
        return
      }

      const cached = projectCache.current[effectiveId]
      if (cached) {
        applyCached(cached)
      } else {
        setUploadedFiles([])
        setMergedFile(null)
        setDataset(null)
      }

      try {
        const res = await axios.get<ProjectInfo>(`${API_BASE_URL}/projects/${effectiveId}`)
        if (cancelled) return
        const details = res.data || {}
        const files = Array.isArray(details.files) ? details.files : []
        const merged = details.merged_file || null
        setUploadedFiles(files)
        setMergedFile(merged)
        projectCache.current[effectiveId] = {
          files,
          merged,
          dataset: projectCache.current[effectiveId]?.dataset ?? null,
          fetchedAt: Date.now(),
        }
      } catch {
        if (!cancelled) {
          setUploadedFiles([])
          setMergedFile(null)
          setDataset(null)
        }
      } finally {
        if (!cancelled) setProjectLoading(false)
      }
    }

    restore()

    return () => {
      cancelled = true
    }
  }, [projectId, projectName, setProject])

  // Auto load dataset if we already have a merged file (both View and Edit)
  useEffect(() => {
    const autoLoad = async () => {
      if (!projectId) {
        setDataset(null)
        setDatasetLoading(false)
        return
      }

      const cached = projectCache.current[projectId]

      if (!mergedFile) {
        setDataset(null)
        if (cached) {
          projectCache.current[projectId] = {
            ...cached,
            merged: null,
            dataset: null,
            fetchedAt: Date.now(),
          }
        }
        setDatasetLoading(false)
        return
      }

      if (cached && cached.dataset && cached.merged === mergedFile) {
        setDataset(cached.dataset)
        setDatasetLoading(false)
        return
      }

      try {
        setDatasetLoading(true)
        const url = `${API_BASE_URL}/projects/${projectId}/load-dataset`
        const resp = await axios.post<DatasetSummary>(url, { file_path: mergedFile })
        setDataset(resp.data)
        projectCache.current[projectId] = {
          files: cached?.files ?? uploadedFiles,
          merged: mergedFile,
          dataset: resp.data,
          fetchedAt: Date.now(),
        }
      } catch {
        setDataset(null)
      } finally {
        setDatasetLoading(false)
      }
    }
    autoLoad()
  }, [mergedFile, projectId])

  useEffect(() => {
    if (!projectId) return
    projectCache.current[projectId] = {
      files: uploadedFiles,
      merged: mergedFile,
      dataset,
      fetchedAt: Date.now(),
    }
  }, [projectId, uploadedFiles, mergedFile, dataset])

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              {mode === 'edit' ? (
                <>
                  <Route 
                    path="/" 
                    element={
                      <FileUpload 
                        uploadedFiles={uploadedFiles} 
                        setUploadedFiles={setUploadedFiles}
                        setMergedFile={setMergedFile}
                      />
                    } 
                  />
                  <Route 
                    path="/dashboard" 
                    element={
                      <Dashboard 
                        mergedFile={mergedFile}
                        setDataset={setDataset}
                        projectLoading={projectLoading || datasetLoading}
                      />
                    } 
                  />
                  <Route 
                    path="/questions"
                    element={<QuestionExplorer dataset={dataset} isLoading={projectLoading || datasetLoading} />} 
                  />
                  <Route 
                    path="/results" 
                    element={<AnalysisResults dataset={dataset} isLoading={projectLoading || datasetLoading} />} 
                  />
                  <Route 
                    path="/projects" 
                    element={<ProjectsOverview />} 
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              ) : (
                <>
                  <Route 
                    path="/questions"
                    element={<QuestionExplorer dataset={dataset} isLoading={projectLoading || datasetLoading} />} 
                  />
                  <Route 
                    path="/results" 
                    element={<AnalysisResults dataset={dataset} isLoading={projectLoading || datasetLoading} />} 
                  />
                  <Route 
                    path="/projects" 
                    element={<ProjectsOverview />} 
                  />
                  {/* In view mode, redirect everything to results */}
                  <Route path="*" element={<Navigate to="/results" replace />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
