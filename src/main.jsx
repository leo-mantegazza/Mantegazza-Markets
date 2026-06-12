import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Refresh from './Refresh.jsx'
import './index.css'

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/refresh' ? <Refresh /> : <App />}
  </StrictMode>,
)