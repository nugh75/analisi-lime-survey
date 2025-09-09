import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh' }}>
      <h1>Survey Analyzer - Debug Mode</h1>
      <p>React sta funzionando!</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#blue', 
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Click me: {count}
      </button>
      <p>Se vedi questo testo, React funziona correttamente.</p>
    </div>
  )
}

export default App
