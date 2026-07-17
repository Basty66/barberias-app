import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AdminLayout from '../components/layout/AdminLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Search, Phone, User, Calendar, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Cita } from '../types'

export default function AdminHistorial() {
  const [telefono, setTelefono] = useState('')
  const [citas, setCitas] = useState<Cita[]>([])
  const [servicios, setServicios] = useState<Record<string, string>>({})
  const [barberos, setBarberos] = useState<Record<string, string>>({})
  const [buscado, setBuscado] = useState(false)

  useEffect(() => {
    supabase.from('servicios').select('id, nombre').eq('activo', true).then(({ data }) => {
      if (data) setServicios(Object.fromEntries(data.map(s => [s.id, s.nombre])))
    })
    supabase.from('barberos').select('id, nombre').eq('activo', true).then(({ data }) => {
      if (data) setBarberos(Object.fromEntries(data.map(b => [b.id, b.nombre])))
    })
  }, [])

  async function buscar() {
    if (!telefono.trim()) return
    const { data } = await supabase
      .from('citas')
      .select('*')
      .eq('cliente_telefono', telefono.trim())
      .order('fecha', { ascending: false })
      .limit(50)

    if (data) setCitas(data)
    setBuscado(true)
  }

  const statusBadge = (estado: string) => {
    const classes: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-700',
      pagada: 'bg-blue-100 text-blue-700',
      confirmada: 'bg-green-100 text-green-700',
      completada: 'bg-gray-100 text-gray-700',
      no_show: 'bg-red-100 text-red-700',
      cancelada: 'bg-red-50 text-red-500',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classes[estado] || 'bg-gray-100 text-gray-500'}`}>
        {estado}
      </span>
    )
  }

  const clienteInfo = citas.length > 0 ? citas[0] : null

  return (
    <ProtectedRoute roles={['admin', 'barbero']}>
      <AdminLayout>
        <h1 className="text-3xl font-bold mb-6">Historial del Cliente</h1>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por teléfono..."
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              className="pl-9"
            />
          </div>
          <Button onClick={buscar}>
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
        </div>

        {buscado && citas.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No se encontraron citas para este teléfono</p>
        )}

        {clienteInfo && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-lg">{clienteInfo.cliente_nombre}</p>
                  <p className="text-sm text-muted-foreground">{clienteInfo.cliente_telefono}</p>
                  {clienteInfo.cliente_email && (
                    <p className="text-sm text-muted-foreground">{clienteInfo.cliente_email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {citas.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Citas ({citas.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {citas.map(c => (
                <div key={c.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{format(new Date(c.fecha), "d MMM yyyy", { locale: es })}</span>
                      <span className="text-sm">{c.hora_inicio.slice(0, 5)} - {c.hora_fin.slice(0, 5)}</span>
                      {statusBadge(c.estado)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {servicios[c.servicio_id] || '—'} · {barberos[c.barbero_id] || '—'}
                      {c.monto_pagado ? ` · $${c.monto_pagado.toLocaleString('es-CL')}` : ''}
                    </p>
                    {c.notas && (
                      <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{c.notas}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </AdminLayout>
    </ProtectedRoute>
  )
}
