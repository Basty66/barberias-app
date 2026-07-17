import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TimeSlot } from '../types'

interface DisponibilidadParams {
  barberoId: string
  fecha: string
  duracionMinutos: number
}

interface UseDisponibilidadReturn {
  slots: TimeSlot[]
  cargando: boolean
  error: string | null
  calcularDisponibilidad: (params: DisponibilidadParams) => Promise<void>
}

export function useDisponibilidad(): UseDisponibilidadReturn {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function calcularDisponibilidad({ barberoId, fecha, duracionMinutos }: DisponibilidadParams) {
    setCargando(true)
    setError(null)

    try {
      const diaSemana = new Date(fecha).getDay()
      const buffer = await obtenerBuffer()

      // 1. Horario base del barbero para ese día
      const { data: horariosBase } = await supabase
        .from('horarios_barberos')
        .select('*')
        .eq('barbero_id', barberoId)
        .eq('dia_semana', diaSemana)
        .eq('activo', true)

      if (!horariosBase?.length) {
        setSlots([])
        setCargando(false)
        return
      }

      // 2. Horario especial del negocio para esa fecha
      const { data: horarioEspecial } = await supabase
        .from('horarios_especiales')
        .select('*')
        .eq('fecha', fecha)
        .single()

      if (horarioEspecial?.cerrado) {
        setSlots([])
        setCargando(false)
        return
      }

      // 3. Citas existentes
      const { data: citasExistentes } = await supabase
        .from('citas')
        .select('hora_inicio, hora_fin')
        .eq('barbero_id', barberoId)
        .eq('fecha', fecha)
        .not('estado', 'in', '("cancelada")')

      // 4. Bloqueos del barbero
      const { data: bloqueos } = await supabase
        .from('bloqueos_horarios')
        .select('*')
        .eq('barbero_id', barberoId)
        .eq('fecha', fecha)

      // 5. Límite mínimo de anticipación
      const { data: config } = await supabase
        .from('configuracion_estetica')
        .select('min_anticipacion_horas, max_anticipacion_dias')
        .single()

      const ahora = new Date()
      const hoy = ahora.toISOString().split('T')[0]
      const minAnticipacion = config?.min_anticipacion_horas || 2
      const horaMinima = new Date(ahora.getTime() + minAnticipacion * 60 * 60 * 1000)

      // 6. Generar slots
      const slotsLibres: TimeSlot[] = []

      for (const horario of horariosBase) {
        let horaInicio = horario.hora_inicio.slice(0, 5)

        // Aplicar horario especial si existe
        if (horarioEspecial?.hora_apertura) {
          horaInicio = horarioEspecial.hora_apertura.slice(0, 5)
        }

        let horaFin = horario.hora_fin.slice(0, 5)
        if (horarioEspecial?.hora_cierre) {
          horaFin = horarioEspecial.hora_cierre.slice(0, 5)
        }

        const inicio = new Date(`${fecha}T${horaInicio}`)
        const fin = new Date(`${fecha}T${horaFin}`)

        const duracionTotal = duracionMinutos + (buffer || 0)

        for (let current = new Date(inicio); current.getTime() + duracionTotal * 60000 <= fin.getTime(); current = new Date(current.getTime() + 30 * 60000)) {
          const slotStart = new Date(current)
          const slotEnd = new Date(slotStart.getTime() + duracionTotal * 60000)

          // Validar límite mínimo
          if (fecha === hoy && slotStart <= horaMinima) continue

          // Validar que no cruce con citas existentes
          const cruzaConCita = citasExistentes?.some(cita => {
            const citaInicio = new Date(`${fecha}T${cita.hora_inicio}`)
            const citaFin = new Date(`${fecha}T${cita.hora_fin}`)
            return slotStart < citaFin && slotEnd > citaInicio
          })

          if (cruzaConCita) continue

          // Validar bloqueos
          const estaBloqueado = bloqueos?.some(bloqueo => {
            if (bloqueo.todo_el_dia) return true
            const blkInicio = new Date(`${fecha}T${bloqueo.hora_inicio}`)
            const blkFin = new Date(`${fecha}T${bloqueo.hora_fin}`)
            return slotStart < blkFin && slotEnd > blkInicio
          })

          if (estaBloqueado) continue

          slotsLibres.push({
            hora: `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`,
            disponible: true,
          })
        }
      }

      setSlots(slotsLibres)
    } catch (err: any) {
      setError(err.message || 'Error al calcular disponibilidad')
    } finally {
      setCargando(false)
    }
  }

  return { slots, cargando, error, calcularDisponibilidad }
}

async function obtenerBuffer(): Promise<number> {
  const { data } = await supabase
    .from('configuracion_estetica')
    .select('tiempo_limpieza_minutos')
    .single()
  return data?.tiempo_limpieza_minutos || 10
}
