import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-lg text-muted-foreground mt-2">Página no encontrada</p>
      <Link to="/" className="mt-6 px-6 py-3 bg-primary text-white rounded-lg">
        Volver al inicio
      </Link>
    </div>
  )
}

export default NotFound
