import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { platform } from './platforms/index.ts'

// TEMPORARY (removed in step 6): lets us call the platform from the browser console
if (import.meta.env.DEV) {
  Object.assign(window, { platform })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
