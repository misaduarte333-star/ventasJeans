-- supabase/migrations/003_security_and_rpcs.sql
-- Ejecutar en Supabase > SQL Editor

-- =====================================================
-- 1. ADICIÓN DE POLÍTICAS RLS DE ESCRITURA PARA VENDEDORES
-- =====================================================

-- ordenes_venta
CREATE POLICY "vendedores pueden insertar sus ordenes"
  ON ordenes_venta FOR INSERT
  WITH CHECK (auth.uid() = vendedor_id);

CREATE POLICY "vendedores pueden actualizar sus ordenes"
  ON ordenes_venta FOR UPDATE
  USING (auth.uid() = vendedor_id);

-- ordenes_venta_items
CREATE POLICY "vendedores pueden insertar items de sus ordenes"
  ON ordenes_venta_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ordenes_venta o 
    WHERE o.id = orden_venta_id AND o.vendedor_id = auth.uid()
  ));

-- pagos
CREATE POLICY "vendedores pueden insertar pagos de sus ordenes"
  ON pagos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ordenes_venta o 
    WHERE o.id = orden_venta_id AND o.vendedor_id = auth.uid()
  ));

-- gastos_vendedor
CREATE POLICY "vendedores pueden insertar sus gastos"
  ON gastos_vendedor FOR INSERT
  WITH CHECK (auth.uid() = vendedor_id);

CREATE POLICY "vendedores pueden actualizar sus gastos"
  ON gastos_vendedor FOR UPDATE
  USING (auth.uid() = vendedor_id);

CREATE POLICY "vendedores pueden eliminar sus gastos"
  ON gastos_vendedor FOR DELETE
  USING (auth.uid() = vendedor_id);

-- cortes_vendedor
CREATE POLICY "vendedores pueden insertar sus cortes"
  ON cortes_vendedor FOR INSERT
  WITH CHECK (auth.uid() = vendedor_id);

CREATE POLICY "vendedores pueden actualizar sus cortes"
  ON cortes_vendedor FOR UPDATE
  USING (auth.uid() = vendedor_id);


-- =====================================================
-- 2. POLÍTICAS RLS DE LECTURA Y ESCRITURA PARA ADMINS
-- =====================================================

-- Permite al perfil administrador tener acceso a todas las filas en lecturas
CREATE POLICY "admins pueden ver todas las ordenes"
  ON ordenes_venta FOR SELECT
  USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin');

CREATE POLICY "admins pueden ver todos los items"
  ON ordenes_venta_items FOR SELECT
  USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin');

CREATE POLICY "admins pueden ver todos los pagos"
  ON pagos FOR SELECT
  USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin');

CREATE POLICY "admins pueden ver todos los gastos"
  ON gastos_vendedor FOR SELECT
  USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin');

CREATE POLICY "admins pueden ver todos los cortes de vendedores"
  ON cortes_vendedor FOR SELECT
  USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'rol', '') = 'admin');

-- cortes_general (administrador puede crear, ver y editar cierres globales)
CREATE POLICY "todos pueden ver cortes generales"
  ON cortes_general FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados pueden insertar corte general"
  ON cortes_general FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados pueden actualizar corte general"
  ON cortes_general FOR UPDATE
  USING (auth.role() = 'authenticated');


-- =====================================================
-- 3. RPC: obtener_corte_vendedor
-- =====================================================
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

  -- 3. Calcular total de gastos del día
  SELECT COALESCE(SUM(monto), 0)
  INTO v_total_gastos
  FROM gastos_vendedor
  WHERE vendedor_id = p_vendedor_id 
    AND fecha = p_fecha;

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
