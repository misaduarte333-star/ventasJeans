-- supabase/migrations/006_add_precio_compra_articulos.sql
-- Ejecutar en Supabase > SQL Editor

-- =====================================================
-- 1. COLUMNA "precio_compra" EN articulos
-- =====================================================
ALTER TABLE articulos
  ADD COLUMN IF NOT EXISTS precio_compra DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- 2. NOTA: Actualizar artículos existentes con el costo de su lote inicial si existe
-- =====================================================
UPDATE articulos a
SET precio_compra = COALESCE(
  (SELECT precio_costo 
   FROM lotes_inventario l 
   WHERE l.articulo_id = a.id 
   ORDER BY l.fecha_ingreso ASC, l.created_at ASC 
   LIMIT 1), 
  0
)
WHERE precio_compra IS NULL OR precio_compra = 0;
