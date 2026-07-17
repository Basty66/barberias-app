import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Servicio } from '../types'
import AdminLayout from '../components/layout/AdminLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { Button } from '../components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Plus, Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminServicios() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Servicio | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', duracion_minutos: '' })

  useEffect(() => { cargarServicios() }, [])

  async function cargarServicios() {
    const { data } = await supabase.from('servicios').select('*').order('nombre')
    if (data) setServicios(data)
  }

  function abrirEdicion(s: Servicio) {
    setEditando(s)
    setForm({ nombre: s.nombre, descripcion: s.descripcion || '', precio: String(s.precio), duracion_minutos: String(s.duracion_minutos) })
    setOpen(true)
  }

  function resetForm() {
    setEditando(null)
    setForm({ nombre: '', descripcion: '', precio: '', duracion_minutos: '' })
  }

  async function guardar() {
    if (!form.nombre || !form.precio || !form.duracion_minutos) {
      toast.error('Completa los campos obligatorios'); return
    }
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      precio: parseInt(form.precio),
      duracion_minutos: parseInt(form.duracion_minutos),
    }

    if (editando) {
      const { error } = await supabase.from('servicios').update(payload).eq('id', editando.id)
      if (error) { toast.error(error.message); return }
      toast.success('Servicio actualizado')
    } else {
      const { error } = await supabase.from('servicios').insert(payload)
      if (error) { toast.error(error.message); return }
      toast.success('Servicio creado')
    }
    setOpen(false)
    cargarServicios()
  }

  async function toggleActivo(s: Servicio) {
    await supabase.from('servicios').update({ activo: !s.activo }).eq('id', s.id)
    cargarServicios()
  }

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminLayout>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Servicios</h1>
            <p className="text-muted-foreground">Gestiona los servicios de la barbería</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => { if (isOpen) resetForm(); setOpen(isOpen) }}>
            <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" /> Nuevo Servicio</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editando ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Precio ($CLP) *</Label>
                    <Input type="number" value={form.precio} onChange={e => setForm(p => ({ ...p, precio: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Duración (min) *</Label>
                    <Input type="number" value={form.duracion_minutos} onChange={e => setForm(p => ({ ...p, duracion_minutos: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={guardar} className="w-full">
                  {editando ? 'Guardar Cambios' : 'Crear Servicio'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicios.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell>${s.precio.toLocaleString('es-CL')}</TableCell>
                  <TableCell>{s.duracion_minutos} min</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicion(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActivo(s)}>
                        <Power className={`h-4 w-4 ${s.activo ? 'text-green-600' : 'text-red-500'}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {servicios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay servicios registrados. Crea tu primer servicio.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}
