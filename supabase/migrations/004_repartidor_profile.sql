-- supabase/migrations/004_repartidor_profile.sql
-- Ejecutar en Supabase > SQL Editor

-- =====================================================
-- 1. AGREGAR COLUMNA repartidor_id A ordenes_venta
-- =====================================================
ALTER TABLE ordenes_venta
  ADD COLUMN IF NOT EXISTS repartidor_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_ordenes_repartidor ON ordenes_venta(repartidor_id);


-- =====================================================
-- 2. CREACIÓN DE TABLA inventario_repartidor
-- =====================================================
CREATE TABLE IF NOT EXISTS inventario_repartidor (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repartidor_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  articulo_id         UUID NOT NULL REFERENCES articulos(id) ON DELETE CASCADE,
  cantidad            INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(repartidor_id, articulo_id)
);

CREATE INDEX IF NOT EXISTS idx_inventario_repartidor_rep ON inventario_repartidor(repartidor_id);
CREATE INDEX IF NOT EXISTS idx_inventario_repartidor_art ON inventario_repartidor(articulo_id);


-- =====================================================
-- 3. HABILITAR RLS Y DEFINIR POLÍTICAS
-- =====================================================
ALTER TABLE inventario_repartidor ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden ver inventarios de repartidores
CREATE POLICY "todos pueden ver inventario_repartidor"
  ON inventario_repartidor FOR SELECT
  USING (auth.role() = 'authenticated');

-- Cualquier usuario autenticado puede insertar/actualizar/eliminar (para cargar/descargar stock)
CREATE POLICY "usuarios autenticados pueden insertar inventario_repartidor"
  ON inventario_repartidor FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados pueden actualizar inventario_repartidor"
  ON inventario_repartidor FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados pueden eliminar inventario_repartidor"
  ON inventario_repartidor FOR DELETE
  USING (auth.role() = 'authenticated');


-- Políticas RLS adicionales en ordenes_venta para repartidores
CREATE POLICY "repartidores pueden ver sus ordenes o pendientes"
  ON ordenes_venta FOR SELECT
  USING (repartidor_id = auth.uid() OR (repartidor_id IS NULL AND estado = 'PENDIENTE'));

CREATE POLICY "repartidores pueden actualizar sus ordenes"
  ON ordenes_venta FOR UPDATE
  USING (repartidor_id = auth.uid() OR (repartidor_id IS NULL AND estado = 'PENDIENTE'));

-- Políticas RLS en ordenes_venta_items para repartidores
CREATE POLICY "repartidores pueden ver items de sus ordenes o pendientes"
  ON ordenes_venta_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ordenes_venta o 
    WHERE o.id = orden_venta_id 
      AND (o.repartidor_id = auth.uid() OR (o.repartidor_id IS NULL AND o.estado = 'PENDIENTE'))
  ));

-- Políticas RLS en pagos para repartidores
CREATE POLICY "repartidores pueden ver pagos de sus ordenes"
  ON pagos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ordenes_venta o 
    WHERE o.id = orden_venta_id AND o.repartidor_id = auth.uid()
  ));

CREATE POLICY "repartidores pueden insertar pagos de sus ordenes"
  ON pagos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ordenes_venta o 
    WHERE o.id = orden_venta_id AND o.repartidor_id = auth.uid()
  ));


