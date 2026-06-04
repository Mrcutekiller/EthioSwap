import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider } from "convex/react"
import { convex } from "./convexClient"
import { ErrorBoundary } from "./components/ErrorBoundary.jsx"
import './index.css'
import App from './App.jsx'
import './i18n';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </ErrorBoundary>
  </StrictMode>,
)

