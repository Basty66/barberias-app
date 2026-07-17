import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Servicio, Barbero } from '../types'
import Calendario from '../components/reserva/Calendario'
import { useDisponibilidad } from '../hooks/useDisponibilidad'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Scissors, User, Calendar, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

type Paso = 'servicio' | 'barbero' | 'fecha' | 'horario' | 'datos' | 'confirmacion'

export default function Reserva() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState<Paso>('servicio')
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const { slots, cargando, error, calcularDisponibilidad } = useDisponibilidad()

  const [servicioSel, setServicioSel] = useState<Servicio | null>(null)
  const [barberoSel, setBarberoSel] = useState<Barbero | null>(null)
  const [fechaSel, setFechaSel] = useState<Date | null>(null)
  const [horarioSel, setHorarioSel] = useState<string | null>(null)
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', email: '', notas: '' })
  const [reservando, setReservando] = useState(false)

  useEffect(() => {
    supabase.from('servicios').select('*').eq('activo', true).order('nombre').then(({ data }) => {
      if (data) setServicios(data)
    })
    supabase.from('barberos').select('*').eq('activo', true).order('nombre').then(({ data }) => {
      if (data) setBarberos(data)
    })
  }, [])

  useEffect(() => {
    if (barberoSel && fechaSel && servicioSel) {
      calcularDisponibilidad({
        barberoId: barberoSel.id,
        fecha: fechaSel.toISOString().split('T')[0],
        duracionMinutos: servicioSel.duracion_minutos,
      })
    }
  }, [fechaSel, barberoSel, servicioSel])

  function avanzar() {
    switch (paso) {
      case 'servicio': if (servicioSel) setPaso('barbero'); break
      case 'barbero': if (barberoSel) setPaso('fecha'); break
      case 'fecha': if (fechaSel) setPaso('horario'); break
      case 'horario': if (horarioSel) setPaso('datos'); break
    }
  }

  async function reservar() {
    if (!servicioSel || !barberoSel || !fechaSel || !horarioSel) return
    if (!cliente.nombre || !cliente.telefono) {
      toast.error('Nombre y teléfono son obligatorios')
      return
    }

    setReservando(true)
    const fecha = fechaSel.toISOString().split('T')[0]
    const horaFin = sumarMinutos(horarioSel, servicioSel.duracion_minutos)

    const { data, error } = await supabase.rpc('reservar_turno', {
      p_barbero_id: barberoSel.id,
      p_servicio_id: servicioSel.id,
      p_fecha: fecha,
      p_hora_inicio: horarioSel,
      p_hora_fin: horaFin,
      p_cliente_nombre: cliente.nombre,
      p_cliente_telefono: cliente.telefono,
      p_cliente_email: cliente.email || null,
      p_notas: cliente.notas || null,
    })

    setReservando(false)

    if (error) {
      toast.error(error.message)
      return
    }

    const res = data as { exito: boolean; cita_id?: string; mensaje?: string; error?: string }

    if (res.exito) {
      setPaso('confirmacion')
      toast.success('Cita reservada exitosamente')
    } else {
      toast.error(res.error || 'Error al reservar')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="flex justify-between mb-8">
          {['servicio', 'barbero', 'fecha', 'horario', 'datos'].map((p, i) => {
            const pasos = ['servicio', 'barbero', 'fecha', 'horario', 'datos']
            const idx = pasos.indexOf(paso)
            const isActive = i <= idx
            const isCurrent = pasos[i] === paso
            return (
              <div key={p} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-400'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs mt-1 ${isCurrent ? 'text-primary font-medium' : 'text-gray-400'}`}>
                  {p === 'servicio' ? 'Servicio' : p === 'barbero' ? 'Barbero' : p === 'fecha' ? 'Fecha' : p === 'horario' ? 'Hora' : 'Datos'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Paso: Servicio */}
        {paso === 'servicio' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="h-5 w-5" /> Selecciona un Servicio</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {servicios.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setServicioSel(s); setBarberoSel(null); setFechaSel(null); setHorarioSel(null) }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    servicioSel?.id === s.id ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{s.nombre}</p>
                      {s.descripcion && <p className="text-sm text-muted-foreground">{s.descripcion}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${s.precio.toLocaleString('es-CL')}</p>
                      <p className="text-xs text-muted-foreground">{s.duracion_minutos} min</p>
                    </div>
                  </div>
                </button>
              ))}
              <Button className="w-full" onClick={avanzar} disabled={!servicioSel}>Continuar</Button>
            </CardContent>
          </Card>
        )}

        {/* Paso: Barbero */}
        {paso === 'barbero' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Selecciona un Barbero</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {barberos.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setBarberoSel(b); setFechaSel(null); setHorarioSel(null) }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    barberoSel?.id === b.id ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500">
                      {b.nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{b.nombre}</p>
                      {b.biografia && <p className="text-sm text-muted-foreground">{b.biografia}</p>}
                    </div>
                  </div>
                </button>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPaso('servicio')}>Atrás</Button>
                <Button className="flex-1" onClick={avanzar} disabled={!barberoSel}>Continuar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso: Fecha */}
        {paso === 'fecha' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Selecciona una Fecha</CardTitle></CardHeader>
            <CardContent>
              <Calendario
                fechaSeleccionada={fechaSel}
                onFechaChange={(d) => { setFechaSel(d); setHorarioSel(null) }}
              />
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setPaso('barbero')}>Atrás</Button>
                <Button className="flex-1" onClick={avanzar} disabled={!fechaSel}>Continuar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso: Horario */}
        {paso === 'horario' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Selecciona un Horario</CardTitle></CardHeader>
            <CardContent>
              {cargando ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : error ? (
                <p className="text-red-500 text-center py-8">{error}</p>
              ) : slots.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay horarios disponibles para esta fecha</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(s => (
                    <button
                      key={s.hora}
                      onClick={() => setHorarioSel(s.hora)}
                      className={`p-3 text-sm rounded-lg border transition-colors ${
                        horarioSel === s.hora ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-gray-300'
                      }`}
                    >
                      {s.hora}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setPaso('fecha')}>Atrás</Button>
                <Button className="flex-1" onClick={avanzar} disabled={!horarioSel}>Continuar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso: Datos del cliente */}
        {paso === 'datos' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Tus Datos</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <p><strong>Servicio:</strong> {servicioSel?.nombre}</p>
                <p><strong>Barbero:</strong> {barberoSel?.nombre}</p>
                <p><strong>Fecha:</strong> {fechaSel?.toLocaleDateString('es-CL')}</p>
                <p><strong>Hora:</strong> {horarioSel}</p>
                <p><strong>Total:</strong> ${servicioSel?.precio.toLocaleString('es-CL')}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={cliente.nombre} onChange={e => setCliente(p => ({ ...p, nombre: e.target.value }))} required />
                </div>
                <div>
                  <Label>Teléfono *</Label>
                  <Input value={cliente.telefono} onChange={e => setCliente(p => ({ ...p, telefono: e.target.value }))} type="tel" required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={cliente.email} onChange={e => setCliente(p => ({ ...p, email: e.target.value }))} type="email" />
                </div>
                <div>
                  <Label>Notas</Label>
                  <Input value={cliente.notas} onChange={e => setCliente(p => ({ ...p, notas: e.target.value }))} placeholder="Ej: Prefiero degradado suave" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setPaso('horario')}>Atrás</Button>
                <Button className="flex-1" onClick={reservar} disabled={reservando || !cliente.nombre || !cliente.telefono}>
                  {reservando ? 'Reservando...' : 'Reservar y Pagar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmación */}
        {paso === 'confirmacion' && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">¡Cita Confirmada!</h2>
              <p className="text-muted-foreground mb-2">
                {servicioSel?.nombre} con {barberoSel?.nombre}
              </p>
              <p className="text-muted-foreground mb-6">
                {fechaSel?.toLocaleDateString('es-CL')} a las {horarioSel}
              </p>
              <Button onClick={() => navigate('/')}>Volver al Inicio</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + minutos
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
