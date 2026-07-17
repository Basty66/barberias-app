# Sistema de Notificaciones

## Arquitectura

```
┌──────────────┐      ┌──────────────────┐      ┌─────────────────┐
│ Supabase     │      │ Edge Function    │      │ Push Service    │
│ Realtime     │─────►│ enviar-push      │─────►│ (Web Push API)  │
│ (WS nativo)  │      │                  │      │                 │
└──────┬───────┘      └──────────────────┘      └────────┬────────┘
       │                                                 │
       ▼                                                 ▼
┌──────────────┐                              ┌─────────────────┐
│ Notificación │                              │ Push PWA        │
│ In-App       │                              │ (Service Worker)│
│ (Panel)      │                              │ (Staff celular) │
└──────────────┘                              └─────────────────┘
```

## 1. Notificaciones In-App (Tiempo Real)

### Supabase Realtime
```typescript
// Suscripción a nuevas citas para el barbero
const canal = supabase
  .channel('citas-tiempo-real')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'citas',
      filter: `barbero_id=eq.${barberoId}`
    },
    (payload) => {
      // Crear notificación in-app
      crearNotificacion({
        perfil_id: perfilId,
        titulo: 'Nueva reserva',
        mensaje: `${payload.new.cliente_nombre} reservó un turno`,
        tipo: 'nueva_cita',
        metadata: { cita_id: payload.new.id }
      });
    }
  )
  .subscribe();
```

### Componente NotificationBell
```typescript
function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);

  // Cargar no leídas
  useEffect(() => {
    supabase
      .from('notificaciones')
      .select('*')
      .eq('perfil_id', perfilId)
      .eq('leida', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotificaciones(data);
        setNoLeidas(data.length);
      });
  }, []);

  return (
    <button className="relative">
      <BellIcon />
      {noLeidas > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
          {noLeidas}
        </span>
      )}
    </button>
  );
}
```

## 2. Notificaciones Push PWA

### Suscripción desde el Panel
```typescript
async function suscribirPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  // Guardar en Supabase
  await supabase.from('push_subscriptions').insert({
    perfil_id: perfilId,
    endpoint: subscription.endpoint,
    keys: subscription.toJSON().keys
  });
}
```

### Edge Function: enviar-push
```typescript
// supabase/functions/enviar-push/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { WebPush } from 'https://deno.land/x/web_push@v1.0.0/mod.ts';

serve(async (req) => {
  const { titulo, mensaje, perfilIds } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Obtener suscripciones de los perfiles destino
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('perfil_id', perfilIds);

  // Enviar push a cada suscripción
  for (const sub of subs) {
    await WebPush.sendNotification({
      endpoint: sub.endpoint,
      keys: sub.keys,
      payload: JSON.stringify({ title: titulo, body: mensaje }),
      vapid: {
        subject: `mailto:${Deno.env.get('VAPID_EMAIL')}`,
        publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
        privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!
      }
    });
  }

  return new Response('OK', { status: 200 });
});
```

## 3. Recordatorio Diario (pg_cron)

```sql
-- Programar recordatorio diario a las 8:00 AM
SELECT cron.schedule(
  'recordatorio-diario',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('supabase.functions_url') || '/recordatorio-diario',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.anon_key')
      ),
      body := '{}'
    ) AS request_id;
  $$
);
```

### Edge Function: recordatorio-diario
```typescript
// supabase/functions/recordatorio-diario/index.ts
serve(async (req) => {
  const supabase = createClient(...);

  const hoy = new Date().toISOString().split('T')[0];

  // Buscar citas de hoy que no tengan recordatorio enviado
  const { data: citas } = await supabase
    .from('citas')
    .select('*, barberos(profile_id)')
    .eq('fecha', hoy)
    .in('estado', ['pagada', 'confirmada'])
    .not('id', 'in', (
      supabase.from('notificaciones_enviadas')
        .select('cita_id')
        .eq('tipo', 'recordatorio_dia')
    ));

  for (const cita of citas) {
    // Notificación in-app para el barbero
    await supabase.from('notificaciones').insert({
      perfil_id: cita.barberos.profile_id,
      titulo: 'Recordatorio: Cita hoy',
      mensaje: `${cita.cliente_nombre} - ${cita.hora_inicio}`,
      tipo: 'recordatorio',
      metadata: { cita_id: cita.id }
    });

    // Registrar envío
    await supabase.from('notificaciones_enviadas').insert({
      cita_id: cita.id,
      tipo: 'recordatorio_dia'
    });
  }

  return new Response('OK', { status: 200 });
});
```

## Tablas del Sistema

| Tabla | Propósito |
|-------|-----------|
| `notificaciones` | Notificaciones in-app (leída/no leída, tipo) |
| `push_subscriptions` | Suscripciones push PWA por perfil |
| `notificaciones_enviadas` | Control de envíos para evitar duplicados |
