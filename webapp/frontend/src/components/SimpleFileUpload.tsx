import { useState } from 'react'

interface SimpleFileUploadProps {
  uploadedFiles: string[]
  setUploadedFiles: (files: string[]) => void
}

export default function SimpleFileUpload({ uploadedFiles = [], setUploadedFiles }: SimpleFileUploadProps) {
  const [status, setStatus] = useState('')

  console.log('SimpleFileUpload render:', { 
    uploadedFiles, 
    length: uploadedFiles?.length, 
    type: typeof uploadedFiles,
    isArray: Array.isArray(uploadedFiles)
  })

  const handleTestUpload = () => {
  const testFiles = ['file-di-test-1.xlsx', 'file-di-test-2.xlsx']
    setUploadedFiles(testFiles)
  setStatus('File di test aggiunti!')
  }

  const handleClear = () => {
    setUploadedFiles([])
  setStatus('File rimossi!')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-2xl font-bold text-gray-900 mb-6">Test caricamento file semplice</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            File caricati: {uploadedFiles?.length || 0}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Stato: {status}
          </p>
        </div>

        <div className="space-x-3 mb-6">
          <button
            onClick={handleTestUpload}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Carica test
          </button>
          <button
            onClick={handleClear}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
          >
            Pulisci
          </button>
        </div>

        {uploadedFiles && uploadedFiles.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">File:</h3>
            <ul className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="p-3 bg-gray-50 rounded-lg">
                  {file}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
