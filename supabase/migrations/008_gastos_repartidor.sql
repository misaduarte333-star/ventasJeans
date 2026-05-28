-- supabase/migrations/008_gastos_repartidor.sql

DO $$ 
BEGIN
  -- 1. Renombrar la tabla si aún se llama gastos_vendedor
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gastos_vendedor') THEN
    ALTER TABLE public.gastos_vendedor RENAME TO gastos_repartidor;
  END IF;

  -- Renombrar columna si aún existe vendedor_id
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gastos_repartidor' AND column_name = 'vendedor_id') THEN
    ALTER TABLE public.gastos_repartidor RENAME COLUMN vendedor_id TO repartidor_id;
  END IF;
END $$;

-- 2. Limpiar políticas antiguas (por si acaso quedaron con el nombre viejo)
DROP POLICY IF EXISTS "vendedores pueden insertar sus gastos" ON gastos_repartidor;
DROP POLICY IF EXISTS "vendedores pueden actualizar sus gastos" ON gastos_repartidor;
DROP POLICY IF EXISTS "vendedores pueden eliminar sus gastos" ON gastos_repartidor;
DROP POLICY IF EXISTS "vendedores ven sus gastos" ON gastos_repartidor;
DROP POLICY IF EXISTS "admins pueden ver todos los gastos" ON gastos_repartidor;

-- Limpiar políticas nuevas por si se corre el script múltiples veces
DROP POLICY IF EXISTS "repartidores pueden insertar sus gastos" ON gastos_repartidor;
DROP POLICY IF EXISTS "repartidores pueden actualizar sus gastos" ON gastos_repartidor;
DROP POLICY IF EXISTS "repartidores pueden eliminar sus gastos" ON gastos_repartidor;
DROP POLICY IF EXISTS "repartidores ven sus gastos" ON gastos_repartidor;

-- 3. Crear las políticas correctamente apuntando a la nueva columna `repartidor_id`
CREATE POLICY "repartidores pueden insertar sus gastos"
  ON gastos_repartidor FOR INSERT
  WITH CHECK (auth.uid() = repartidor_id);

CREATE POLICY "repartidores pueden actualizar sus gastos"
  ON gastos_repartidor FOR UPDATE
  USING (auth.uid() = repartidor_id);

CREATE POLICY "repartidores pueden eliminar sus gastos"
  ON gastos_repartidor FOR DELETE
  USING (auth.uid() = repartidor_id);

CREATE POLICY "repartidores ven sus gastos"
  ON gastos_repartidor FOR SELECT
  USING (auth.uid() = repartidor_id);

CREATE POLICY "admins pueden ver todos los gastos"
  ON gastos_repartidor FOR SELECT
  USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin');

-- 4. Modificar la función obtener_corte_vendedor para que ya no sume gastos
CREATE OR REPLACE FUNCTION obtener_corte_vendedor(
  p_vendedor_id UUID,
  p_fecha DATE
) RETURNS JSON AS $$
DECLARE
  v_total_ventas DECIMAL(10,2) := 0;
  v_total_efectivo DECIMAL(10,2) := 0;
  v_total_transferencia DECIMAL(10,2) := 0;
  v_cantidad_transacciones INT := 0;
  v_total_gastos DECIMAL(10,2) := 0;
  v_total_comisiones DECIMAL(10,2) := 0;
  r RECORD;
BEGIN
  -- 1. Calcular totales de órdenes pagadas hoy
  SELECT 
    COALESCE(SUM(subtotal), 0),
    COALESCE(COUNT(id), 0)
  INTO v_total_ventas, v_cantidad_transacciones
  FROM ordenes_venta
  WHERE vendedor_id = p_vendedor_id 
    AND estado = 'PAGADO' 
    AND DATE(created_at) = p_fecha;

  -- 2. Calcular montos de pagos por tipo
  SELECT 
    COALESCE(SUM(CASE WHEN p.tipo_pago = 'EFECTIVO' THEN p.monto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN p.tipo_pago = 'TRANSFERENCIA' THEN p.monto ELSE 0 END), 0)
  INTO v_total_efectivo, v_total_transferencia
  FROM pagos p
  JOIN ordenes_venta o ON p.orden_venta_id = o.id
  WHERE o.vendedor_id = p_vendedor_id 
    AND o.estado = 'PAGADO' 
    AND DATE(o.created_at) = p_fecha;

  -- 3. Los gastos ahora pertenecen al repartidor, por lo que el vendedor reporta 0 gastos
  v_total_gastos := 0;

  -- 4. Calcular comisiones acumuladas para cada orden del día
  FOR r IN 
    SELECT subtotal 
    FROM ordenes_venta 
    WHERE vendedor_id = p_vendedor_id 
      AND estado = 'PAGADO' 
      AND DATE(created_at) = p_fecha
  LOOP
    v_total_comisiones := v_total_comisiones + calcular_comision(p_vendedor_id, r.subtotal);
  END LOOP;

  -- Retornar como JSON
  RETURN json_build_object(
    'total_ventas', v_total_ventas,
    'total_efectivo', v_total_efectivo,
    'total_transferencia', v_total_transferencia,
    'cantidad_transacciones', v_cantidad_transacciones,
    'total_gastos', v_total_gastos,
    'total_comisiones', v_total_comisiones
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
