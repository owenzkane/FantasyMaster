import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts ship with the app, so nothing is fetched from Google. Only the weights the style
// guide uses are included.
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
// Design tokens and base styles come before every other stylesheet
import './styles/tokens.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
