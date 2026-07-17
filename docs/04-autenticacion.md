# Autenticación y Sistema de Roles

## Resumen

Usamos Supabase Auth con email+password. Los roles se gestionan mediante la tabla `profiles` que extiende `auth.users`.

## Flujo de Registro

```
1. Admin crea cuenta → Supabase Auth → auth.users
2. Trigger on_auth_user_created inserta perfil en profiles
3. Admin asigna rol 'admin' o 'barbero' desde el panel
4. Barbero recibe credenciales del admin
```

## Trigger de creación de perfil

```sql
CREATE OR REPLACE FUNCTION crear_perfil_al_registrar()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, rol)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'), 'barbero')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION crear_perfil_al_registrar();
```

## Pantallas

### Login
- Email + contraseña
- "Olvidé mi contraseña" → flujo de recuperación
- Si el usuario no tiene rol admin/barbero → redirigir a página de error

### Recuperación de Contraseña
1. Usuario ingresa email
2. Supabase Auth envía email con link mágico
3. Usuario hace clic → establece nueva contraseña
4. Redirigido al panel

## Protección de Rutas

```typescript
// Hook useAuth
function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        cargarPerfil(data.session.user.id);
      }
    });
  }, []);

  return { session, profile, loading };
}

// Componente ProtectedRoute
function ProtectedRoute({ roles, children }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" />;
  if (roles && !roles.includes(profile?.rol)) {
    return <Navigate to="/unauthorized" />;
  }
  return children;
}
```

## Roles y Permisos

| Acción | admin | barbero |
|--------|-------|---------|
| Gestionar servicios | ✅ | ❌ |
| Gestionar barberos | ✅ | ❌ |
| Configurar horarios base | ✅ | ❌ |
| Bloquear días libres | ✅ | ✅ (propios) |
| Ver todas las citas | ✅ | ✅ (solo propias) |
| Confirmar asistencia | ✅ | ✅ (propias) |
| Marcar no-show | ✅ | ✅ (propias) |
| Acceder a dashboard | ✅ | ✅ (limitado) |
| Ver notificaciones | ✅ | ✅ |
| Configurar negocio | ✅ | ❌ |
