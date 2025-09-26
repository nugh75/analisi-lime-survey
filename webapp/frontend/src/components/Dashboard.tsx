import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, FileText, BarChart3, Settings, Folder, Trash2, Pencil, Loader2 } from 'lucide-react'
import axios from 'axios'
import { API_BASE_URL } from '../services/api'
import { useProject } from '../context/ProjectContext'
import type { HeaderAnalysisResponse, ColumnSelectionResponse, DatasetSummary, ProjectInfo } from '../types/api'

interface DashboardProps {
  mergedFile: string | null
  setDataset: (dataset: DatasetSummary | null) => void
  projectLoading?: boolean
}

export default function Dashboard({ mergedFile = null, setDataset, projectLoading = false }: DashboardProps) {
  const [loading, setLoading] = useState(false)
  const [headers, setHeaders] = useState<HeaderAnalysisResponse | null>(null)
  const [usefulColumns, setUsefulColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [datasetFile, setDatasetFile] = useState<string | null>(null)
  const [projectDetails, setProjectDetails] = useState<ProjectInfo | null>(null)
  const navigate = useNavigate()
  const { projectId, projectName, setProject } = useProject()
  const hasMergedFile = Boolean(mergedFile)
  const requirePassword = (action: string) => {
    const entered = window.prompt(`Inserisci password per ${action}:`)
    if (entered === null) return false
    if (entered.trim() !== 'Prin') {
      window.alert('Password errata')
      return false
    }
    return true
  }

  useEffect(() => {
    if (mergedFile && projectId) {
      loadHeaders()
    }
  }, [mergedFile, projectId])

  useEffect(() => {
    const fetchDetails = async () => {
      if (!projectId) {
        setProjectDetails(null)
        return
      }
      try {
        const res = await axios.get<ProjectInfo>(`${API_BASE_URL}/projects/${projectId}`)
        setProjectDetails(res.data)
      } catch (e) {
        setProjectDetails(null)
      }
    }
    fetchDetails()
  }, [projectId])

  const renameProject = async () => {
    if (!projectId) return
    if (!requirePassword('rinominare il progetto')) return
    const newName = window.prompt('Nuovo nome progetto:', projectName || '')
    if (newName === null) return
    try {
      const res = await axios.patch<ProjectInfo>(`${API_BASE_URL}/projects/${projectId}`, { name: newName })
      setProject(res.data.id, res.data.name)
      setProjectDetails(res.data)
    } catch (e) {
      console.warn('Rename failed', e)
    }
  }

  const deleteProject = async () => {
    if (!projectId) return
    const ok = window.confirm('Eliminare il progetto? Questa operazione rimuoverà anche i file caricati.')
    if (!ok) return
    if (!requirePassword('eliminare il progetto')) return
    try {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}`)
      // Reset selection to default
      setProject(null, null)
      setProjectDetails(null)
      navigate('/')
    } catch (e) {
      console.warn('Delete failed', e)
    }
  }

  const keepOnlyMerges = async () => {
    if (!projectId) return
    const ok = window.confirm('Cancellare tutti i file Excel non uniti (non merged_*)?')
    if (!ok) return
    if (!requirePassword('ripulire i file del progetto')) return
    try {
      await axios.post(`${API_BASE_URL}/projects/${projectId}/keep-only-merges`)
      // refresh details
      const res = await axios.get<ProjectInfo>(`${API_BASE_URL}/projects/${projectId}`)
      setProjectDetails(res.data)
    } catch (e) {
      console.warn('Keep-only-merges failed', e)
    }
  }

  const loadHeaders = async () => {
    if (!projectId || !mergedFile) return
    setLoading(true)
    try {
      // Backend expects { file_path }
      const analyzeUrl = `${API_BASE_URL}/projects/${projectId}/analyze-headers`
      const response = await axios.post<HeaderAnalysisResponse>(analyzeUrl, {
        file_path: mergedFile,
      })
      setHeaders(response.data)
    } catch (err) {
      console.error('Failed to analyze headers:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectUsefulColumns = async () => {
    if (!projectId || !mergedFile) return
    setLoading(true)
    try {
      // Backend expects { file_path, headers_analysis }
      const selectUrl = `${API_BASE_URL}/projects/${projectId}/select-columns`
      const response = await axios.post<ColumnSelectionResponse>(selectUrl, {
        file_path: mergedFile,
        headers_analysis: headers?.headers ?? [],
      })
      // Response: { selected_columns, dataset_file, columns }
      setUsefulColumns(response.data.columns)
      setSelectedColumns(response.data.columns)
      setDatasetFile(response.data.dataset_file)
    } catch (err) {
      console.error('Failed to select columns:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDataset = async () => {
    if (selectedColumns.length === 0 || !projectId) return

    setLoading(true)
    try {
      // First, ensure dataset file is created from select-columns response. If not present, re-call select.
      // Then load dataset by file path only (backend ignores columns here and uses its analyzer state)
      const df = datasetFile || null
      if (!df) {
        // Try to call selectUsefulColumns to produce dataset file
        await selectUsefulColumns()
      }

      const fileToLoad = datasetFile || mergedFile
      const loadUrl = `${API_BASE_URL}/projects/${projectId}/load-dataset`
      const loadResp = await axios.post<DatasetSummary>(loadUrl, {
        file_path: fileToLoad,
      })
      setDataset(loadResp.data)

      navigate('/results')
    } catch (err) {
      console.error('Failed to load dataset:', err)
    } finally {
      setLoading(false)
    }
  }

  if (projectLoading) {
    return (
      <div className="max-w-screen-2xl mx-auto">
        <div className="card text-center">
          <Loader2 className="mx-auto h-16 w-16 text-blue-500 animate-spin mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Caricamento progetto…</h2>
          <p className="text-gray-600">Stiamo recuperando i file e le informazioni dell'indagine selezionata.</p>
        </div>
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="max-w-screen-2xl mx-auto">
        <div className="card text-center">
          <Database className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nessun progetto selezionato</h2>
          <p className="text-gray-600 mb-6">Passa alla "Lista progetti" per crearne uno o attivane uno esistente dalla barra di navigazione.</p>
          <button
            onClick={() => navigate('/projects')}
            className="btn-primary text-base px-4 py-2"
          >
            Apri lista progetti
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard analisi dati</h2>
        {projectId && (
          <p className="text-sm text-gray-600 mb-6">Progetto attivo: <span className="font-medium">{projectName}</span></p>
        )}

        {/* Project Details Panel */}
        {projectId && projectDetails && (
          <div className="mb-6 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={renameProject}
                  className="btn-secondary p-2"
                  title="Rinomina progetto"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <Folder className="h-5 w-5 text-gray-700" />
                <h3 className="text-lg font-medium text-gray-900">Dettagli Progetto</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={keepOnlyMerges} className="btn-secondary py-1 px-3">Mantieni solo merged</button>
                <button onClick={deleteProject} className="btn-secondary py-1 px-2 text-red-600 border-red-300 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              <div><span className="font-medium">Nome:</span> {projectDetails.name}</div>
              <div><span className="font-medium">Creato il:</span> {projectDetails.created_at}</div>
              <div>
                <span className="font-medium">Merged file:</span> {projectDetails.merged_file || '—'}
              </div>
              <div>
                <span className="font-medium">File caricati:</span>
                <ul className="list-disc ml-6 mt-1 space-y-1">
                  {projectDetails.files?.length ? (
                    projectDetails.files.map((f: string, i: number) => (
                      <li key={i} className="truncate" title={f}>{f}</li>
                    ))
                  ) : (
                    <li className="text-gray-500">Nessun file</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {!hasMergedFile && (
          <div className="card text-center">
            <Database className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nessun dato disponibile</h3>
            <p className="text-gray-600 mb-6">Carica e unisci i file per continuare l'analisi.</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary text-base px-4 py-2"
            >
              Vai al caricamento
            </button>
          </div>
        )}

        {hasMergedFile && (
          <>
            {/* File Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">File unito: {mergedFile}</span>
              </div>
            </div>

            {/* Headers Analysis */}
            {headers && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Analisi intestazioni</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card">
                    <div className="text-2xl font-bold text-gray-900">{headers?.total_columns ?? 0}</div>
                    <div className="text-sm text-gray-600">Colonne totali</div>
                  </div>
                  <div className="card">
                    <div className="text-2xl font-bold text-gray-900">{headers?.total_rows ?? 0}</div>
                    <div className="text-sm text-gray-600">Righe totali</div>
                  </div>
                  <div className="card">
                    <div className="text-2xl font-bold text-gray-900">{selectedColumns.length}</div>
                    <div className="text-sm text-gray-600">Colonne selezionate</div>
                  </div>
                </div>
              </div>
            )}

            {/* Column Selection */}
            <div className="space-y-4">
              {usefulColumns.length === 0 ? (
                <button
                  onClick={selectUsefulColumns}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 text-base px-4 py-2"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {loading ? 'Analisi in corso...' : 'Seleziona colonne utili'}
                </button>
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Colonne selezionate ({usefulColumns.length})
                  </h3>

                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {usefulColumns.map((column, index) => (
                        <label key={index} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(column)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedColumns([...selectedColumns, column])
                              } else {
                                setSelectedColumns(selectedColumns.filter(c => c !== column))
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 truncate" title={column}>
                            {column}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={loadDataset}
                      disabled={loading || selectedColumns.length === 0}
                      className="btn-primary disabled:opacity-50 text-base px-4 py-2"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {loading ? 'Caricamento...' : 'Avvia analisi'}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedColumns([...usefulColumns])
                      }}
                      className="btn-secondary text-base px-4 py-2"
                    >
                      Seleziona tutto
                    </button>

                    <button
                      onClick={() => setSelectedColumns([])}
                      className="btn-secondary text-base px-4 py-2"
                    >
                      Deseleziona tutto
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
