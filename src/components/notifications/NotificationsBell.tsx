import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useNavigate } from 'react-router-dom'

export default function NotificationsBell() {
  const { notificaciones, noLeidas, marcarLeida } = useNotifications()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative outline-none">
        <Bell className="h-5 w-5 text-muted-foreground cursor-pointer" />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notificaciones</span>
          {notificaciones.length > 5 && (
            <button className="text-xs text-primary hover:underline" onClick={() => navigate('/admin/notificaciones')}>
              Ver todas
            </button>
          )}
        </div>
        {notificaciones.slice(0, 5).map(n => (
          <DropdownMenuItem
            key={n.id}
            className={`flex flex-col items-start gap-1 px-3 py-2 cursor-pointer ${!n.leida ? 'bg-muted/50' : ''}`}
            onClick={() => marcarLeida(n.id)}
          >
            <div className="flex items-center gap-2 w-full">
              <span className="text-sm font-medium flex-1">{n.titulo}</span>
              {!n.leida && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{n.mensaje}</p>
          </DropdownMenuItem>
        ))}
        {notificaciones.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Sin notificaciones</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
