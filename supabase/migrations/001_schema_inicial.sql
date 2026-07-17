-- =====================================================
-- Barberías App - Migración Inicial
-- Schema completo: 12 tablas + RPC + RLS + Triggers
-- =====================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 2. TABLAS

-- 2.1 profiles - Extiende auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'barbero')),
  telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 servicios
CREATE TABLE servicios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio INTEGER NOT NULL CHECK (precio > 0),
  duracion_minutos INTEGER NOT NULL CHECK (duracion_minutos > 0),
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 barberos
CREATE TABLE barberos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  biografia TEXT,
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 horarios_barberos
CREATE TABLE horarios_barberos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID REFERENCES barberos(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL CHECK (hora_fin > hora_inicio),
  activo BOOLEAN DEFAULT true,
  UNIQUE (barbero_id, dia_semana, hora_inicio)
);

-- 2.5 citas
CREATE TABLE citas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID REFERENCES barberos(id) ON DELETE RESTRICT,
  servicio_id UUID REFERENCES servicios(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL CHECK (hora_fin > hora_inicio),
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  cliente_email TEXT,
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagada', 'confirmada', 'completada', 'no_show', 'cancelada')),
  pago_id TEXT,
  monto_pagado INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_citas_fecha ON citas(fecha);
CREATE INDEX idx_citas_barbero_fecha ON citas(barbero_id, fecha);
CREATE INDEX idx_citas_telefono ON citas(cliente_telefono);

-- 2.6 galeria
CREATE TABLE galeria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.7 configuracion_estetica (singleton)
CREATE TABLE configuracion_estetica (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_negocio TEXT NOT NULL DEFAULT 'Mi Barbería',
  descripcion TEXT,
  hero_fondo_url TEXT,
  logo_url TEXT,
  colores_primarios JSONB DEFAULT '{"primario": "#1d4ed8", "secundario": "#000000"}',
  tiempo_limpieza_minutos INTEGER DEFAULT 10,
  min_anticipacion_horas INTEGER DEFAULT 2,
  max_anticipacion_dias INTEGER DEFAULT 30,
  porcentaje_senna INTEGER DEFAULT 20,
  politica_cancelacion_horas INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar fila por defecto
INSERT INTO configuracion_estetica (nombre_negocio) VALUES ('Mi Barbería')
ON CONFLICT DO NOTHING;

-- 2.8 notificaciones
CREATE TABLE notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perfil_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info'
    CHECK (tipo IN ('nueva_cita', 'pago', 'recordatorio', 'no_show', 'info')),
  leida BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notificaciones_perfil ON notificaciones(perfil_id, leida);

-- 2.9 push_subscriptions
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perfil_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (perfil_id, endpoint)
);

-- 2.10 notificaciones_enviadas
CREATE TABLE notificaciones_enviadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cita_id UUID REFERENCES citas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('recordatorio_dia', 'recordatorio_hora', 'confirmacion')),
  enviado_el TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cita_id, tipo)
);

-- 2.11 bloqueos_horarios
CREATE TABLE bloqueos_horarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID REFERENCES barberos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  motivo TEXT,
  todo_el_dia BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT bloqueo_valido CHECK (
    (todo_el_dia = true) OR
    (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_fin > hora_inicio)
  )
);

CREATE INDEX idx_bloqueos_barbero_fecha ON bloqueos_horarios(barbero_id, fecha);

-- 2.12 horarios_especiales
CREATE TABLE horarios_especiales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  hora_apertura TIME,
  hora_cierre TIME,
  cerrado BOOLEAN DEFAULT false,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TRIGGER: Crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION crear_perfil_al_registrar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    'barbero'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION crear_perfil_al_registrar();

