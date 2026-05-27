-- supabase/migrations/001_schema_inicial.sql
-- Ejecutar en Supabase > SQL Editor

-- =====================================================
-- 1. ARTICULOS
-- =====================================================
CREATE TABLE articulos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(100) NOT NULL,
  talla        VARCHAR(10)  NOT NULL,
  color        VARCHAR(50)  NOT NULL,
  genero       VARCHAR(20)  NOT NULL CHECK (genero IN ('Hombre', 'Mujer')),
  sku          VARCHAR(30)  UNIQUE NOT NULL,
  precio_venta DECIMAL(10,2) NOT NULL,
  activo       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  created_by   UUID REFERENCES auth.users(id),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  updated_by   UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_articulos_sku    ON articulos(sku);
CREATE INDEX idx_articulos_activo ON articulos(activo);

-- =====================================================
-- 2. LOTES_INVENTARIO (PEPS)
-- =====================================================
CREATE TABLE lotes_inventario (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id         UUID NOT NULL REFERENCES articulos(id) ON DELETE CASCADE,
  cantidad_inicial    INT  NOT NULL,
  cantidad_disponible INT  NOT NULL,
  precio_costo        DECIMAL(10,2) NOT NULL,
  fecha_ingreso       DATE NOT NULL,
  numero_lote         VARCHAR(50),
  created_at          TIMESTAMPTZ DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_lotes_peps           ON lotes_inventario(articulo_id, fecha_ingreso ASC);
CREATE INDEX idx_lotes_disponibilidad ON lotes_inventario(articulo_id, cantidad_disponible);

-- =====================================================
-- 3. INVENTARIO_ACTUAL
-- =====================================================
CREATE TABLE inventario_actual (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id         UUID UNIQUE NOT NULL REFERENCES articulos(id) ON DELETE CASCADE,
  cantidad_disponible INT DEFAULT 0,
  cantidad_vendida    INT DEFAULT 0,
  estado              VARCHAR(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','SIN_STOCK','INACTIVO')),
  ultima_actualizacion TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. PEDIDOS_BOT
-- =====================================================
CREATE TABLE pedidos_bot (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pedido_bot VARCHAR(50) UNIQUE NOT NULL,
  cliente_nombre    VARCHAR(100),
  cliente_telefono  VARCHAR(20),
  direccion_entrega TEXT,
  estado            VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','CONFIRMADO','ENTREGADO','CANCELADO')),
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pedidos_bot_codigo ON pedidos_bot(codigo_pedido_bot);

-- =====================================================
-- 5. ORDENES_VENTA
-- =====================================================
CREATE TABLE ordenes_venta (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_orden      VARCHAR(50) UNIQUE NOT NULL,
  vendedor_id       UUID NOT NULL REFERENCES auth.users(id),
  cliente_nombre    VARCHAR(100),
  direccion_entrega TEXT,
  pedido_bot_id     UUID REFERENCES pedidos_bot(id),
  estado            VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PAGADO','CANCELADO')),
  subtotal          DECIMAL(10,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  paid_at           TIMESTAMPTZ
);
CREATE INDEX idx_ordenes_vendedor ON ordenes_venta(vendedor_id);
CREATE INDEX idx_ordenes_estado   ON ordenes_venta(estado);
CREATE INDEX idx_ordenes_fecha    ON ordenes_venta(created_at);

-- =====================================================
-- 6. ORDENES_VENTA_ITEMS
-- =====================================================
CREATE TABLE ordenes_venta_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_venta_id UUID NOT NULL REFERENCES ordenes_venta(id) ON DELETE CASCADE,
  articulo_id    UUID NOT NULL REFERENCES articulos(id),
  cantidad       INT  NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  lote_id        UUID REFERENCES lotes_inventario(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ordenes_items_orden ON ordenes_venta_items(orden_venta_id);

-- =====================================================
-- 7. PAGOS
-- =====================================================
CREATE TABLE pagos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_venta_id UUID NOT NULL UNIQUE REFERENCES ordenes_venta(id),
  tipo_pago      VARCHAR(20) NOT NULL CHECK (tipo_pago IN ('EFECTIVO','TRANSFERENCIA')),
  monto          DECIMAL(10,2) NOT NULL,
  monto_recibido DECIMAL(10,2),
  cambio         DECIMAL(10,2),
  referencia_banco VARCHAR(100),
  estado         VARCHAR(20) DEFAULT 'PAGADO',
  created_at     TIMESTAMPTZ DEFAULT now(),
  created_by     UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_pagos_orden ON pagos(orden_venta_id);
CREATE INDEX idx_pagos_tipo  ON pagos(tipo_pago);

-- =====================================================
-- 8. GASTOS_VENDEDOR
-- =====================================================
CREATE TABLE gastos_vendedor (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES auth.users(id),
  tipo        VARCHAR(50) NOT NULL,
  monto       DECIMAL(10,2) NOT NULL,
  descripcion TEXT,
  fecha       DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_gastos_vendedor ON gastos_vendedor(vendedor_id, fecha);

-- =====================================================
-- 9. CONFIGURACION_VENDEDOR
-- =====================================================
CREATE TABLE configuracion_vendedor (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id     UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  tipo_comision   VARCHAR(20) CHECK (tipo_comision IN ('TARIFA_FIJA','PORCENTAJE')),
  valor_comision  DECIMAL(10,2) NOT NULL,
  activo          BOOLEAN DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  updated_by      UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 10. CORTES_VENDEDOR
-- =====================================================
CREATE TABLE cortes_vendedor (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id             UUID NOT NULL REFERENCES auth.users(id),
  fecha                   DATE NOT NULL,
  total_ventas            DECIMAL(10,2) DEFAULT 0,
  total_efectivo          DECIMAL(10,2) DEFAULT 0,
  total_transferencia     DECIMAL(10,2) DEFAULT 0,
  cantidad_transacciones  INT DEFAULT 0,
  efectivo_reportado      DECIMAL(10,2),
  diferencia_efectivo     DECIMAL(10,2),
  total_gastos            DECIMAL(10,2) DEFAULT 0,
  total_comisiones        DECIMAL(10,2) DEFAULT 0,
  estado                  VARCHAR(20) DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO','CERRADO')),
  reconciliado            BOOLEAN DEFAULT false,
  notas                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  created_by              UUID REFERENCES auth.users(id),
  closed_at               TIMESTAMPTZ,
  UNIQUE(vendedor_id, fecha)
);
CREATE INDEX idx_cortes_vendedor ON cortes_vendedor(vendedor_id, fecha);

-- =====================================================
-- 11. CORTES_GENERAL
-- =====================================================
CREATE TABLE cortes_general (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                   DATE NOT NULL UNIQUE,
  total_ventas            DECIMAL(10,2) DEFAULT 0,
  total_efectivo          DECIMAL(10,2) DEFAULT 0,
  total_transferencia     DECIMAL(10,2) DEFAULT 0,
  cantidad_ordenes        INT DEFAULT 0,
  stock_inicial_dia       DECIMAL(10,2),
  stock_final_dia         DECIMAL(10,2),
  costo_mercancia_vendida DECIMAL(10,2) DEFAULT 0,
  total_gastos            DECIMAL(10,2) DEFAULT 0,
  estado                  VARCHAR(20) DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO','CERRADO')),
  created_by              UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ DEFAULT now(),
  closed_at               TIMESTAMPTZ
);

-- =====================================================
-- 12. KARDEX
-- =====================================================
CREATE TABLE kardex (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla_origen     VARCHAR(100) NOT NULL,
  registro_id      UUID,
  tipo_movimiento  VARCHAR(50) NOT NULL,
  cantidad_anterior INT,
  cantidad_nueva    INT,
  usuario_id        UUID REFERENCES auth.users(id),
  fecha             TIMESTAMPTZ DEFAULT now(),
  descripcion       TEXT
);
CREATE INDEX idx_kardex_tabla   ON kardex(tabla_origen);
CREATE INDEX idx_kardex_usuario ON kardex(usuario_id);
CREATE INDEX idx_kardex_fecha   ON kardex(fecha);

-- =====================================================
-- RPC: actualizar inventario tras venta
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_inventario_venta(
  p_articulo_id UUID,
  p_cantidad    INT
) RETURNS VOID AS $$
BEGIN
  UPDATE inventario_actual
  SET cantidad_disponible  = cantidad_disponible - p_cantidad,
      cantidad_vendida     = cantidad_vendida + p_cantidad,
      ultima_actualizacion = NOW()
  WHERE articulo_id = p_articulo_id;

  UPDATE inventario_actual
  SET estado = CASE WHEN cantidad_disponible <= 0 THEN 'SIN_STOCK' ELSE 'ACTIVO' END
  WHERE articulo_id = p_articulo_id;

  INSERT INTO kardex (tabla_origen, registro_id, tipo_movimiento, cantidad_nueva, usuario_id, descripcion)
  VALUES ('inventario_actual', p_articulo_id, 'VENTA', -p_cantidad, auth.uid(), 'Venta confirmada');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RPC: calcular comisión
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_comision(
  p_vendedor_id  UUID,
  p_monto_venta  DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  v_tipo   VARCHAR;
  v_valor  DECIMAL;
BEGIN
  SELECT tipo_comision, valor_comision INTO v_tipo, v_valor
  FROM configuracion_vendedor
  WHERE vendedor_id = p_vendedor_id AND activo = true;

  IF v_tipo = 'TARIFA_FIJA' THEN RETURN v_valor;
  ELSIF v_tipo = 'PORCENTAJE' THEN RETURN ROUND(p_monto_venta * (v_valor / 100), 2);
  ELSE RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE articulos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_venta     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_vendedor    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes_vendedor    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes_general     ENABLE ROW LEVEL SECURITY;
ALTER TABLE kardex             ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos pueden ver articulos"
  ON articulos FOR SELECT USING (true);

CREATE POLICY "vendedores ven sus ordenes"
  ON ordenes_venta FOR SELECT
  USING (vendedor_id = auth.uid());

CREATE POLICY "vendedores ven sus items"
  ON ordenes_venta_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM ordenes_venta o WHERE o.id = orden_venta_id AND o.vendedor_id = auth.uid()));

CREATE POLICY "vendedores ven sus pagos"
  ON pagos FOR SELECT
  USING (EXISTS (SELECT 1 FROM ordenes_venta o WHERE o.id = orden_venta_id AND o.vendedor_id = auth.uid()));

CREATE POLICY "vendedores ven sus gastos"
  ON gastos_vendedor FOR SELECT
  USING (vendedor_id = auth.uid());

CREATE POLICY "vendedores ven su corte"
  ON cortes_vendedor FOR SELECT
  USING (vendedor_id = auth.uid());
