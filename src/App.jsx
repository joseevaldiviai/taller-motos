import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Tablero from './pages/Tablero'
import Usuarios from './pages/Usuarios'
import Insumos from './pages/Insumos'
import CardDetalle from './pages/CardDetalle'
import Perfil from './pages/Perfil'
import NotFound from './pages/NotFound'
import Finalizados from './pages/Finalizados'
import Compras from './pages/Compras'

const Reportes = lazy(() => import('./pages/Reportes'))

function RequireAuth({ children }) {
  const { token, authReady } = useAuthStore()
  if (!authReady) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'var(--text-muted)', fontFamily:'Georgia,serif' }}>Cargando…</div>
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const { esAdmin } = useAuthStore()
  if (!esAdmin()) return <Navigate to="/tablero" replace />
  return children
}

export default function App() {
  const { initializeAuth, attachSessionListeners, startSessionMonitor, tema } = useAuthStore()

  useEffect(() => {
    initializeAuth()
    const detachListeners = attachSessionListeners()
    const stopMonitor = startSessionMonitor()
    return () => { detachListeners(); stopMonitor() }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema === 'light' ? 'light' : '')
  }, [tema])

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', fontFamily: 'Georgia, serif', fontSize: '13px' } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/tablero" replace />} />
          <Route path="tablero" element={<Tablero />} />
          <Route path="cards/:id" element={<CardDetalle />} />
          <Route path="usuarios" element={<RequireAdmin><Usuarios /></RequireAdmin>} />
          <Route path="insumos" element={<RequireAdmin><Insumos /></RequireAdmin>} />
          <Route path="finalizados" element={<Finalizados />} />
          <Route path="compras" element={<Compras />} />
          <Route path="reportes" element={<RequireAdmin><Suspense fallback={<div style={{padding:60,textAlign:"center",color:"var(--text-muted)"}}>Cargando reportes…</div>}><Reportes /></Suspense></RequireAdmin>} />
          <Route path="perfil" element={<Perfil />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
