-- supabase/migrations/007_admin_user_management.sql
-- Ejecutar en Supabase > SQL Editor

-- =====================================================
-- 1. RPC: admin_get_users (Listar todos los usuarios y metadatos)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  nombre TEXT,
  rol TEXT,
  roles TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verificar que el invocador sea administrador
  IF NOT (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado: Se requiere rol de administrador';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::VARCHAR,
    coalesce(u.raw_user_meta_data ->> 'nombre', '')::TEXT,
    coalesce(u.raw_user_meta_data ->> 'rol', 'vendedor')::TEXT,
    ARRAY(
      SELECT jsonb_array_elements_text(coalesce(u.raw_user_meta_data -> 'roles', '["vendedor"]'::jsonb))
    )::TEXT[],
    u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 2. RPC: admin_update_user (Editar correo, contraseña, roles y metadatos)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_update_user(
  p_user_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_nombre TEXT,
  p_rol TEXT,
  p_roles TEXT[]
)
RETURNS VOID AS $$
BEGIN
  -- Verificar que el invocador sea administrador
  IF NOT (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado: Se requiere rol de administrador';
  END IF;

  UPDATE auth.users
  SET 
    email = p_email,
    -- Actualizar contraseña solo si se proporciona una nueva
    encrypted_password = CASE 
      WHEN p_password IS NOT NULL AND p_password <> '' 
      THEN extensions.crypt(p_password, extensions.gen_salt('bf')) 
      ELSE encrypted_password 
    END,
    raw_user_meta_data = 
      coalesce(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'nombre', p_nombre,
        'rol', p_rol,
        'roles', to_jsonb(p_roles)
      ),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 3. RPC: admin_create_user (Crear un nuevo usuario con roles y contraseña)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_nombre TEXT,
  p_rol TEXT,
  p_roles TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verificar que el invocador sea administrador
  IF NOT (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado: Se requiere rol de administrador';
  END IF;

  -- Crear el usuario en auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'nombre', p_nombre,
      'rol', p_rol,
      'roles', to_jsonb(p_roles)
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Crear también por defecto la configuración de vendedor si es que incluye el rol vendedor
  IF p_rol = 'vendedor' OR 'vendedor' = ANY(p_roles) THEN
    INSERT INTO public.configuracion_vendedor (vendedor_id, tipo_comision, valor_comision, activo, updated_at)
    VALUES (v_user_id, 'PORCENTAJE', 10.00, true, NOW())
    ON CONFLICT (vendedor_id) DO NOTHING;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 4. RPC: admin_delete_user (Eliminar un usuario completamente)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Verificar que el invocador sea administrador
  IF NOT (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado: Se requiere rol de administrador';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
