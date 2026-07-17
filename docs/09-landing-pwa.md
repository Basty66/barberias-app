# Landing Page y PWA

## Landing Page Dinámica

La landing page se renderiza con datos de `configuracion_estetica`.

### Secciones

```
┌─────────────────────────────────────┐
│          HERO / NAVBAR              │
│  Título, descripción, CTA "Reservar"│
│  Fondo: hero_fondo_url              │
│  Logo: logo_url                     │
├─────────────────────────────────────┤
│          SERVICIOS                   │
│  Grid de cards con precio y duración│
│  Desde tabla servicios (activo=true) │
├─────────────────────────────────────┤
│          BARBEROS                    │
│  Grid con fotos, nombres, biografías│
│  Desde tabla barberos (activo=true)  │
├─────────────────────────────────────┤
│          GALERÍA                     │
│  Grid responsivo con lightbox       │
│  Desde tabla galeria                │
├─────────────────────────────────────┤
│          CONTACTO / FOOTER          │
│  Dirección, teléfono, redes sociales│
└─────────────────────────────────────┘
```

### Personalización
El admin puede cambiar desde el panel:
- Nombre del negocio
- Descripción
- Imagen de fondo del hero
- Logo
- Colores primarios (tema Tailwind)

## PWA (Progressive Web App)

### manifest.json
```json
{
  "name": "Barbería - Reserva de Citas",
  "short_name": "Barbería",
  "description": "Reserva tu cita en la barbería",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1d4ed8",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker
```javascript
// public/sw.js
const CACHE_NAME = 'barberia-v1';
const urlsToCache = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Push event listener
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200]
  });
});
```

### Registro en React
```typescript
// src/main.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

### Meta Tags para iOS
```html
<!-- index.html -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Barbería">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
```

## SEO

```html
<meta name="description" content="Reserva tu cita en [Nombre Barbería]. Cortes modernos, degradados y más.">
<meta property="og:title" content="[Nombre Barbería] - Reserva tu Cita">
<meta property="og:description" content="Agenda online fácil y rápido">
<meta property="og:image" content="[URL de imagen OG]">
<meta property="og:type" content="website">
```
