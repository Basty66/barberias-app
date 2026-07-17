# Barberías App — Sistema de Agendamiento Profesional

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Sistema completo de agendamiento de citas para barberías con panel administrativo, calendario interactivo, pasarela de pagos Mercado Pago y notificaciones push PWA.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de Datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (email+password) |
| Almacenamiento | Supabase Storage |
| Pagos | Mercado Pago API |
| Serverless | Supabase Edge Functions |
| Notificaciones | Supabase Realtime + Push API |
| Hosting | Vercel |

## Estructura del Proyecto

```
barberias-app/
├── docs/                    # Documentación técnica completa
├── supabase/
│   ├── migrations/          # Scripts SQL de migración
│   └── functions/           # Edge Functions
├── src/
│   ├── components/          # Componentes React
│   ├── pages/               # Páginas de la aplicación
│   ├── hooks/               # Hooks personalizados
│   ├── lib/                 # Utilidades (Supabase client, etc.)
│   ├── contexts/            # Contextos React
│   └── types/               # Definiciones TypeScript
└── public/                  # Archivos estáticos (manifest, icons)
```

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [00-indice.md](docs/00-indice.md) | Mapa de navegación de la documentación |
| [01-plan-general.md](docs/01-plan-general.md) | Plan de desarrollo en 6 fases |
| [02-arquitectura.md](docs/02-arquitectura.md) | Arquitectura del sistema y flujo de datos |
| [03-base-datos.md](docs/03-base-datos.md) | Schema SQL y diseño de tablas |
| [04-autenticacion.md](docs/04-autenticacion.md) | Sistema de roles y políticas RLS |
| [05-admin-panel.md](docs/05-admin-panel.md) | CRUDs y configurador de horarios |
| [06-calendario-algoritmo.md](docs/06-calendario-algoritmo.md) | Algoritmo de disponibilidad y RPC |
| [07-mercado-pago.md](docs/07-mercado-pago.md) | Integración de pagos |
| [08-notificaciones.md](docs/08-notificaciones.md) | Sistema de notificaciones |
| [09-landing-pwa.md](docs/09-landing-pwa.md) | Landing page y PWA |
| [10-despliegue.md](docs/10-despliegue.md) | Despliegue en Vercel |
| [11-manual-uso.md](docs/11-manual-uso.md) | Manual para el dueño de la barbería |

## Instalación Rápida

```bash
# Clonar el repositorio
git clone https://github.com/Basty66/barberias-app.git
cd barberias-app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

## Licencia

MIT
