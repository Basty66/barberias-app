# Despliegue en Vercel

## Preparación

### 1. Variables de Entorno

| Variable | Valor | ¿Dónde se obtiene? |
|----------|-------|-------------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase → Settings → API |
| `VITE_MERCADO_PAGO_PUBLIC_KEY` | `TEST-xxxxx` o `APP_USR-xxxxx` | MP → Credenciales |
| `VITE_PUBLIC_URL` | URL del deploy | Vercel (después del primer deploy) |
| `VITE_VAPID_PUBLIC_KEY` | Generada con web-push | `npx web-push generate-vapid-keys` |

### 2. Edge Functions

Las Edge Functions se despliegan con el CLI de Supabase:
```bash
supabase functions deploy create-preference
supabase functions deploy mercadopago-webhook
supabase functions deploy enviar-push
supabase functions deploy recordatorio-diario
```

Configurar secrets para las Edge Functions:
```bash
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxx
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role key, NUNCA la anónima)
supabase secrets set VAPID_PUBLIC_KEY=xxxx
supabase secrets set VAPID_PRIVATE_KEY=xxxx
```

## Despliegue en Vercel

### Paso 1: Conectar Repositorio
1. Ir a [vercel.com](https://vercel.com)
2. "Add New Project" → Importar repositorio GitHub `barberias-app`
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`

### Paso 2: Configurar Variables de Entorno
En Vercel Dashboard → Project Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MERCADO_PAGO_PUBLIC_KEY`
- `VITE_PUBLIC_URL`
- `VITE_VAPID_PUBLIC_KEY`

### Paso 3: Deploy
Vercel hace deploy automático con cada push a `main`.

## Post-Despliegue

### Configurar Dominio Personalizado
1. Vercel Dashboard → Domains
2. Agregar dominio (ej: `barberiaelbigote.com`)
3. Configurar DNS: añadir registro CNAME apuntando a `cname.vercel-dns.com`

### Cambiar MP a Producción
1. Obtener credenciales de producción en Mercado Pago
2. Actualizar en Vercel: `MERCADO_PAGO_ACCESS_TOKEN` y `VITE_MERCADO_PAGO_PUBLIC_KEY`
3. Re-deploy

### Configurar Webhook en MP
1. Dashboard MP → Webhooks → Agregar endpoint
2. URL: `https://[tu-dominio]/api/mercadopago-webhook`
3. Eventos: `payment`

### Verificar PWA
1. Abrir Chrome DevTools → Application → Manifest
2. Verificar que todos los iconos carguen
3. Probar "Instalar" desde el navegador

## Script de Despliegue Rápido

```bash
# 1. Build
npm run build

# 2. Desplegar Edge Functions
supabase functions deploy create-preference
supabase functions deploy mercadopago-webhook
supabase functions deploy enviar-push
supabase functions deploy recordatorio-diario

# 3. Push a GitHub (triggers auto-deploy en Vercel)
git add .
git commit -m "Deploy producción v1.0"
git push origin main

# 4. Verificar deploy
vercel --prod
```
