import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileX, Check, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { API_BASE_URL } from '../services/api'
import { useProject } from '../context/ProjectContext'
import { useNavigate } from 'react-router-dom'
import type { UploadFilesResponse, MergeResponse } from '../types/api'

interface FileUploadProps {
  uploadedFiles: string[]
  setUploadedFiles: (files: string[]) => void
  setMergedFile: (file: string | null) => void
}

export default function FileUpload({ uploadedFiles = [], setUploadedFiles, setMergedFile }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([])
  const navigate = useNavigate()
  const { projectId, projectName } = useProject()

  const toErrorMessage = (err: unknown): string => {
    const e = err as any
    const detail = e?.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      // FastAPI validation errors array
      const msgs = detail.map((d: any) => d?.msg || JSON.stringify(d)).filter(Boolean)
      return msgs.join('; ')
    }
    if (detail && typeof detail === 'object') {
      // Single validation error object
      if (detail.msg) return detail.msg
      try { return JSON.stringify(detail) } catch { /* ignore */ }
    }
    return (e?.message as string) || 'Operazione non riuscita'
  }

  // Debug
  console.log('FileUpload props:', { 
    uploadedFiles, 
    uploadedFilesType: typeof uploadedFiles,
    uploadedFilesLength: uploadedFiles?.length 
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!projectId) {
        throw new Error('Seleziona un progetto prima di caricare i file')
      }
      const formData = new FormData()
      acceptedFiles.forEach(file => {
        formData.append('files', file)
      })

      const uploadUrl = `${API_BASE_URL}/projects/${projectId}/upload-files`
  const response = await axios.post<UploadFilesResponse>(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

  // Backend returns { files: [basename], file_paths: [full paths] }
  const filesFromApi: string[] = Array.isArray(response?.data?.files) ? response.data.files : []
  const filePathsFromApi: string[] = Array.isArray(response?.data?.file_paths) ? response.data.file_paths : []

  setUploadedFiles(filesFromApi)
  setUploadedFilePaths(filePathsFromApi)
      setSuccess(`Caricati con successo ${acceptedFiles.length} file`)
    } catch (err: unknown) {
      setError(toErrorMessage(err) || 'Caricamento non riuscito')
    } finally {
      setUploading(false)
    }
  }, [setUploadedFiles, projectId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  })

  const handleMergeFiles = async () => {
    if (!uploadedFiles || uploadedFiles.length === 0) return
    if (!projectId) {
      setError('Seleziona un progetto prima di unire i file')
      return
    }

    setMerging(true)
    setError(null)

    try {
      // Backend expects body with { file_paths: [...] }
      const mergeUrl = `${API_BASE_URL}/projects/${projectId}/merge-files`
      const response = await axios.post<MergeResponse>(mergeUrl, {
        file_paths: uploadedFilePaths,
      })
  setMergedFile(response.data.merged_file)
  setSuccess('File uniti con successo!')
      navigate('/dashboard')
    } catch (err: unknown) {
  setError(toErrorMessage(err) || 'Unione non riuscita')
    } finally {
      setMerging(false)
    }
  }

  const handleCleanup = async () => {
    try {
      if (!projectId) {
        throw new Error('Seleziona un progetto prima di eseguire la pulizia')
      }
      const cleanupUrl = `${API_BASE_URL}/projects/${projectId}/cleanup`
      await axios.delete(cleanupUrl)
  setUploadedFiles([])
  setMergedFile(null)
  setUploadedFilePaths([])
  setSuccess('Pulizia completata')
  } catch (err: unknown) {
  setError(toErrorMessage(err) || 'Pulizia non riuscita')
    }
  }

  if (!projectId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nessun progetto selezionato</h2>
          <p className="text-gray-600 mb-4">
            Vai alla sezione "Lista progetti" per crearne uno nuovo oppure selezionane uno esistente dalla barra in alto.
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="btn-primary px-4 py-2"
          >
            Apri lista progetti
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Carica file del questionario</h2>
        {projectId && (
          <p className="text-sm text-gray-600 mb-4">Progetto attivo: <span className="font-medium">{projectName}</span></p>
        )}
        
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            isDragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">Rilascia i file qui...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">Trascina qui i file Excel oppure clicca per selezionarli</p>
              <p className="text-sm text-gray-500">Supporta file .xlsx e .xls</p>
            </div>
          )}
        </div>

        {uploading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Caricamento file...</span>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Uploaded Files List */}
        {uploadedFiles && uploadedFiles.length > 0 && (
          <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-3">File caricati</h3>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">{file}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleMergeFiles}
                disabled={merging}
                className="btn-primary disabled:opacity-50"
              >
        {merging ? 'Unione in corso...' : 'Unisci file'}
              </button>
              
              <button
                onClick={handleCleanup}
                className="btn-secondary"
              >
                <FileX className="h-4 w-4 mr-2" />
        Pulisci
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
