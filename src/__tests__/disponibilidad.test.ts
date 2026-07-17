describe('Lógica de Disponibilidad', () => {
  it('debe detectar solapamiento de horarios', () => {
    const ocupados = [
      { inicio: '10:00', fin: '11:00' },
      { inicio: '11:30', fin: '12:00' },
    ]

    function solapa(nuevoInicio: string, nuevoFin: string): boolean {
      return ocupados.some(o => nuevoInicio < o.fin && nuevoFin > o.inicio)
    }

    expect(solapa('09:00', '10:30')).toBe(true)
    expect(solapa('10:30', '11:30')).toBe(true)
    expect(solapa('11:00', '11:30')).toBe(false)
    expect(solapa('12:00', '13:00')).toBe(false)
    expect(solapa('10:00', '11:00')).toBe(true)
  })

  it('debe aplicar buffer de limpieza', () => {
    const bufferMinutos = 15
    const citas = [
      { inicio: '10:00', fin: '10:30' },
    ]

    function disponible(desde: string, hasta: string): boolean {
      return citas.every(c =>
        hasta <= c.inicio ||
        desde >= sumarMinutos(c.fin, bufferMinutos)
      )
    }

    function sumarMinutos(hora: string, mins: number): string {
      const [h, m] = hora.split(':').map(Number)
      const total = h * 60 + m + mins
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    }

    expect(disponible('10:00', '10:30')).toBe(false)
    expect(disponible('10:45', '11:15')).toBe(true)
    expect(disponible('10:30', '10:45')).toBe(false)
    expect(disponible('10:31', '11:00')).toBe(false)
  })

  it('debe respetar límite mínimo de anticipación', () => {
    const ahora = new Date('2026-07-17T09:00:00')
    const minAnticipacionHoras = 2

    function puedeReservar(fechaHora: Date): boolean {
      const diffMs = fechaHora.getTime() - ahora.getTime()
      return diffMs >= minAnticipacionHoras * 60 * 60 * 1000
    }

    expect(puedeReservar(new Date('2026-07-17T10:00:00'))).toBe(false)
    expect(puedeReservar(new Date('2026-07-17T11:00:00'))).toBe(true)
    expect(puedeReservar(new Date('2026-07-18T09:00:00'))).toBe(true)
  })

  it('debe respetar límite máximo de anticipación', () => {
    const hoy = new Date('2026-07-17')
    const maxAnticipacionDias = 30

    function puedeReservar(fecha: Date): boolean {
      const diffDias = Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return diffDias >= 0 && diffDias <= maxAnticipacionDias
    }

    expect(puedeReservar(new Date('2026-07-17'))).toBe(true)
    expect(puedeReservar(new Date('2026-08-15'))).toBe(true)
    expect(puedeReservar(new Date('2026-08-16'))).toBe(true)
    expect(puedeReservar(new Date('2026-08-17'))).toBe(false)
    expect(puedeReservar(new Date('2026-07-16'))).toBe(false)
  })

  it('debe calcular duración en slots', () => {
    function generarSlots(inicio: string, fin: string, duracionMin: number): string[] {
      const slots: string[] = []
      const [hI, mI] = inicio.split(':').map(Number)
      const [hF, mF] = fin.split(':').map(Number)
      let minActual = hI * 60 + mI
      const minFin = hF * 60 + mF

      while (minActual + duracionMin <= minFin) {
        const h = String(Math.floor(minActual / 60)).padStart(2, '0')
        const m = String(minActual % 60).padStart(2, '0')
        slots.push(`${h}:${m}`)
        minActual += 30
      }
      return slots
    }

    const slots = generarSlots('09:00', '12:00', 30)
    expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'])
    expect(slots).toHaveLength(6)
    expect(slots).not.toContain('12:00')
  })

  it('debe detectar día bloqueado', () => {
    const bloqueos = [
      { fecha: '2026-07-18', todoElDia: true },
    ]

    function diaBloqueado(fecha: string): boolean {
      return bloqueos.some(b => b.fecha === fecha && b.todoElDia)
    }

    expect(diaBloqueado('2026-07-18')).toBe(true)
    expect(diaBloqueado('2026-07-19')).toBe(false)
  })

  it('debe detectar horario especial cerrado', () => {
    const especiales = [
      { fecha: '2026-09-18', cerrado: true },
      { fecha: '2026-09-19', cerrado: false, apertura: '10:00', cierre: '14:00' },
    ]

    function esCerrado(fecha: string): boolean {
      return especiales.some(e => e.fecha === fecha && e.cerrado)
    }

    function horaValidaEnEspecial(fecha: string, hora: string): boolean {
      const esp = especiales.find(e => e.fecha === fecha)
      if (!esp) return true
      if (esp.cerrado) return false
      if (esp.apertura && esp.cierre) {
        return hora >= esp.apertura && hora < esp.cierre
      }
      return true
    }

    expect(esCerrado('2026-09-18')).toBe(true)
    expect(esCerrado('2026-09-19')).toBe(false)
    expect(horaValidaEnEspecial('2026-09-19', '09:00')).toBe(false)
    expect(horaValidaEnEspecial('2026-09-19', '11:00')).toBe(true)
    expect(horaValidaEnEspecial('2026-09-19', '14:00')).toBe(false)
  })
})
