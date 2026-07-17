function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Barbería - Landing Page</h1>
      <p className="text-lg text-muted-foreground mt-2">Personalizable desde configuracion_estetica</p>
      <div className="mt-8 flex gap-4">
        <a href="/reserva" className="px-6 py-3 bg-primary text-white rounded-lg">Reservar Cita</a>
        <a href="/login" className="px-6 py-3 border rounded-lg">Panel Admin</a>
      </div>
    </div>
  )
}

export default Landing
