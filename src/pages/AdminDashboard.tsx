import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Cita } from '../types'
import AdminLayout from '../components/layout/AdminLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { CalendarDays, Scissors, DollarSign, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const [citasHoy, setCitasHoy] = useState<Cita[]>([])
  const [stats, setStats] = useState({ hoy: 0, confirmadas: 0, completadas: 0, ingresosHoy: 0 })
  const [servicios, setServicios] = useState<Record<string, string>>({})
  const [barberos, setBarberos] = useState<Record<string, string>>({})

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const hoy = new Date().toISOString().split('T')[0]

    const [citas, svc, brb] = await Promise.all([
      supabase.from('citas').select('*').eq('fecha', hoy).order('hora_inicio'),
      supabase.from('servicios').select('id, nombre').eq('activo', true),
      supabase.from('barberos').select('id, nombre').eq('activo', true),
    ])

    if (citas.data) setCitasHoy(citas.data)
    if (svc.data) setServicios(Object.fromEntries(svc.data.map(s => [s.id, s.nombre])))
    if (brb.data) setBarberos(Object.fromEntries(brb.data.map(b => [b.id, b.nombre])))

    if (citas.data) {
      setStats({
        hoy: citas.data.length,
        confirmadas: citas.data.filter(c => c.estado === 'confirmada').length,
        completadas: citas.data.filter(c => c.estado === 'completada').length,
        ingresosHoy: citas.data
          .filter(c => c.estado === 'pagada' || c.estado === 'completada' || c.estado === 'confirmada')
          .reduce((sum, c) => sum + (c.monto_pagado || 0), 0),
      })
    }
  }

  async function cambiarEstado(citaId: string, estado: string) {
    const { error } = await supabase.from('citas').update({ estado }).eq('id', citaId)
    if (error) { toast.error(error.message); return }
    toast.success(`Cita ${estado === 'confirmada' ? 'confirmada' : estado === 'completada' ? 'completada' : estado === 'no_show' ? 'marcada como no asistió' : ''}`)
    cargarDatos()
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[estado] || 'bg-gray-100 text-gray-500'}`}>
        {estado}
      </span>
    )
  }

  return (
    <ProtectedRoute roles={['admin', 'barbero']}>
      <AdminLayout>
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Citas Hoy</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.hoy}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confirmadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.confirmadas}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completadas</CardTitle>
              <Scissors className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.completadas}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Hoy</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${(stats.ingresosHoy || 0).toLocaleString('es-CL')}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Citas de Hoy</CardTitle></CardHeader>
          <CardContent>
            {citasHoy.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay citas para hoy</p>
            ) : (
              <div className="space-y-3">
                {citasHoy.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{c.hora_inicio.slice(0, 5)}</span>
                        <span className="text-sm">{c.cliente_nombre}</span>
                        {statusBadge(c.estado)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(barberos[c.barbero_id] || '—')} · {(servicios[c.servicio_id] || '—')} · {c.cliente_telefono}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {c.estado === 'pagada' && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => cambiarEstado(c.id, 'confirmada')}>
                          Confirmar
                        </Button>
                      )}
                      {c.estado === 'confirmada' && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => cambiarEstado(c.id, 'completada')}>
                          Completar
                        </Button>
                      )}
                      {(c.estado === 'pagada' || c.estado === 'confirmada') && (
                        <Button size="sm" variant="outline" className="text-xs text-red-500" onClick={() => cambiarEstado(c.id, 'no_show')}>
                          No asistió
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AdminLayout>
    </ProtectedRoute>
  )
}
