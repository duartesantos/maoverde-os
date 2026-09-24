import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Jardim from './pages/Jardim'
import Planeamento from './pages/Planeamento'
import Execucao from './pages/Execucao'
import Veiculos from './pages/Veiculos'
import type { ReactNode } from 'react'

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        A carregar…
      </div>
    )
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { session } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/planeamento" element={<Planeamento />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/jardim/:id" element={<Jardim />} />
        <Route path="/execucao/:id" element={<Execucao />} />
        <Route path="/veiculos" element={<Veiculos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
