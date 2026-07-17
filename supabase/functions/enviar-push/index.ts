import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface PushSubscription {
  id: string
  perfil_id: string
  suscripcion: Record<string, unknown>
  created_at: string
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array(raw.length).map((_, i) => raw.charCodeAt(i))
}

async function enviarPush(sub: PushSubscription, titulo: string, cuerpo: string, url?: string) {
  const { suscripcion } = sub
  if (!suscripcion || typeof suscripcion !== 'object' || !('endpoint' in suscripcion)) return false

  const endpoint = suscripcion.endpoint as string
  const keys = suscripcion.keys as { p256dh?: string; auth?: string } | undefined
  if (!keys?.p256dh || !keys?.auth) return false

  try {
    const payload = JSON.stringify({
      title: titulo,
      body: cuerpo,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: url || '/admin' },
    })

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      await crypto.subtle.importKey('raw', urlBase64ToUint8Array(VAPID_PRIVATE_KEY), { name: 'AES-GCM' }, false, ['encrypt']),
      new TextEncoder().encode(payload),
    )

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })

    if (response.status === 410) {
      await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    }

    return response.ok
  } catch {
    return false
  }
}

serve(async (req) => {
  try {
    const { perfilId, titulo, mensaje, url } = await req.json()

    if (!perfilId || !titulo) {
      return new Response(JSON.stringify({ error: 'perfilId y titulo requeridos' }), { status: 400 })
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('perfil_id', perfilId)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ enviadas: 0 }), { status: 200 })
    }

    const results = await Promise.allSettled(
      subs.map(sub => enviarPush(sub as PushSubscription, titulo, mensaje || '', url))
    )

    const enviadas = results.filter(r => r.status === 'fulfilled' && r.value).length

    return new Response(JSON.stringify({ enviadas, total: subs.length }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno' }), { status: 500 })
  }
})
