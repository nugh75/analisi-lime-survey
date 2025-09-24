import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import FileUpload from './components/FileUpload'
import Dashboard from './components/Dashboard'
import AnalysisResults from './components/AnalysisResults'
import QuestionExplorer from './components/QuestionExplorer'
import Navigation from './components/Navigation'
import ErrorBoundary from './components/ErrorBoundary'
import { useProject } from './context/ProjectContext'
import { useMode } from './context/ModeContext'
import axios from 'axios'
import { API_BASE_URL } from './services/api'
import type { DatasetSummary, ProjectInfo } from './types/api'

function App() {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [mergedFile, setMergedFile] = useState<string | null>(null)
  const [dataset, setDataset] = useState<DatasetSummary | null>(null)
  const { projectId, projectName, setProject } = useProject()
  const { mode } = useMode()

  // Debug logs (keep minimal)
  console.log('App render:', { uploadedFilesLen: uploadedFiles?.length ?? 'NA', mergedFile: !!mergedFile, dataset: !!dataset })

  // Restore project metadata (files, merged_file) when project changes
  useEffect(() => {
    const restore = async () => {
      setUploadedFiles([])
      setMergedFile(null)
      setDataset(null)
      try {
        let effectiveId = projectId
        // If we only have the name (e.g., after refresh) try to resolve the id
        if (!effectiveId && projectName) {
          try {
      const list = await axios.get(`${API_BASE_URL}/projects`)
      const found = (list.data?.projects || []).find((p: ProjectInfo) => p.name === projectName)
            if (found) {
              setProject(found.id, found.name)
              effectiveId = found.id
            }
          } catch {}
        }
        // Fallback: if still no id, pick a non-default project (prefer one with merged_file)
        if (!effectiveId) {
          try {
            const list = await axios.get(`${API_BASE_URL}/projects`)
      const projects: ProjectInfo[] = (list.data?.projects || [])
      const nonDefault = projects.filter((p) => p.id !== 'default')
      const withMerged = nonDefault.find((p) => !!p.merged_file)
            const pick = withMerged || nonDefault[0]
            if (pick) {
              setProject(pick.id, pick.name)
              effectiveId = pick.id
            }
          } catch {}
        }
        const idOrDefault = effectiveId || 'default'
    const res = await axios.get<ProjectInfo>(`${API_BASE_URL}/projects/${idOrDefault}`)
    const details = res.data || {}
        if (Array.isArray(details.files)) setUploadedFiles(details.files)
        setMergedFile(details.merged_file || null)
      } catch {
        // ignore restore errors
      }
    }
    restore()
  }, [projectId, projectName, setProject])

  // Auto load dataset if we already have a merged file (both View and Edit)
  useEffect(() => {
    const autoLoad = async () => {
      if (!mergedFile) return
      try {
        const effectiveId = projectId || 'default'
        const url = projectId 
          ? `${API_BASE_URL}/projects/${effectiveId}/load-dataset`
          : `${API_BASE_URL}/load-dataset`
  const resp = await axios.post<DatasetSummary>(url, { file_path: mergedFile })
        setDataset(resp.data)
      } catch {
        // ignore
      }
    }
    autoLoad()
  }, [mergedFile, projectId])

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
                      />
                    } 
                  />
                  <Route 
                    path="/questions"
                    element={<QuestionExplorer dataset={dataset} />} 
                  />
                  <Route 
                    path="/results" 
                    element={<AnalysisResults dataset={dataset} />} 
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              ) : (
                <>
                  <Route 
                    path="/questions"
                    element={<QuestionExplorer dataset={dataset} />} 
                  />
                  <Route 
                    path="/results" 
                    element={<AnalysisResults dataset={dataset} />} 
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
