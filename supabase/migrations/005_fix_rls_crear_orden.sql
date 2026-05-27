-- supabase/migrations/005_fix_rls_crear_orden.sql
-- Ejecutar en Supabase > SQL Editor
-- SOLUCIÓN: Error "new row violates row-level security policy for table ordenes_venta"
--
-- El problema: el cliente Supabase usa anon key y el token JWT puede no estar
-- disponible en el contexto de la petición al momento del INSERT, o el usuario
-- autenticado no pasa correctamente la verificación de auth.uid() = vendedor_id.
--
-- Solución: RPC con SECURITY DEFINER que valida explícitamente la sesión
-- y realiza la inserción con privilegios elevados, evitando la restricción RLS.
-- =====================================================

CREATE OR REPLACE FUNCTION crear_orden_venta(
  p_vendedor_id      UUID,
  p_cliente_nombre   VARCHAR,
  p_direccion_entrega TEXT,
  p_numero_orden     VARCHAR,
  p_subtotal         DECIMAL,
  p_items            JSONB   -- Array de {articulo_id, cantidad, precio_unitario}
)
RETURNS JSON AS $$
DECLARE
  v_orden_id  UUID;
  v_item      JSONB;
  v_result    JSON;
BEGIN
  -- Verificar que el usuario autenticado es quien dice ser
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF auth.uid() != p_vendedor_id THEN
    RAISE EXCEPTION 'No autorizado: el vendedor_id no coincide con el usuario autenticado';
  END IF;

  -- Insertar la orden
  INSERT INTO ordenes_venta (
    numero_orden, vendedor_id, cliente_nombre,
    direccion_entrega, estado, subtotal
  )
  VALUES (
    p_numero_orden, p_vendedor_id, p_cliente_nombre,
    p_direccion_entrega, 'PENDIENTE', p_subtotal
  )
  RETURNING id INTO v_orden_id;

  -- Insertar los items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO ordenes_venta_items (
      orden_venta_id, articulo_id, cantidad, precio_unitario
    )
    VALUES (
      v_orden_id,
      (v_item->>'articulo_id')::UUID,
      (v_item->>'cantidad')::INT,
      (v_item->>'precio_unitario')::DECIMAL
    );
  END LOOP;

  -- Retornar la orden creada
  SELECT row_to_json(o) INTO v_result
  FROM ordenes_venta o
  WHERE o.id = v_orden_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
