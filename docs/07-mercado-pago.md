# Integración Mercado Pago

## Arquitectura de Pagos

```
Frontend (React)                  Supabase Edge Functions          Mercado Pago API
     │                                    │                             │
     │  1. POST /create-preference        │                             │
     ├───────────────────────────────────►│                             │
     │                                    │  2. POST /preferences       │
     │                                    ├────────────────────────────►│
     │                                    │  3. init_point + id        │
     │                                    │◄────────────────────────────┤
     │  4. { init_point }                 │                             │
     │◄───────────────────────────────────┤                             │
     │                                    │                             │
     │  5. Abre Checkout Pro              │                             │
     ├─────────────────────────────────────────────────────────────────►│
     │  6. Usuario paga                   │                             │
     │◄─────────────────────────────────────────────────────────────────┤
     │                                    │                             │
     │  7. POST /webhook                  │                             │
     │                                    │◄────────────────────────────┤
     │                                    │  8. Validar firma           │
     │                                    │  9. UPDATE cita → 'pagada' │
     │                                    │                             │
```

## Edge Function: create-preference

```typescript
// supabase/functions/create-preference/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { MercadoPagoConfig, Preference } from 'npm:mercadopago';

const mercadopago = new MercadoPagoConfig({
  accessToken: Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
});

serve(async (req) => {
  const { citaId, titulo, precio, cantidad } = await req.json();

  const preference = new Preference(mercadopago);
  const result = await preference.create({
    body: {
      items: [{
        id: citaId,
        title: titulo,
        quantity: cantidad || 1,
        unit_price: precio,
        currency_id: 'CLP'
      }],
      back_urls: {
        success: `${Deno.env.get('PUBLIC_URL')}/reserva/exito`,
        failure: `${Deno.env.get('PUBLIC_URL')}/reserva/error`,
        pending: `${Deno.env.get('PUBLIC_URL')}/reserva/pendiente`
      },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('PUBLIC_URL')}/api/mercadopago-webhook`
    }
  });

  return new Response(
    JSON.stringify({ init_point: result.init_point, preference_id: result.id }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## Edge Function: mercadopago-webhook

```typescript
// supabase/functions/mercadopago-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const body = await req.json();

  // Validar tipo de notificación
  if (body.type === 'payment') {
    const paymentId = body.data.id;

    // Consultar estado del pago en MP
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}` } }
    );
    const payment = await response.json();

    if (payment.status === 'approved') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Actualizar cita
      await supabase
        .from('citas')
        .update({
          estado: 'pagada',
          pago_id: paymentId.toString(),
          monto_pagado: payment.transaction_amount
        })
        .eq('id', payment.external_reference);
    }
  }

  return new Response('OK', { status: 200 });
});
```

## Webhook Security

Mercado Pago envía notificaciones con un header `X-Signature`. Validar usando el client_secret.

```typescript
function validarFirma(req: Request, body: string): boolean {
  const xSignature = req.headers.get('x-signature');
  const ts = req.headers.get('x-request-id');
  // Implementar validación HMAC con client_secret
  // Ver: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
  return true; // Implementar según docs MP
}
```

## Cron Job: Limpieza de Citas Pendientes

```sql
-- Programar cada 15 minutos
SELECT cron.schedule(
  'limpiar-citas-pendientes',
  '*/15 * * * *',
  $$
  DELETE FROM citas
  WHERE estado = 'pendiente'
    AND created_at < NOW() - INTERVAL '15 minutes';
  $$
);
```

## Configuración de Credenciales

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `MERCADO_PAGO_ACCESS_TOKEN` | Token de producción | Dashboard MP → Desarrollo → Credenciales |
| `MERCADO_PAGO_PUBLIC_KEY` | Key pública para frontend | Dashboard MP → Desarrollo → Credenciales |
| `PUBLIC_URL` | URL del sitio en producción | Vercel |
