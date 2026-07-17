import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ConfiguracionEstetica, Servicio, Barbero, Galeria } from '../types'

export default function Landing() {
  const [config, setConfig] = useState<ConfiguracionEstetica | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [galeria, setGaleria] = useState<Galeria[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('configuracion_estetica').select('*').limit(1).single(),
      supabase.from('servicios').select('*').eq('activo', true).order('nombre'),
      supabase.from('barberos').select('*').eq('activo', true).order('nombre'),
      supabase.from('galeria').select('*').eq('activo', true).order('orden'),
    ]).then(([cfg, svc, brb, gal]) => {
      if (cfg.data) setConfig(cfg.data)
      if (svc.data) setServicios(svc.data)
      if (brb.data) setBarberos(brb.data)
      if (gal.data) setGaleria(gal.data)
    })
  }, [])

  const nombre = config?.nombre_negocio || 'Mi Barbería'

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[70vh] flex items-center justify-center bg-gray-900 text-white overflow-hidden">
        {config?.hero_fondo_url && (
          <img src={config.hero_fondo_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        )}
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl font-bold mb-4">{nombre}</h1>
          <p className="text-xl mb-8 max-w-md mx-auto">{config?.descripcion || 'Reserva tu cita online'}</p>
          <a href="/reserva" className="inline-block px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition">
            Reserva tu Cita
          </a>
        </div>
      </section>

      {/* Servicios */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Servicios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicios.map(s => (
            <div key={s.id} className="p-6 border rounded-lg hover:shadow-md transition-shadow">
              {s.foto_url && <img src={s.foto_url} alt={s.nombre} className="w-full h-40 object-cover rounded-lg mb-4" />}
              <h3 className="text-lg font-semibold">{s.nombre}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.descripcion}</p>
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <span className="text-xl font-bold">${s.precio.toLocaleString('es-CL')}</span>
                <span className="text-sm text-muted-foreground">{s.duracion_minutos} min</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Barberos */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Nuestro Equipo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {barberos.map(b => (
              <div key={b.id} className="text-center">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-4">
                  {b.foto_url ? (
                    <img src={b.foto_url} alt={b.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                      {b.nombre.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold">{b.nombre}</h3>
                <p className="text-sm text-muted-foreground">{b.biografia}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Galería */}
      {galeria.length > 0 && (
        <section className="py-16 px-4 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Galería</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galeria.map(g => (
              <button key={g.id} onClick={() => setLightbox(g.url)} className="aspect-square overflow-hidden rounded-lg">
                <img src={g.url} alt={g.descripcion || ''} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t">
        <p>© {new Date().getFullYear()} {nombre}. Todos los derechos reservados.</p>
        <p className="mt-1">
          <a href="/login" className="hover:underline">Panel Admin</a>
        </p>
      </footer>
    </div>
  )
}
