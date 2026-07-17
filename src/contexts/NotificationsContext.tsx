import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Notificacion } from '../types'

interface NotificationsContextType {
  notificaciones: Notificacion[]
  noLeidas: number
  marcarLeida: (id: string) => Promise<void>
  marcarTodasLeidas: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType>({
  notificaciones: [],
  noLeidas: 0,
  marcarLeida: async () => {},
  marcarTodasLeidas: async () => {},
})

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])

  useEffect(() => {
    if (!profile) return

    cargarNotificaciones()

    const canal = supabase
      .channel('notificaciones-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `perfil_id=eq.${profile.id}`,
        },
        (payload) => {
          const nueva = payload.new as Notificacion
          setNotificaciones(prev => [nueva, ...prev])
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [profile])

  async function cargarNotificaciones() {
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('perfil_id', profile!.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setNotificaciones(data)
  }

  async function marcarLeida(id: string) {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  async function marcarTodasLeidas() {
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('perfil_id', profile!.id)
      .eq('leida', false)
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  const noLeidas = notificaciones.filter(n => !n.leida).length

  return (
    <NotificationsContext.Provider value={{ notificaciones, noLeidas, marcarLeida, marcarTodasLeidas }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
