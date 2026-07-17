import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
const MERCADO_PAGO_API = 'https://api.mercadopago.com/v1'

serve(async (req) => {
  try {
    const { citaId, titulo, precio, cantidad = 1 } = await req.json()

    const response = await fetch(`${MERCADO_PAGO_API}/preferences`, {
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
          success: `${Deno.env.get('PUBLIC_URL')}/reserva/exito`,
          failure: `${Deno.env.get('PUBLIC_URL')}/reserva/error`,
          pending: `${Deno.env.get('PUBLIC_URL')}/reserva/pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${Deno.env.get('PUBLIC_URL')}/api/mercadopago-webhook`,
        external_reference: citaId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message }), {
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
