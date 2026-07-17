import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const body = await req.json()

    // Solo procesar pagos aprobados
    if (body.type === 'payment') {
      const paymentId = body.data.id

      // Consultar estado del pago en MP
      const mpResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}` } }
      )
      const payment = await mpResponse.json()

      if (payment.status === 'approved') {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Actualizar cita a pagada
        const { error } = await supabase
          .from('citas')
          .update({
            estado: 'pagada',
            pago_id: paymentId.toString(),
            monto_pagado: payment.transaction_amount,
          })
          .eq('id', payment.external_reference)

        if (error) {
          console.error('Error actualizando cita:', error)
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('OK', { status: 200 })
  }
})
