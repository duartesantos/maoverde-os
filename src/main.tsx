import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'

const root = createRoot(document.getElementById('root')!)

if (!isSupabaseConfigured) {
  root.render(
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#1c1c1a',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Falta configurar o Supabase</h1>
        <p style={{ fontSize: 14, color: '#6b6b64', lineHeight: 1.6 }}>
          Cria um ficheiro <code>.env</code> na raiz do projeto (a partir de{' '}
          <code>.env.example</code>) com <code>VITE_SUPABASE_URL</code> e{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, e depois <b>reinicia</b> o servidor
          (<code>npm run dev</code>). O Vite só lê o <code>.env</code> no arranque.
        </p>
      </div>
    </div>,
  )
} else {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}