-- =====================================================
-- 4. RPC: transferir_inventario_repartidor
-- =====================================================
CREATE OR REPLACE FUNCTION transferir_inventario_repartidor(
  p_repartidor_id UUID,
  p_articulo_id   UUID,
  p_cantidad      INT,
  p_tipo          VARCHAR -- 'CARGAR' o 'DESCARGAR'
) RETURNS VOID AS $$
BEGIN
  IF p_tipo = 'CARGAR' THEN
    -- Verificar stock en inventario general
    IF NOT EXISTS (
      SELECT 1 FROM inventario_actual 
      WHERE articulo_id = p_articulo_id AND cantidad_disponible >= p_cantidad
    ) THEN
      RAISE EXCEPTION 'Stock general insuficiente para realizar la carga';
    END IF;

    -- Decrementar stock general
    UPDATE inventario_actual
    SET cantidad_disponible = cantidad_disponible - p_cantidad,
        ultima_actualizacion = NOW()
    WHERE articulo_id = p_articulo_id;

    -- Incrementar stock del repartidor
    INSERT INTO inventario_repartidor (repartidor_id, articulo_id, cantidad)
    VALUES (p_repartidor_id, p_articulo_id, p_cantidad)
    ON CONFLICT (repartidor_id, articulo_id)
    DO UPDATE SET cantidad = inventario_repartidor.cantidad + p_cantidad, updated_at = NOW();

    -- Registrar en Kardex
    INSERT INTO kardex (tabla_origen, registro_id, tipo_movimiento, cantidad_anterior, cantidad_nueva, usuario_id, descripcion)
    VALUES ('inventario_repartidor', p_articulo_id, 'CARGA_REPARTIDOR', NULL, p_cantidad, p_repartidor_id, 'Carga de inventario a repartidor móvil');

  ELSIF p_tipo = 'DESCARGAR' THEN
    -- Verificar stock en inventario del repartidor
    IF NOT EXISTS (
      SELECT 1 FROM inventario_repartidor 
      WHERE repartidor_id = p_repartidor_id AND articulo_id = p_articulo_id AND cantidad >= p_cantidad
    ) THEN
      RAISE EXCEPTION 'Stock de repartidor insuficiente para descargar';
    END IF;

    -- Decrementar stock del repartidor
    UPDATE inventario_repartidor
    SET cantidad = cantidad - p_cantidad,
        updated_at = NOW()
    WHERE repartidor_id = p_repartidor_id AND articulo_id = p_articulo_id;

    -- Incrementar stock general
    UPDATE inventario_actual
    SET cantidad_disponible = cantidad_disponible + p_cantidad,
        ultima_actualizacion = NOW()
    WHERE articulo_id = p_articulo_id;

    -- Registrar en Kardex
    INSERT INTO kardex (tabla_origen, registro_id, tipo_movimiento, cantidad_anterior, cantidad_nueva, usuario_id, descripcion)
    VALUES ('inventario_repartidor', p_articulo_id, 'DESCARGA_REPARTIDOR', NULL, -p_cantidad, p_repartidor_id, 'Descarga de inventario móvil a general');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 5. RPC: actualizar_inventario_repartidor_venta
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_inventario_repartidor_venta(
  p_repartidor_id UUID,
  p_articulo_id   UUID,
  p_cantidad      INT
) RETURNS VOID AS $$
BEGIN
  -- 1. Decrementar stock de repartidor móvil
  INSERT INTO inventario_repartidor (repartidor_id, articulo_id, cantidad)
  VALUES (p_repartidor_id, p_articulo_id, 0)
  ON CONFLICT (repartidor_id, articulo_id)
  DO NOTHING;

  UPDATE inventario_repartidor
  SET cantidad = cantidad - p_cantidad,
      updated_at = NOW()
  WHERE repartidor_id = p_repartidor_id AND articulo_id = p_articulo_id;

  -- 2. Incrementar la cantidad vendida en el inventario actual
  UPDATE inventario_actual
  SET cantidad_vendida = cantidad_vendida + p_cantidad,
      ultima_actualizacion = NOW()
  WHERE articulo_id = p_articulo_id;

  -- 3. Registrar en Kardex
  INSERT INTO kardex (tabla_origen, registro_id, tipo_movimiento, cantidad_anterior, cantidad_nueva, usuario_id, descripcion)
  VALUES ('inventario_repartidor', p_articulo_id, 'VENTA_REPARTIDOR', NULL, -p_cantidad, p_repartidor_id, 'Venta entregada y cobrada por repartidor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