-- 4. FUNCIÓN RPC: reservar_turno
CREATE OR REPLACE FUNCTION reservar_turno(
  p_barbero_id UUID,
  p_servicio_id UUID,
  p_fecha DATE,
  p_hora_inicio TIME,
  p_hora_fin TIME CHECK (p_hora_fin > p_hora_inicio),
  p_cliente_nombre TEXT,
  p_cliente_telefono TEXT,
  p_cliente_email TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_cita_id UUID;
  v_config RECORD;
BEGIN
  -- Obtener configuración del negocio
  SELECT * INTO v_config FROM configuracion_estetica LIMIT 1;

  -- Validar límite mínimo de anticipación
  IF p_fecha = CURRENT_DATE
    AND p_hora_inicio <= (CURRENT_TIME + (v_config.min_anticipacion_horas || ' hours')::INTERVAL)
  THEN
    RETURN jsonb_build_object(
      'exito', false,
      'error', 'Debes reservar con al menos ' || v_config.min_anticipacion_horas || ' horas de anticipación'
    );
  END IF;

  -- Validar límite máximo de anticipación
  IF p_fecha > (CURRENT_DATE + (v_config.max_anticipacion_dias || ' days')::INTERVAL)
  THEN
    RETURN jsonb_build_object(
      'exito', false,
      'error', 'No puedes reservar con más de ' || v_config.max_anticipacion_dias || ' días de anticipación'
    );
  END IF;

  -- Bloquear la tabla para evitar condiciones de carrera
  LOCK TABLE citas IN EXCLUSIVE MODE;

  -- Verificar que no haya cruce de horarios
  IF EXISTS (
    SELECT 1 FROM citas
    WHERE barbero_id = p_barbero_id
      AND fecha = p_fecha
      AND estado NOT IN ('cancelada')
      AND (p_hora_inicio, p_hora_fin) OVERLAPS (hora_inicio, hora_fin)
  ) THEN
    RETURN jsonb_build_object('exito', false, 'error', 'El horario solicitado ya está ocupado');
  END IF;

  -- Verificar bloqueos del barbero
  IF EXISTS (
    SELECT 1 FROM bloqueos_horarios
    WHERE barbero_id = p_barbero_id
      AND fecha = p_fecha
      AND (todo_el_dia = true
        OR (hora_inicio IS NOT NULL
          AND (p_hora_inicio, p_hora_fin) OVERLAPS (hora_inicio, hora_fin)))
  ) THEN
    RETURN jsonb_build_object('exito', false, 'error', 'El barbero no está disponible en esa fecha');
  END IF;

  -- Verificar horarios especiales (cerrado)
  IF EXISTS (
    SELECT 1 FROM horarios_especiales
    WHERE fecha = p_fecha AND cerrado = true
  ) THEN
    RETURN jsonb_build_object('exito', false, 'error', 'La barbería está cerrada en esa fecha');
  END IF;

  -- Verificar que el horario esté dentro del horario base del barbero
  IF NOT EXISTS (
    SELECT 1 FROM horarios_barberos
    WHERE barbero_id = p_barbero_id
      AND dia_semana = EXTRACT(DOW FROM p_fecha)
      AND hora_inicio <= p_hora_inicio
      AND hora_fin >= p_hora_fin
      AND activo = true
  ) THEN
    RETURN jsonb_build_object(
      'exito', false,
      'error', 'El horario solicitado está fuera del horario laboral del barbero'
    );
  END IF;

  -- Insertar la cita
  INSERT INTO citas (
    barbero_id, servicio_id, fecha, hora_inicio, hora_fin,
    cliente_nombre, cliente_telefono, cliente_email, notas, estado
  ) VALUES (
    p_barbero_id, p_servicio_id, p_fecha, p_hora_inicio, p_hora_fin,
    p_cliente_nombre, p_cliente_telefono, p_cliente_email, p_notas, 'pendiente'
  )
  RETURNING id INTO v_cita_id;

  RETURN jsonb_build_object(
    'exito', true,
    'cita_id', v_cita_id,
    'mensaje', 'Cita reservada exitosamente'
  );
END;
$$;

-- 5. POLÍTICAS DE SEGURIDAD (RLS)

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven su propio perfil" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios editan su propio perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin ve todos los perfiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- servicios - público lectura, admin escritura
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público lee servicios activos" ON servicios
  FOR SELECT USING (activo = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'
  ));

CREATE POLICY "Admin gestiona servicios" ON servicios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- barberos
ALTER TABLE barberos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público lee barberos activos" ON barberos
  FOR SELECT USING (activo = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'barbero')
  ));

CREATE POLICY "Admin gestiona barberos" ON barberos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- horarios_barberos
ALTER TABLE horarios_barberos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público lee horarios activos" ON horarios_barberos
  FOR SELECT USING (activo = true);

CREATE POLICY "Admin gestiona horarios" ON horarios_barberos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- citas
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve todas las citas" ON citas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "Barbero ve sus propias citas" ON citas
  FOR SELECT USING (
    barbero_id IN (
      SELECT id FROM barberos WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Cualquiera puede insertar citas" ON citas
  FOR INSERT WITH CHECK (true);

-- galeria
ALTER TABLE galeria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público lee galería" ON galeria
  FOR SELECT USING (activo = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'
  ));

CREATE POLICY "Admin gestiona galería" ON galeria
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- configuracion_estetica
ALTER TABLE configuracion_estetica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público lee config" ON configuracion_estetica
  FOR SELECT USING (true);

CREATE POLICY "Admin edita config" ON configuracion_estetica
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- notificaciones
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve sus notificaciones" ON notificaciones
  FOR SELECT USING (perfil_id = auth.uid());

CREATE POLICY "Servicio crea notificaciones" ON notificaciones
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuario marca como leída" ON notificaciones
  FOR UPDATE USING (perfil_id = auth.uid());

-- bloqueos_horarios
ALTER TABLE bloqueos_horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gestiona bloqueos" ON bloqueos_horarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "Público consulta bloqueos" ON bloqueos_horarios
  FOR SELECT USING (true);

-- horarios_especiales
ALTER TABLE horarios_especiales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gestiona horarios especiales" ON horarios_especiales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "Público consulta horarios especiales" ON horarios_especiales
  FOR SELECT USING (true);

-- 6. CRON JOBS

-- Limpiar citas pendientes cada 15 minutos
SELECT cron.schedule(
  'limpiar-citas-pendientes',
  '*/15 * * * *',
  $$
  DELETE FROM citas
  WHERE estado = 'pendiente'
    AND created_at < NOW() - INTERVAL '15 minutes';
  $$
);

-- Recordatorio diario a las 8:00 AM
SELECT cron.schedule(
  'recordatorio-diario',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('supabase.functions_url') || '/recordatorio-diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.anon_key')
    ),
    body := '{}'
  ) AS request_id;
  $$
);
