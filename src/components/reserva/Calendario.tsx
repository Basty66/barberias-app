import { useState } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarioProps {
  fechaSeleccionada: Date | null
  onFechaChange: (fecha: Date) => void
}

export default function Calendario({ fechaSeleccionada, onFechaChange }: CalendarioProps) {
  const [mesActual, setMesActual] = useState(new Date())

  const inicioMes = startOfMonth(mesActual)
  const finMes = endOfMonth(mesActual)
  const dias = eachDayOfInterval({ start: inicioMes, end: finMes })

  const diasSemana = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']
  const hoy = startOfDay(new Date())

  const diaInicioSemana = getDay(inicioMes)
  const diasPrevios = Array.from({ length: diaInicioSemana }, (_, i) => {
    const d = new Date(inicioMes)
    d.setDate(d.getDate() - diaInicioSemana + i)
    return d
  })

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMesActual(subMonths(mesActual, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-semibold capitalize">
          {format(mesActual, 'MMMM yyyy', { locale: es })}
        </h3>
        <button onClick={() => setMesActual(addMonths(mesActual, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {diasSemana.map(d => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {diasPrevios.map(d => (
          <div key={d.toISOString()} className="p-2 text-sm text-gray-300 text-center" />
        ))}
        {dias.map(d => {
          const seleccionado = fechaSeleccionada && isSameDay(d, fechaSeleccionada)
          const deshabilitado = isBefore(d, hoy)
          return (
            <button
              key={d.toISOString()}
              onClick={() => !deshabilitado && onFechaChange(d)}
              disabled={deshabilitado}
              className={`p-2 text-sm rounded-lg transition-colors ${
                seleccionado
                  ? 'bg-primary text-primary-foreground'
                  : deshabilitado
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'hover:bg-gray-100'
              }`}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
