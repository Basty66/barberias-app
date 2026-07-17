import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const FUNCTIONS_URL = Deno.env.get('SUPABASE_FUNCTIONS_URL') || `${SUPABASE_URL}/functions/v1`

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async () => {
  try {
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    const fechaStr = manana.toISOString().split('T')[0]

    const { data: citasManana } = await supabase
      .from('citas')
      .select('id, barbero_id, servicio_id, hora_inicio, cliente_nombre, cliente_telefono')
      .eq('fecha', fechaStr)
      .in('estado', ['pendiente', 'pagada', 'confirmada'])

    if (!citasManana || citasManana.length === 0) {
      return new Response(JSON.stringify({ recordatorios: 0 }), { status: 200 })
    }

    const { data: barberos } = await supabase
      .from('barberos')
      .select('id, nombre, profile_id')

    const barberoMap = new Map((barberos || []).map(b => [b.id, b]))

    let enviados = 0
    for (const cita of citasManana) {
      const barbero = barberoMap.get(cita.barbero_id)
      if (!barbero || !barbero.profile_id) continue

      const titulo = '📅 Recordatorio de cita'
      const mensaje = `Tienes una cita mañana a las ${cita.hora_inicio.slice(0, 5)} con ${cita.cliente_nombre}`

      await supabase.from('notificaciones').insert({
        perfil_id: barbero.profile_id,
        titulo,
        mensaje,
        tipo: 'recordatorio',
      })

      try {
        await fetch(`${FUNCTIONS_URL}/enviar-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ perfilId: barbero.profile_id, titulo, mensaje }),
        })
      } catch {
        // push no crítico
      }

      await supabase.from('notificaciones_enviadas').upsert({
        cita_id: cita.id,
        tipo: 'recordatorio_dia',
        enviado_el: new Date().toISOString(),
      }, { onConflict: 'cita_id, tipo' })

      enviados++
    }

    return new Response(JSON.stringify({ recordatorios: enviados }), { status: 200 })
  } catch (err) {
    console.error('Error en recordatorio-diario:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error' }), { status: 500 })
  }
})
