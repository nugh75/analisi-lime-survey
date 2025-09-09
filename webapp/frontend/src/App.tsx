import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import FileUpload from './components/FileUpload'
import Dashboard from './components/Dashboard'
import AnalysisResults from './components/AnalysisResults'
import Navigation from './components/Navigation'
import ErrorBoundary from './components/ErrorBoundary'
import { useProject } from './context/ProjectContext'
import axios from 'axios'

function App() {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [mergedFile, setMergedFile] = useState<string | null>(null)
  const [dataset, setDataset] = useState<any>(null)
  const { projectId } = useProject()

  // Debug logs (keep minimal)
  console.log('App render:', { uploadedFilesLen: uploadedFiles?.length ?? 'NA', mergedFile: !!mergedFile, dataset: !!dataset })

  // Restore project metadata (files, merged_file) when project changes
  useEffect(() => {
    const restore = async () => {
      setUploadedFiles([])
      setMergedFile(null)
      setDataset(null)
      try {
        const effectiveId = projectId || 'default'
        const res = await axios.get(`http://localhost:8000/projects/${effectiveId}`)
        const details = res.data || {}
        if (Array.isArray(details.files)) setUploadedFiles(details.files)
        setMergedFile(details.merged_file || null)
      } catch {
        // ignore restore errors
      }
    }
    restore()
  }, [projectId])

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <Routes>
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
                    dataset={dataset}
                    setDataset={setDataset}
                  />
                } 
              />
              <Route 
                path="/results" 
                element={
                  <AnalysisResults dataset={dataset} />
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
