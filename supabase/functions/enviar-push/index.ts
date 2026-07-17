import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'admin@barberia.app'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface PushSubRow {
  id: string
  perfil_id: string
  endpoint: string
  keys: Record<string, unknown>
  created_at: string
}

async function enviarPush(sub: PushSubRow, titulo: string, cuerpo: string, url?: string) {
  const { endpoint, keys } = sub
  if (!endpoint || !keys || typeof keys !== 'object' || !('p256dh' in keys) || !('auth' in keys)) return false

  const payload = JSON.stringify({
    title: titulo,
    body: cuerpo,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: url || '/admin' },
  })

  const encoder = new TextEncoder()
  const payloadBytes = encoder.encode(payload)

  const p256dh = urlBase64ToUint8Array(keys.p256dh as string)
  const auth = urlBase64ToUint8Array(keys.auth as string)

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits', 'deriveKey'],
  )

  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: await crypto.subtle.importKey(
        'raw', p256dh,
        { name: 'ECDH', namedCurve: 'P-256' },
        true, [],
      ),
    },
    serverKeyPair.privateKey,
    256,
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const prk = await hkdf(salt, sharedSecret, 'Content-Encoding: auth\0', 32)
  const cek = await hkdf(auth, prk, 'Content-Encoding: aesgcm\0', 16)
  const nonce = await hkdf(auth, prk, 'Content-Encoding: nonce\0', 12)

  const serverPublicKey = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: new ArrayBuffer(0), tagLength: 128 },
    await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']),
    payloadBytes,
  )

  const serverPubB64 = btoa(String.fromCharCode(...new Uint8Array(serverPublicKey)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const saltB64 = btoa(String.fromCharCode(...salt))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const vapidJwt = await generarVapidJWT(endpoint)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Encryption': `salt=${saltB64}`,
        'Crypto-Key': `dh=${serverPubB64};p256ecdsa=${urlBase64ToUint8Array(VAPID_PUBLIC_KEY)}`,
        'Authorization': `vapid t=${vapidJwt}, k=${VAPID_PUBLIC_KEY}`,
        'TTL': '86400',
      },
      body: ciphertext,
    })

    if (response.status === 410) {
      await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    }

    return response.ok
  } catch {
    return false
  }
}

async function hkdf(salt: Uint8Array, ikm: ArrayBuffer, info: string, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt,
      info: new TextEncoder().encode(info),
      hash: 'SHA-256',
    },
    key,
    length * 8,
  )
  return new Uint8Array(bits)
}

async function generarVapidJWT(endpoint: string): Promise<string> {
  const url = new URL(endpoint)
  const header = { alg: 'ES256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: `${url.protocol}//${url.host}`,
    exp: now + 86400,
    sub: `mailto:${VAPID_EMAIL}`,
  }

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signatureInput = `${headerB64}.${payloadB64}`

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(VAPID_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signatureInput),
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${signatureInput}.${sigB64}`
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [\w ]+-----/, '').replace(/-----END [\w ]+-----/, '').replace(/\s/g, '')
  const raw = atob(b64)
  return new Uint8Array(raw.length).map((_, i) => raw.charCodeAt(i)).buffer
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array(raw.length).map((_, i) => raw.charCodeAt(i))
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
      subs.map(sub => enviarPush(sub as PushSubRow, titulo, mensaje || '', url))
    )

    const enviadas = results.filter(r => r.status === 'fulfilled' && r.value).length

    return new Response(JSON.stringify({ enviadas, total: subs.length }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno' }), { status: 500 })
  }
})
