import { useState } from 'react'

function TestApp() {
  const [count, setCount] = useState(0)
  const [files, setFiles] = useState<string[]>([])

  console.log('TestApp render:', { count, files, filesType: typeof files })

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Test App</h1>
        
        <div className="mb-4">
          <p>Count: {count}</p>
          <button 
            onClick={() => setCount(count + 1)}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Increment
          </button>
        </div>

        <div className="mb-4">
          <p>Files: {files.length}</p>
          <button 
            onClick={() => setFiles([...files, `file-${files.length + 1}`])}
            className="bg-green-500 text-white px-4 py-2 rounded mr-2"
          >
            Add File
          </button>
          <button 
            onClick={() => setFiles([])}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Clear Files
          </button>
        </div>

        <div>
          <h3 className="font-bold">Files List:</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index} className="text-sm text-gray-600">
                {file}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TestApp
