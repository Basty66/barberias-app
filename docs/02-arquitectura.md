# Arquitectura del Sistema

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Cliente (Navegador)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   React App (Vite)                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │  │
│  │  │  Landing  │  │  Reserva  │  │  Panel Admin     │    │  │
│  │  │   Page    │  │   Flow    │  │  (Auth Required) │    │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘    │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │         Service Worker (PWA + Push)          │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │    Supabase Client   │
              │   (@supabase/supabase-js) │
              └──────────┬──────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Supabase Platform                         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │  PostgreSQL  │  │    Auth     │  │    Storage       │    │
│  │  (Base de    │  │  (Usuarios  │  │  (imagenes-      │    │
│  │   Datos)     │  │   y roles)  │  │   barberia)      │    │
│  │             │  │             │  │                  │    │
│  │  - Tablas   │  │  - Login    │  │  - Fotos perfiles│    │
│  │  - RPC      │  │  - Register │  │  - Galería       │    │
│  │  - RLS      │  │  - Reset    │  │  - Logo          │    │
│  │  - pg_cron  │  │    pass     │  │                  │    │
│  └──────┬──────┘  └─────────────┘  └──────────────────┘    │
│         │                                                   │
│  ┌──────┴──────────────────────────────────────────────┐   │
│  │              Edge Functions (Deno)                   │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  │   │
│  │  │create-      │  │mercadopago-  │  │enviar-   │  │   │
│  │  │preference   │  │webhook       │  │push      │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └────┬─────┘  │   │
│  │  ┌──────┴──────┐        │                │        │   │
│  │  │recordatorio-│        │                │        │   │
│  │  │diario       │        │                │        │   │
│  │  └─────────────┘        │                │        │   │
│  └─────────────────────────┼────────────────┼────────┘   │
└────────────────────────────┼────────────────┼────────────┘
                             │                │
                    ┌────────┴────────┐       │
                    │  Mercado Pago   │       │
                    │  API            │       │
                    │  - Checkout Pro │       │
                    │  - Webhooks     │       │
                    └─────────────────┘       │
                                              │
                                     ┌────────┴────────┐
                                     │  Push Service    │
                                     │  (Web Push API)  │
                                     └─────────────────┘
```

## Flujo de Datos

### Flujo de Reserva

```
1. Cliente → Landing Page → Selecciona "Reservar"
2. → Selecciona Servicio
3. → Selecciona Barbero
4. → Selecciona Fecha → Algoritmo calcula horarios disponibles
5. → Selecciona Horario
6. → Formulario Guest Checkout (nombre, teléfono, email)
7. → Edge Function create-preference → URL de pago MP
8. → Cliente paga en modal Mercado Pago
9. → MP envía webhook → Edge Function valida y cambia estado a 'pagada'
10. → Realtime envía notificación al barbero
```

### Flujo de Notificaciones

```
RESERVA EXITOSA:
  INSERT cita (estado='pagada')
    → Trigger crea notificación in-app para el barbero
    → Edge Function enviar-push a barberos suscritos
    → Realtime actualiza panel admin del barbero

RECORDATORIO DIARIO (8:00 AM):
  pg_cron → Edge Function recordatorio-diario
    → Busca citas del día
    → Crea notificaciones in-app
    → Envía push a barberos
    → Registra en notificaciones_enviadas
```

## Decisiones Arquitectónicas

| Decisión | Alternativa | Elegida | Razón |
|----------|-------------|---------|-------|
| Guest Checkout | Registro obligatorio | Sin registro | Menor fricción = más conversión |
| RPC vs Triggers | Triggers SQL | RPC | Validación explícita desde el cliente |
| Edge Functions | Backend separado | Edge Functions | Sin servidor extra que mantener |
| Realtime vs Polling | Polling cada X seg | Realtime | Actualización instantánea, $0 |
| PWA vs App Nativa | React Native | PWA | Instalación sin tiendas, menor costo |
