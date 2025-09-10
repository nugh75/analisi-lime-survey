import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ProjectProvider } from './context/ProjectContext'
import { ModeProvider } from './context/ModeContext'

createRoot(document.getElementById('root')!).render(
  <ModeProvider>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </ModeProvider>
)
