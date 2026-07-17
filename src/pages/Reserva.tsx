function Reserva() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold">Reserva tu Cita</h1>
      <p className="text-muted-foreground mt-2">Selecciona servicio, barbero, fecha y horario</p>
      <p className="text-sm text-muted-foreground mt-8">Componentes del flujo de reserva:</p>
      <ul className="mt-4 space-y-2 text-sm">
        <li>1. Selección de servicio</li>
        <li>2. Selección de barbero</li>
        <li>3. Calendario con disponibilidad</li>
        <li>4. Horarios disponibles (algoritmo)</li>
        <li>5. Guest Checkout</li>
        <li>6. Pago Mercado Pago</li>
      </ul>
    </div>
  )
}

export default Reserva
