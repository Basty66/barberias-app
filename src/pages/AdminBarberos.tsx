import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Barbero, Profile } from '../types'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Plus, Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminBarberos() {
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [perfilesDisponibles, setPerfilesDisponibles] = useState<Profile[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Barbero | null>(null)
  const [form, setForm] = useState({ nombre: '', biografia: '', profile_id: '' })

  useEffect(() => { cargarBarberos(); cargarPerfiles() }, [])

  async function cargarBarberos() {
    const { data } = await supabase.from('barberos').select('*').order('nombre')
    if (data) setBarberos(data)
  }

  async function cargarPerfiles() {
    const idsAsignados = (await supabase.from('barberos').select('profile_id').not('profile_id', 'is', null))
      .data?.map(b => b.profile_id) || []

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .not('id', 'in', `(${idsAsignados.length ? idsAsignados.join(',') : '00000000-0000-0000-0000-000000000000'})`)
    
    if (data) setPerfilesDisponibles(data)
  }

  function abrirEdicion(b: Barbero) {
    setEditando(b)
    setForm({ nombre: b.nombre, biografia: b.biografia || '', profile_id: b.profile_id || '' })
    setOpen(true)
  }

  function resetForm() {
    setEditando(null)
    setForm({ nombre: '', biografia: '', profile_id: '' })
    cargarPerfiles()
  }

  async function guardar() {
    if (!form.nombre) { toast.error('El nombre es obligatorio'); return }
    const payload: any = { nombre: form.nombre, biografia: form.biografia || null }
    if (form.profile_id) payload.profile_id = form.profile_id

    if (editando) {
      const { error } = await supabase.from('barberos').update(payload).eq('id', editando.id)
      if (error) { toast.error(error.message); return }
      toast.success('Barbero actualizado')
    } else {
      const { error } = await supabase.from('barberos').insert(payload)
      if (error) { toast.error(error.message); return }
      toast.success('Barbero creado')
    }
    setOpen(false); cargarBarberos()
  }

  async function toggleActivo(b: Barbero) {
    await supabase.from('barberos').update({ activo: !b.activo }).eq('id', b.id)
    cargarBarberos()
  }

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminLayout>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Barberos</h1>
            <p className="text-muted-foreground">Gestiona el staff de la barbería</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => { if (isOpen) resetForm(); setOpen(isOpen) }}>
            <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" /> Nuevo Barbero</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editando ? 'Editar Barbero' : 'Nuevo Barbero'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div>
                  <Label>Biografía</Label>
                  <Textarea value={form.biografia} onChange={e => setForm(p => ({ ...p, biografia: e.target.value }))} />
                </div>
                <div>
                  <Label>Vincular usuario</Label>
                  <Select value={form.profile_id} onValueChange={v => setForm(p => ({ ...p, profile_id: v ?? '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {perfilesDisponibles.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre} ({p.rol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={guardar} className="w-full">
                  {editando ? 'Guardar Cambios' : 'Crear Barbero'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barbero</TableHead>
                <TableHead>Biografía</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barberos.map(b => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={b.foto_url || undefined} />
                        <AvatarFallback>{b.nombre.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{b.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {b.biografia || '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      b.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {b.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicion(b)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActivo(b)}>
                        <Power className={`h-4 w-4 ${b.activo ? 'text-green-600' : 'text-red-500'}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {barberos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No hay barberos registrados.
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
