import { useAuth } from '../contexts/AuthContext'

function AdminDashboard() {
  const { session, profile, signOut } = useAuth()

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Debes iniciar sesión para acceder al panel.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{profile?.nombre} ({profile?.rol})</span>
          <button onClick={signOut} className="px-4 py-2 border rounded-lg text-sm">Cerrar Sesión</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="/admin/servicios" className="p-6 border rounded-lg hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold">Servicios</h2>
          <p className="text-sm text-muted-foreground mt-2">Gestionar servicios ofrecidos</p>
        </a>
        <a href="/admin/barberos" className="p-6 border rounded-lg hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold">Barberos</h2>
          <p className="text-sm text-muted-foreground mt-2">Gestionar staff</p>
        </a>
        <a href="/admin/horarios" className="p-6 border rounded-lg hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold">Horarios</h2>
          <p className="text-sm text-muted-foreground mt-2">Configurar horarios y bloqueos</p>
        </a>
      </div>
    </div>
  )
}

export default AdminDashboard
