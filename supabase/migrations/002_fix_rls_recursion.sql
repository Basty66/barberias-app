-- =====================================================
-- Fix: Políticas RLS con recursión infinita
-- Crea funciones SECURITY DEFINER para evitar auto-referencia
-- =====================================================

-- Funciones auxiliares que evitan recursión
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.es_barbero_o_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('admin', 'barbero')
  );
$$;

-- Reemplazar políticas recursivas en profiles
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON profiles;
CREATE POLICY "Admin ve todos los perfiles" ON profiles
  FOR SELECT USING (public.es_admin());

-- Reemplazar políticas recursivas en servicios
DROP POLICY IF EXISTS "Admin gestiona servicios" ON servicios;
CREATE POLICY "Admin gestiona servicios" ON servicios
  FOR ALL USING (public.es_admin());

-- Reemplazar políticas recursivas en barberos
DROP POLICY IF EXISTS "Admin gestiona barberos" ON barberos;
CREATE POLICY "Admin gestiona barberos" ON barberos
  FOR ALL USING (public.es_admin());

-- horarios_barberos
DROP POLICY IF EXISTS "Admin gestiona horarios" ON horarios_barberos;
CREATE POLICY "Admin gestiona horarios" ON horarios_barberos
  FOR ALL USING (public.es_admin());

-- citas
DROP POLICY IF EXISTS "Admin ve todas las citas" ON citas;
CREATE POLICY "Admin ve todas las citas" ON citas
  FOR SELECT USING (public.es_admin());

DROP POLICY IF EXISTS "Barbero ve sus propias citas" ON citas;
DROP POLICY IF EXISTS "Barbero ve sus citas" ON citas;
CREATE POLICY "Barbero ve sus citas" ON citas
  FOR SELECT USING (
    barbero_id IN (SELECT id FROM barberos WHERE profile_id = auth.uid())
  );

-- galeria
DROP POLICY IF EXISTS "Admin gestiona galería" ON galeria;
CREATE POLICY "Admin gestiona galería" ON galeria
  FOR ALL USING (public.es_admin());

-- configuracion_estetica
DROP POLICY IF EXISTS "Admin edita config" ON configuracion_estetica;
CREATE POLICY "Admin edita config" ON configuracion_estetica
  FOR ALL USING (public.es_admin());

-- notificaciones
DROP POLICY IF EXISTS "Servicio crea notificaciones" ON notificaciones;
CREATE POLICY "Servicio crea notificaciones" ON notificaciones
  FOR INSERT WITH CHECK (true);

-- bloqueos_horarios
DROP POLICY IF EXISTS "Admin gestiona bloqueos" ON bloqueos_horarios;
CREATE POLICY "Admin gestiona bloqueos" ON bloqueos_horarios
  FOR ALL USING (public.es_admin());

-- horarios_especiales
DROP POLICY IF EXISTS "Admin gestiona horarios especiales" ON horarios_especiales;
CREATE POLICY "Admin gestiona horarios especiales" ON horarios_especiales
  FOR ALL USING (public.es_admin());
