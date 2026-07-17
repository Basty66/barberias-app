import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export default function usePushSubscription() {
  const { profile } = useAuth()
  const [suscripto, setSuscripto] = useState(false)
  const [soportado, setSoportado] = useState(true)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSoportado(false)
      return
    }
    verificarSuscripcion()
  }, [profile])

  async function verificarSuscripcion() {
    if (!profile) return
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    setSuscripto(!!sub)
  }

  async function suscribir() {
    if (!VAPID_PUBLIC_KEY) {
      toast.error('Falta clave VAPID del servidor')
      return
    }
    if (!profile) {
      toast.error('Debes iniciar sesión')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Permiso de notificaciones denegado')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subJSON = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').insert({
        perfil_id: profile.id,
        endpoint: subJSON.endpoint,
        keys: subJSON.keys,
      })

      if (error) { toast.error(error.message); return }
      setSuscripto(true)
      toast.success('Notificaciones push activadas')
    } catch {
      toast.error('Error al activar notificaciones push')
    }
  }

  async function desuscribir() {
    if (!profile) return
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      await sub?.unsubscribe()

      await supabase.from('push_subscriptions').delete().eq('perfil_id', profile.id)
      setSuscripto(false)
      toast.success('Notificaciones push desactivadas')
    } catch {
      toast.error('Error al desactivar notificaciones')
    }
  }

  return { soportado, suscripto, suscribir, desuscribir }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array(raw.length).map((_, i) => raw.charCodeAt(i))
}
