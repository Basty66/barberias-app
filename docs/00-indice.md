# Índice de Documentación

## Documentos Técnicos

| # | Documento | Descripción | Fase |
|---|-----------|-------------|------|
| 1 | [Plan General](01-plan-general.md) | Plan de desarrollo completo en 7 fases | — |
| 2 | [Arquitectura](02-arquitectura.md) | Diagrama de componentes y flujo de datos | Fase 1 |
| 3 | [Base de Datos](03-base-datos.md) | Schema SQL, 12 tablas, relaciones y RLS | Fase 1 |
| 4 | [Autenticación](04-autenticacion.md) | Roles, login, recuperación de contraseña | Fase 2 |
| 5 | [Panel Admin](05-admin-panel.md) | CRUDs, horarios, bloqueos, dashboard | Fase 2 |
| 6 | [Calendario y Algoritmo](06-calendario-algoritmo.md) | Disponibilidad, RPC anticolisión, buffer | Fase 3 |
| 7 | [Mercado Pago](07-mercado-pago.md) | Edge Functions, webhooks, cron limpieza | Fase 4 |
| 8 | [Notificaciones](08-notificaciones.md) | In-app, push PWA, recordatorio diario | Fase 5 |
| 9 | [Landing y PWA](09-landing-pwa.md) | Landing dinámica, manifest, service worker | Fase 6 |
| 10 | [Despliegue](10-despliegue.md) | Vercel, variables de entorno, dominio | Fase 6 |
| 11 | [Manual de Uso](11-manual-uso.md) | Guía para el dueño de la barbería | — |

## Fases de Desarrollo

| Fase | Enfoque | Duración |
|------|---------|----------|
| 0 | Preparación y documentación | Día 1 |
| 1 | Proyecto base y base de datos | Días 1-2 |
| 2 | Autenticación y panel admin | Días 3-6 |
| 3 | Algoritmo de disponibilidad y reserva | Días 7-11 |
| 4 | Integración Mercado Pago | Días 12-16 |
| 5 | Notificaciones y dashboard analítico | Días 17-21 |
| 6 | Landing, PWA, tests y despliegue | Días 22-28 |

## Convenciones del Proyecto

- **Lenguaje**: TypeScript (strict mode)
- **Estilo de código**: ESLint + Prettier
- **Componentes**: shadcn/ui con Tailwind CSS
- **Nomenclatura**: camelCase para variables/funciones, PascalCase para componentes
- **Rutas**: React Router v6 con lazy loading
- **Base de datos**: snake_case para columnas y tablas
