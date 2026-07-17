# Plan General de Desarrollo

## Resumen del Cronograma

| Fase | Enfoque | Complejidad | Tiempo |
|------|---------|-------------|--------|
| 0 | Preparación y Documentación | Baja | Día 1 |
| 1 | Proyecto Base y Base de Datos | Media | Días 1-2 |
| 2 | Autenticación y Panel Admin | Baja-Media | Días 3-6 |
| 3 | Algoritmo de Disponibilidad y Reserva | Alta | Días 7-11 |
| 4 | Integración Mercado Pago | Media-Alta | Días 12-16 |
| 5 | Notificaciones y Dashboard | Media | Días 17-21 |
| 6 | Landing, PWA, Tests y Despliegue | Media | Días 22-28 |

---

## Fase 0: Preparación del Entorno

**Objetivo**: Configurar el ecosistema de desarrollo y documentar la arquitectura completa.

### Pasos
1. Crear repositorio en GitHub con documentación
2. Definir estructura de directorios
3. Escribir documentación técnica completa
4. Diseñar schema SQL de la base de datos

### Entregable
- Repositorio GitHub con documentación y SQL semilla

---

## Fase 1: Proyecto Base y Base de Datos

**Objetivo**: Inicializar el proyecto React y configurar Supabase.

### Pasos Técnicos
1. Crear proyecto con Vite + React + TypeScript
2. Configurar Tailwind CSS, shadcn/ui y lucide-react
3. Configurar ESLint y Prettier
4. Crear proyecto en Supabase
5. Ejecutar script SQL de migración inicial
6. Configurar variables de entorno (.env)
7. Crear bucket `imagenes-barberia` en Storage
8. Conectar frontend con Supabase

### Entregable
- Proyecto base comunicado con Supabase

---

## Fase 2: Autenticación y Panel Admin

**Objetivo**: Sistema de login y panel para administrar el negocio.

### Pasos Técnicos
1. Pantalla de Login con Supabase Auth
2. Recuperación de contraseña
3. Protección de rutas por rol (admin/barbero)
4. CRUD de Servicios (crear, leer, actualizar, desactivar)
5. CRUD de Staff (barberos con foto comprimida y biografía)
6. Configurador de Horarios Base (cuadrícula día-semana)
7. Gestión de Días Libres (bloqueos específicos)
8. Gestión de Horarios Especiales (feriados)
9. Dashboard admin con citas del día
10. Confirmación de asistencia y no-show tracking

### Entregable
- Panel administrativo funcional

---

## Fase 3: Algoritmo de Disponibilidad y Reserva

**Objetivo**: Sistema de cálculo de horarios disponibles sin cruce de citas.

### Pasos Técnicos
1. Algoritmo de disponibilidad:
   - Consultar horarios base del barbero para el día seleccionado
   - Consultar citas existentes para esa fecha
   - Aplicar buffer de limpieza entre citas
   - Aplicar límite mínimo de anticipación
   - Generar bloques de tiempo libres
2. RPC `reservar_turno` con candado OVERLAPS
3. Flujo de Guest Checkout (sin registro)
4. Selector de servicio, barbero, fecha y hora
5. Formulario de datos del cliente

### Entregable
- Interfaz de reserva interactiva con turnos en tiempo real

---

## Fase 4: Integración Mercado Pago

**Objetivo**: Monetizar las citas con pasarela de pagos.

### Pasos Técnicos
1. Edge Function `create-preference` para crear preferencias de pago
2. Integrar Checkout Pro de Mercado Pago
3. Edge Function `mercadopago-webhook` para recibir notificaciones
4. Validación de firma de seguridad en webhook
5. Actualización de estado de cita según pago
6. Cron job para limpiar citas 'pendiente' > 15 minutos

### Entregable
- Flujo transaccional completo

---

## Fase 5: Notificaciones y Dashboard Analítico

**Objetivo**: Notificaciones en tiempo real y analíticas del negocio.

### Pasos Técnicos
1. Notificaciones in-app con Supabase Realtime
2. Campanita con badge en panel admin
3. Historial de notificaciones con estados leída/no leída
4. Edge Function `enviar-push` para notificaciones push PWA
5. Suscripción push desde el panel admin
6. Edge Function `recordatorio-diario` (pg_cron)
7. Dashboard analítico: citas hoy, semana, ingresos, servicios populares
8. Historial del cliente por teléfono con notas del barbero

### Entregable
- Sistema de notificaciones y analytics

---

## Fase 6: Landing, PWA, Tests y Despliegue

**Objetivo**: Fachada pública y puesta en producción.

### Pasos Técnicos
1. Landing page dinámica desde `configuracion_estetica`
2. Galería de trabajos con lightbox
3. SEO básico (meta tags, Open Graph)
4. Conversión a PWA (manifest.json, service worker)
5. Compresión de imágenes con browser-image-compression
6. Pruebas de concurrencia (RPC anticolisión)
7. Configuración de dominio personalizado
8. Cambio de credenciales MP Sandbox → Production

### Entregable
- Enlace de producción listo para facturar

---

## Features Extras Incluidas

- Recuperación de contraseña
- Días libres / Bloqueos específicos
- Tiempo de limpieza entre citas
- No-show tracking (cliente no asistió)
- Límite mínimo/máximo de reserva anticipada
- Dashboard analítico básico
- Historial del cliente con notas
- Horarios especiales / Feriados
