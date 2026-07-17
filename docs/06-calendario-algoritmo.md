# Algoritmo de Disponibilidad y Reserva

## El Algoritmo (Lado Cliente - React)

### Paso 1: Selección de Servicio
El cliente selecciona un servicio → obtenemos `duracion_minutos`.

### Paso 2: Selección de Barbero
Mostramos barberos activos con el servicio seleccionado.

### Paso 3: Selección de Fecha
Calendario interactivo con dayjs.
- Se marcan días sin disponibilidad como "disabled"

### Paso 4: Cálculo de Horarios Disponibles

```typescript
async function calcularDisponibilidad(
  barberoId: string,
  fecha: Date,
  duracionServicio: number,
  bufferMinutos: number
): Promise<TimeSlot[]> {
  const diaSemana = dayjs(fecha).day(); // 0=Domingo

  // 1. Obtener horario base del barbero para ese día
  const { data: horariosBase } = await supabase
    .from('horarios_barberos')
    .select('*')
    .eq('barbero_id', barberoId)
    .eq('dia_semana', diaSemana)
    .eq('activo', true);

  if (!horariosBase?.length) return [];

  // 2. Obtener horarios especiales del negocio para esa fecha
  const { data: horarioEspecial } = await supabase
    .from('horarios_especiales')
    .select('*')
    .eq('fecha', fecha);

  if (horarioEspecial?.length) {
    const especial = horarioEspecial[0];
    if (especial.cerrado) return [];
    // Si hay horario especial, reemplaza el base
    horariosBase.forEach(h => {
      if (especial.hora_apertura) h.hora_inicio = especial.hora_apertura;
      if (especial.hora_cierre) h.hora_fin = especial.hora_cierre;
    });
  }

  // 3. Obtener citas existentes para ese día (no canceladas)
  const { data: citasExistentes } = await supabase
    .from('citas')
    .select('hora_inicio, hora_fin')
    .eq('barbero_id', barberoId)
    .eq('fecha', fecha)
    .not('estado', 'in', '("cancelada")');

  // 4. Obtener bloqueos del barbero para esa fecha
  const { data: bloqueos } = await supabase
    .from('bloqueos_horarios')
    .select('*')
    .eq('barbero_id', barberoId)
    .eq('fecha', fecha);

  // 5. Generar slots libres
  const slotsLibres: TimeSlot[] = [];

  for (const horario of horariosBase) {
    const inicio = dayjs(`${fecha} ${horario.hora_inicio}`);
    const fin = dayjs(`${fecha} ${horario.hora_fin}`);
    let current = inicio;

    while (current.isBefore(fin)) {
      const slotEnd = current.add(duracionServicio, 'minute');
      const slotEndConBuffer = slotEnd.add(bufferMinutos, 'minute');

      if (slotEndConBuffer.isAfter(fin)) break;

      const slotOcupado = citasExistentes.some(cita => {
        const citaInicio = dayjs(`${fecha} ${cita.hora_inicio}`);
        const citaFin = dayjs(`${fecha} ${cita.hora_fin}`);
        return current.isBefore(citaFin) && slotEndConBuffer.isAfter(citaInicio);
      });

      const slotBloqueado = bloqueos?.some(bloqueo => {
        if (bloqueo.todo_el_dia) return true;
        const blkInicio = dayjs(`${fecha} ${bloqueo.hora_inicio}`);
        const blkFin = dayjs(`${fecha} ${bloqueo.hora_fin}`);
        return current.isBefore(blkFin) && slotEndConBuffer.isAfter(blkInicio);
      });

      if (!slotOcupado && !slotBloqueado) {
        slotsLibres.push({
          hora: current.format('HH:mm'),
          disponible: true
        });
      }

      current = current.add(30, 'minute'); // slots cada 30 min
    }
  }

  return slotsLibres;
}
```

### Paso 5: Guest Checkout
Formulario simple con:
- Nombre
- Teléfono
- Email (opcional)
- Notas (opcional)

## Inyección con Candado (RPC - Servidor Seguro)

La función `reservar_turno` en PostgreSQL ejecuta la validación definitiva:

```
1. LOCK TABLE citas IN EXCLUSIVE MODE → evita condición de carrera
2. Verifica OVERLAPS con citas existentes → sin hueco posible
3. Verifica bloqueos y horarios
4. Inserta → COMMIT → éxito
5. Si hay conflicto → ROLLBACK → error
```

### Llamada desde el frontend:

```typescript
const { data, error } = await supabase.rpc('reservar_turno', {
  p_barbero_id: barberoId,
  p_servicio_id: servicioId,
  p_fecha: fecha,
  p_hora_inicio: horaInicio,
  p_hora_fin: horaFin,
  p_cliente_nombre: nombre,
  p_cliente_telefono: telefono,
  p_cliente_email: email,
  p_notas: notas
});
```

## Flujo Completo

```
Usuario selecciona:
  1. Servicio → duracion
  2. Barbero
  3. Fecha
  4. Hora disponible (calculada por el algoritmo)

Frontend:
  - Ejecuta cálculo local de disponibilidad
  - Muestra solo horarios libres

Reserva:
  - Rellena formulario guest checkout
  - Llama a RPC reservar_turno (validación SERVER-side)
  - Si OK → redirige a pago
  - Si error → muestra mensaje "alguien reservó antes"
```
