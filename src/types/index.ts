export interface Profile {
  id: string
  nombre: string
  rol: 'admin' | 'barbero'
  telefono: string | null
  created_at: string
}

export interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  duracion_minutos: number
  foto_url: string | null
  activo: boolean
  created_at: string
}

export interface Barbero {
  id: string
  profile_id: string | null
  nombre: string
  biografia: string | null
  foto_url: string | null
  activo: boolean
  created_at: string
}

export interface HorarioBarbero {
  id: string
  barbero_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  activo: boolean
}

export interface Cita {
  id: string
  barbero_id: string
  servicio_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string | null
  notas: string | null
  estado: 'pendiente' | 'pagada' | 'confirmada' | 'completada' | 'no_show' | 'cancelada'
  pago_id: string | null
  monto_pagado: number | null
  created_at: string
}

export interface Galeria {
  id: string
  url: string
  descripcion: string | null
  orden: number
  activo: boolean
  created_at: string
}

export interface ConfiguracionEstetica {
  id: string
  nombre_negocio: string
  descripcion: string | null
  hero_fondo_url: string | null
  logo_url: string | null
  colores_primarios: { primario: string; secundario: string }
  tiempo_limpieza_minutos: number
  min_anticipacion_horas: number
  max_anticipacion_dias: number
  porcentaje_senna: number
  politica_cancelacion_horas: number
  created_at: string
}

export interface Notificacion {
  id: string
  perfil_id: string
  titulo: string
  mensaje: string
  tipo: 'nueva_cita' | 'pago' | 'recordatorio' | 'no_show' | 'info'
  leida: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface BloqueoHorario {
  id: string
  barbero_id: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  motivo: string | null
  todo_el_dia: boolean
}

export interface HorarioEspecial {
  id: string
  fecha: string
  hora_apertura: string | null
  hora_cierre: string | null
  cerrado: boolean
  motivo: string | null
}

export interface TimeSlot {
  hora: string
  disponible: boolean
}
