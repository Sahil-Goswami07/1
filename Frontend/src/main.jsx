import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Global interceptor to detect expired/invalid tokens and dispatch auto-logout
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof URL ? args[0].href : (args[0] && args[0].url) || '');
    if (!url.includes('/api/auth/login')) {
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
  }
  return response;
};


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
