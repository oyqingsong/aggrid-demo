import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@chenhui996/gg-ui/gg-ui.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
