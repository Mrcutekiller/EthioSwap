import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider } from "convex/react"
import { convex } from "./convexClient"
import './index.css'
import App from './App.jsx'
import './i18n';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
)
