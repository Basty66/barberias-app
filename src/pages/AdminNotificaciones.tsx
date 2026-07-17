import AdminLayout from '../components/layout/AdminLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useNotifications } from '../contexts/NotificationsContext'
import { Button } from '../components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCheck, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

export default function AdminNotificaciones() {
  const { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas } = useNotifications()

  async function eliminarNotificacion(id: string) {
    const { error } = await supabase.from('notificaciones').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Notificación eliminada')
  }

  const tipoIcono: Record<string, string> = {
    nueva_cita: '📅',
    pago: '💰',
    recordatorio: '⏰',
    no_show: '❌',
    info: 'ℹ️',
  }

  return (
    <ProtectedRoute roles={['admin', 'barbero']}>
      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Notificaciones</h1>
          {noLeidas > 0 && (
            <Button variant="outline" size="sm" onClick={marcarTodasLeidas}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Historial ({notificaciones.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notificaciones.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sin notificaciones</p>
            ) : (
              notificaciones.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    !n.leida ? 'bg-muted/50 hover:bg-muted/80' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => marcarLeida(n.id)}
                >
                  <span className="text-lg mt-0.5">{tipoIcono[n.tipo] || 'ℹ️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{n.titulo}</span>
                      {!n.leida && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.mensaje}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(n.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => { e.stopPropagation(); eliminarNotificacion(n.id) }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </AdminLayout>
    </ProtectedRoute>
  )
}
