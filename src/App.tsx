import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'sonner'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Reserva from './pages/Reserva'
import AdminDashboard from './pages/AdminDashboard'
import AdminServicios from './pages/AdminServicios'
import AdminBarberos from './pages/AdminBarberos'
import AdminHorarios from './pages/AdminHorarios'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reserva" element={<Reserva />} />
        <Route path="/reserva/exito" element={<Reserva />} />
        <Route path="/reserva/error" element={<Reserva />} />
        <Route path="/reserva/pendiente" element={<Reserva />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/servicios" element={<AdminServicios />} />
        <Route path="/admin/barberos" element={<AdminBarberos />} />
        <Route path="/admin/horarios" element={<AdminHorarios />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
