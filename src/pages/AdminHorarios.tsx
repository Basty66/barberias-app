import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Barbero, HorarioBarbero, BloqueoHorario, HorarioEspecial } from '../types'
import AdminLayout from '../components/layout/AdminLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Switch } from '../components/ui/switch'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function AdminHorarios() {
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [horarios, setHorarios] = useState<HorarioBarbero[]>([])
  const [bloqueos, setBloqueos] = useState<BloqueoHorario[]>([])
  const [especiales, setEspeciales] = useState<HorarioEspecial[]>([])

  useEffect(() => {
    cargarBarberos(); cargarHorarios(); cargarBloqueos(); cargarEspeciales()
  }, [])

  async function cargarBarberos() {
    const { data } = await supabase.from('barberos').select('*').eq('activo', true).order('nombre')
    if (data) setBarberos(data)
  }

  async function cargarHorarios() {
    const { data } = await supabase.from('horarios_barberos').select('*').eq('activo', true).order('dia_semana').order('hora_inicio')
    if (data) setHorarios(data)
  }

  async function cargarBloqueos() {
    const { data } = await supabase.from('bloqueos_horarios').select('*').gte('fecha', new Date().toISOString().split('T')[0]).order('fecha')
    if (data) setBloqueos(data)
  }

  async function cargarEspeciales() {
    const { data } = await supabase.from('horarios_especiales').select('*').order('fecha')
    if (data) setEspeciales(data)
  }

  function getHorario(barberoId: string, dia: number): HorarioBarbero | undefined {
    return horarios.find(h => h.barbero_id === barberoId && h.dia_semana === dia)
  }

  async function actualizarHorario(barberoId: string, dia: number, inicio: string, fin: string) {
    const existente = getHorario(barberoId, dia)
    if (!inicio || !fin) {
      if (existente) {
        await supabase.from('horarios_barberos').update({ activo: false }).eq('id', existente.id)
        toast.success('Horario eliminado')
      }
      cargarHorarios(); return
    }
    if (fin <= inicio) { toast.error('La hora de fin debe ser mayor a la de inicio'); return }

    if (existente) {
      await supabase.from('horarios_barberos').update({ hora_inicio: inicio, hora_fin: fin }).eq('id', existente.id)
    } else {
      await supabase.from('horarios_barberos').insert({ barbero_id: barberoId, dia_semana: dia, hora_inicio: inicio, hora_fin: fin })
    }
    toast.success('Horario actualizado'); cargarHorarios()
  }

  async function agregarBloqueo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const payload: any = {
      barbero_id: data.get('barbero_id'),
      fecha: data.get('fecha'),
      motivo: data.get('motivo') || null,
      todo_el_dia: data.get('todo_el_dia') === 'on',
    }
    if (!payload.todo_el_dia) {
      payload.hora_inicio = data.get('hora_inicio')
      payload.hora_fin = data.get('hora_fin')
      if (!payload.hora_inicio || !payload.hora_fin) { toast.error('Completa las horas'); return }
    }
    const { error } = await supabase.from('bloqueos_horarios').insert(payload)
    if (error) { toast.error(error.message); return }
    toast.success('Bloqueo agregado'); cargarBloqueos(); e.currentTarget.reset()
  }

  async function eliminarBloqueo(id: string) {
    await supabase.from('bloqueos_horarios').delete().eq('id', id)
    cargarBloqueos()
  }

  async function agregarEspecial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const payload: any = { fecha: data.get('fecha'), motivo: data.get('motivo') || null }
    payload.cerrado = data.get('cerrado') === 'on'
    if (!payload.cerrado) {
      payload.hora_apertura = data.get('hora_apertura')
      payload.hora_cierre = data.get('hora_cierre')
    }
    const { error } = await supabase.from('horarios_especiales').insert(payload)
    if (error) { toast.error(error.message); return }
    toast.success('Horario especial agregado'); cargarEspeciales(); e.currentTarget.reset()
  }

  async function eliminarEspecial(id: string) {
    await supabase.from('horarios_especiales').delete().eq('id', id)
    cargarEspeciales()
  }

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminLayout>
        <h1 className="text-3xl font-bold mb-2">Horarios</h1>
        <p className="text-muted-foreground mb-6">Configura horarios base, días libres y horarios especiales</p>

        <Tabs defaultValue="base">
          <TabsList className="mb-6">
            <TabsTrigger value="base">Horarios Base</TabsTrigger>
            <TabsTrigger value="bloqueos">Días Libres</TabsTrigger>
            <TabsTrigger value="especiales">Horarios Especiales</TabsTrigger>
          </TabsList>

          <TabsContent value="base">
            <Card>
              <CardHeader><CardTitle>Horarios Semanales</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2 font-medium">Barbero</th>
                        {DIAS.map((d, i) => (
                          <th key={d} className={`p-2 font-medium text-center ${i === 0 || i === 6 ? 'text-red-500' : ''}`}>{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {barberos.map(b => (
                        <tr key={b.id} className="border-t">
                          <td className="p-2 font-medium">{b.nombre}</td>
                          {DIAS.map((_, dia) => {
                            const h = getHorario(b.id, dia)
                            return (
                              <td key={dia} className="p-1">
                                <div className="flex flex-col gap-1">
                                  <Input
                                    type="time"
                                    defaultValue={h?.hora_inicio || ''}
                                    className="h-8 text-xs"
                                    onChange={e => {
                                      const fin = (e.currentTarget.parentElement?.querySelector('.hora-fin') as HTMLInputElement)?.value
                                      actualizarHorario(b.id, dia, e.target.value, fin || '')
                                    }}
                                    placeholder="Inicio"
                                  />
                                  <Input
                                    type="time"
                                    defaultValue={h?.hora_fin || ''}
                                    className="h-8 text-xs hora-fin"
                                    onChange={e => {
                                      const inicio = (e.currentTarget.parentElement?.querySelector('input[type="time"]') as HTMLInputElement)?.value
                                      actualizarHorario(b.id, dia, inicio || '', e.target.value)
                                    }}
                                    placeholder="Fin"
                                  />
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bloqueos">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Agregar Bloqueo</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={agregarBloqueo} className="space-y-4">
                    <div>
                      <Label>Barbero</Label>
                      <select name="barbero_id" required className="w-full h-10 px-3 border rounded-lg text-sm bg-white">
                        {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" name="fecha" required />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch name="todo_el_dia" />
                      <Label>Todo el día</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Desde</Label>
                        <Input type="time" name="hora_inicio" />
                      </div>
                      <div>
                        <Label>Hasta</Label>
                        <Input type="time" name="hora_fin" />
                      </div>
                    </div>
                    <div>
                      <Label>Motivo</Label>
                      <Input name="motivo" placeholder="Ej: Vacaciones, médico..." />
                    </div>
                    <Button type="submit" className="w-full">Agregar Bloqueo</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Bloqueos Activos</CardTitle></CardHeader>
                <CardContent>
                  {bloqueos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay bloqueos registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {bloqueos.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">
                              {barberos.find(bb => bb.id === b.barbero_id)?.nombre} — {b.fecha}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {b.todo_el_dia ? 'Todo el día' : `${b.hora_inicio} - ${b.hora_fin}`}
                              {b.motivo && ` · ${b.motivo}`}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => eliminarBloqueo(b.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="especiales">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Agregar Horario Especial</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={agregarEspecial} className="space-y-4">
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" name="fecha" required />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch name="cerrado" />
                      <Label>Cerrado todo el día</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Apertura</Label>
                        <Input type="time" name="hora_apertura" />
                      </div>
                      <div>
                        <Label>Cierre</Label>
                        <Input type="time" name="hora_cierre" />
                      </div>
                    </div>
                    <div>
                      <Label>Motivo</Label>
                      <Input name="motivo" placeholder="Ej: Víspera de Navidad..." />
                    </div>
                    <Button type="submit" className="w-full">Agregar Horario Especial</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Horarios Especiales</CardTitle></CardHeader>
                <CardContent>
                  {especiales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay horarios especiales</p>
                  ) : (
                    <div className="space-y-2">
                      {especiales.map(e => (
                        <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{e.fecha}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.cerrado ? 'Cerrado' : `${e.hora_apertura} - ${e.hora_cierre}`}
                              {e.motivo && ` · ${e.motivo}`}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => eliminarEspecial(e.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </AdminLayout>
    </ProtectedRoute>
  )
}
