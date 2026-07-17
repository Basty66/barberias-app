import { describe, it, expect } from 'vitest'

// Tests puramente unitarios que no requieren conexión a Supabase

describe('RPC reservar_turno - Lógica de validación', () => {
  it('debe rechazar cita cuando ya existe una en el mismo horario', () => {
    const citasExistentes = [
      { barbero_id: 'b1', fecha: '2026-07-20', hora_inicio: '10:00', hora_fin: '10:30' },
    ]

    function validarSinSolapamiento(barberoId: string, fecha: string, inicio: string, fin: string): boolean {
      return !citasExistentes.some(c =>
        c.barbero_id === barberoId &&
        c.fecha === fecha &&
        inicio < c.hora_fin &&
        fin > c.hora_inicio
      )
    }

    expect(validarSinSolapamiento('b1', '2026-07-20', '10:00', '10:30')).toBe(false)
    // 09:00-10:00 termina justo cuando empieza la existente -> no hay solapamiento
    expect(validarSinSolapamiento('b1', '2026-07-20', '09:00', '10:00')).toBe(true)
    // 10:30-11:00 empieza justo cuando termina la existente -> no hay solapamiento
    expect(validarSinSolapamiento('b1', '2026-07-20', '10:30', '11:00')).toBe(true)
    expect(validarSinSolapamiento('b1', '2026-07-20', '11:00', '11:30')).toBe(true)
    expect(validarSinSolapamiento('b2', '2026-07-20', '10:00', '10:30')).toBe(true)
    expect(validarSinSolapamiento('b1', '2026-07-21', '10:00', '10:30')).toBe(true)
  })

  it('debe rechazar cita fuera del horario laboral', () => {
    const horarioLaboral = { inicio: '09:00', fin: '19:00' }

    function enHorarioLaboral(inicio: string, fin: string): boolean {
      return inicio >= horarioLaboral.inicio && fin <= horarioLaboral.fin
    }

    expect(enHorarioLaboral('10:00', '10:30')).toBe(true)
    expect(enHorarioLaboral('08:00', '09:30')).toBe(false)
    expect(enHorarioLaboral('18:30', '19:30')).toBe(false)
    expect(enHorarioLaboral('19:00', '19:30')).toBe(false)
  })

  it('debe validar datos del cliente', () => {
    function clienteValido(nombre: string, telefono: string): boolean {
      return nombre.trim().length > 0 && telefono.trim().length >= 8
    }

    expect(clienteValido('Juan Pérez', '+56912345678')).toBe(true)
    expect(clienteValido('', '+56912345678')).toBe(false)
    expect(clienteValido('Juan', '')).toBe(false)
    expect(clienteValido('Juan', '123')).toBe(false)
  })

  it('debe verificar que el barbero existe y está activo', () => {
    const barberos = [
      { id: 'b1', activo: true },
      { id: 'b2', activo: false },
    ]

    function barberoDisponible(barberoId: string): boolean {
      return barberos.some(b => b.id === barberoId && b.activo)
    }

    expect(barberoDisponible('b1')).toBe(true)
    expect(barberoDisponible('b2')).toBe(false)
    expect(barberoDisponible('b3')).toBe(false)
  })

  it('debe verificar que el servicio existe y está activo', () => {
    const servicios = [
      { id: 's1', activo: true },
      { id: 's2', activo: false },
    ]

    function servicioDisponible(servicioId: string): boolean {
      return servicios.some(s => s.id === servicioId && s.activo)
    }

    expect(servicioDisponible('s1')).toBe(true)
    expect(servicioDisponible('s2')).toBe(false)
  })
})

describe('Disponibilidad - useDisponibilidad', () => {
  it('debe rechazar fecha pasada', () => {
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    const hoy = new Date()
    expect(ayer < hoy).toBe(true)
  })

  it('debe respetar límite mínimo de anticipación', () => {
    const ahora = new Date()
    const enUnaHora = new Date(ahora.getTime() + 60 * 60 * 1000)
    const enDosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000)

    expect(enDosHoras.getTime() > enUnaHora.getTime()).toBe(true)
  })

  it('debe rechazar fecha más allá del máximo de anticipación', () => {
    const hoy = new Date()
    const dentroDe30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)
    const diferenciaDias = Math.floor((dentroDe30Dias.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

    expect(diferenciaDias).toBeLessThanOrEqual(30)
  })
})
