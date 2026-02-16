import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Apply saved theme before render to avoid flash
try {
  const savedTheme = localStorage.getItem('shinobue-theme')
  if (savedTheme === 'dark' || savedTheme === 'traditional') {
    document.documentElement.setAttribute('data-theme', savedTheme)
  }
} catch {
  // localStorage unavailable (private browsing / iframe)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — offline support unavailable
    })
  })
}
