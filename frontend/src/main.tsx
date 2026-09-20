import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './i18n'
import './styles/globals.css'
import { DomTranslationBridge } from './components/DomTranslationBridge'
import { FieldErrorFeedback } from './components/FieldErrorFeedback'

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DomTranslationBridge />
    <FieldErrorFeedback />
    <App />
  </React.StrictMode>
)
