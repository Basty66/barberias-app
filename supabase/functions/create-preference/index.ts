import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
const PUBLIC_URL = Deno.env.get('PUBLIC_URL') || Deno.env.get('VITE_PUBLIC_URL') || 'http://localhost:5173'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''

serve(async (req) => {
  try {
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'Falta MERCADO_PAGO_ACCESS_TOKEN' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { citaId, titulo, precio, cantidad = 1 } = await req.json()
    if (!citaId || !titulo || !precio) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos: citaId, titulo, precio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const webhookUrl = SUPABASE_URL
      ? `${SUPABASE_URL}/functions/v1/mercadopago-webhook`
      : `${PUBLIC_URL}/api/mercadopago-webhook`

    const response = await fetch('https://api.mercadopago.com/v1/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [{
          id: citaId,
          title: titulo,
          quantity: cantidad,
          unit_price: precio,
          currency_id: 'CLP',
        }],
        back_urls: {
          success: `${PUBLIC_URL}/reserva?status=approved&collection_id=${citaId}`,
          failure: `${PUBLIC_URL}/reserva?status=failure`,
          pending: `${PUBLIC_URL}/reserva?status=pending`,
        },
        auto_return: 'approved',
        notification_url: webhookUrl,
        external_reference: citaId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Error en Mercado Pago' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      init_point: data.init_point,
      preference_id: data.id,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
