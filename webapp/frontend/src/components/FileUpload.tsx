import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileX, Check, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { useProject } from '../context/ProjectContext'
import { useNavigate } from 'react-router-dom'

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

  const toErrorMessage = (err: any): string => {
    const detail = err?.response?.data?.detail
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
    return err?.message || 'Operation failed'
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
      const formData = new FormData()
      acceptedFiles.forEach(file => {
        formData.append('files', file)
      })

      const uploadUrl = projectId 
        ? `http://localhost:8000/projects/${projectId}/upload-files`
        : 'http://localhost:8000/upload-files'
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

  // Backend returns { files: [basename], file_paths: [full paths] }
  const filesFromApi: string[] = Array.isArray(response?.data?.files) ? response.data.files : []
  const filePathsFromApi: string[] = Array.isArray(response?.data?.file_paths) ? response.data.file_paths : []

  setUploadedFiles(filesFromApi)
  setUploadedFilePaths(filePathsFromApi)
      setSuccess(`Successfully uploaded ${acceptedFiles.length} file(s)`)
    } catch (err: any) {
      setError(toErrorMessage(err) || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [setUploadedFiles])

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

    setMerging(true)
    setError(null)

    try {
      // Backend expects body with { file_paths: [...] }
      const mergeUrl = projectId 
        ? `http://localhost:8000/projects/${projectId}/merge-files`
        : 'http://localhost:8000/merge-files'
      const response = await axios.post(mergeUrl, {
        file_paths: uploadedFilePaths,
      })
      setMergedFile(response.data.merged_file)
      setSuccess('Files merged successfully!')
      navigate('/dashboard')
    } catch (err: any) {
      setError(toErrorMessage(err) || 'Merge failed')
    } finally {
      setMerging(false)
    }
  }

  const handleCleanup = async () => {
    try {
      const cleanupUrl = projectId 
        ? `http://localhost:8000/projects/${projectId}/cleanup`
        : 'http://localhost:8000/cleanup'
      await axios.delete(cleanupUrl)
      setUploadedFiles([])
      setMergedFile(null)
      setUploadedFilePaths([])
      setSuccess('Files cleaned up')
    } catch (err: any) {
      setError(toErrorMessage(err) || 'Cleanup failed')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Survey Files</h2>
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
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">Drag & drop Excel files here, or click to select</p>
              <p className="text-sm text-gray-500">Supports .xlsx and .xls files</p>
            </div>
          )}
        </div>

        {uploading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Uploading files...</span>
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
            <h3 className="text-lg font-medium text-gray-900 mb-3">Uploaded Files</h3>
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
                {merging ? 'Merging...' : 'Merge Files'}
              </button>
              
              <button
                onClick={handleCleanup}
                className="btn-secondary"
              >
                <FileX className="h-4 w-4 mr-2" />
                Clean Up
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
