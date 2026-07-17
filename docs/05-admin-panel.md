# Panel Administrativo

## Módulos del Panel

### 1. Dashboard
Resumen ejecutivo del negocio:
- Citas hoy (total, confirmadas, completadas, no-show)
- Ingresos del día / semana / mes
- Servicio más vendido
- Próximas citas (próximas 24h)
- Notificaciones recientes

### 2. Gestión de Servicios (CRUD)

**Campos del formulario:**
- Nombre (texto)
- Descripción (textarea)
- Precio (number, en CLP)
- Duración (number, en minutos)
- Foto (imagen opcional)
- Estado (activo/inactivo)

**Comportamiento:**
- Desactivar (`activo: false`) en lugar de eliminar
- Los servicios inactivos no aparecen en la reserva
- Los servicios con citas activas no se pueden desactivar

### 3. Gestión de Staff (Barberos)

**Campos del formulario:**
- Nombre
- Biografía (textarea)
- Foto de perfil (imagen, se comprime a <300KB antes de subir)
- Vincular a usuario (select de auth.users sin perfil asignado)

**Reglas:**
- Se puede desactivar un barbero (no eliminar)
- Si tiene citas futuras, mostrar advertencia
- Foto se almacena en `imagenes-barberia/barberos/`

### 4. Configurador de Horarios Base

Cuadrícula visual con:
- Filas: barberos
- Columnas: días de la semana (Lun-Dom)
- Cada celda: horario entrada/salida (inputs de tiempo)

**Comportamiento:**
- Rango de tiempo válido (hora_fin > hora_inicio)
- Validación de solapamiento (un barbero no puede tener dos horarios que se crucen el mismo día)
- Opción "No laboral" para marcar días de descanso semanal

### 5. Gestión de Días Libres

Calendario donde el admin (o barbero) selecciona fechas específicas:
- Bloqueo de día completo (vacaciones, enfermedad)
- Bloqueo parcial (ej: solo 10:00-12:00)
- Motivo opcional (visible en panel)
- No se permiten citas en fechas/horarios bloqueados

### 6. Gestión de Horarios Especiales

Para días con horario distinto al base:
- Ej: "Víspera de Navidad → 10:00-14:00"
- Ej: "Año Nuevo → Cerrado"
- Tiene prioridad sobre el horario base

### 7. Gestión de Citas

Lista de citas con filtros:
- Por fecha (hoy, mañana, esta semana, personalizado)
- Por barbero
- Por estado

**Acciones por cita:**
- Confirmar asistencia → estado: 'pagada' → 'confirmada'
- Marcar completada → 'confirmada' → 'completada'
- Marcar no-show → cualquier estado activo → 'no_show'
- Cancelar (con motivo) → 'cancelada'

### 8. Historial del Cliente

Al buscar por teléfono:
- Últimas citas del cliente
- Notas/observaciones del barbero
- Total gastado
- Número de visitas
