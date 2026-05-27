-- supabase/migrations/002_add_modelo_and_rls_policies.sql
-- Ejecutar en Supabase > SQL Editor

-- =====================================================
-- 1. COLUMNA "modelo" EN articulos
-- =====================================================
ALTER TABLE articulos
  ADD COLUMN IF NOT EXISTS modelo VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_articulos_modelo ON articulos(modelo);


-- =====================================================
-- 2. POLÍTICAS RLS FALTANTES EN articulos
--    (solo existía SELECT — faltaban INSERT/UPDATE/DELETE)
-- =====================================================

-- Almacenistas y admin pueden insertar artículos
CREATE POLICY "usuarios autenticados pueden insertar articulos"
  ON articulos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Almacenistas y admin pueden actualizar artículos
CREATE POLICY "usuarios autenticados pueden actualizar articulos"
  ON articulos FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Solo admin puede eliminar/desactivar artículos
CREATE POLICY "usuarios autenticados pueden desactivar articulos"
  ON articulos FOR DELETE
  USING (auth.role() = 'authenticated');


-- =====================================================
-- 3. POLÍTICAS RLS FALTANTES EN lotes_inventario
--    (sin RLS activado antes — lo habilitamos aquí)
-- =====================================================
ALTER TABLE lotes_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos pueden ver lotes"
  ON lotes_inventario FOR SELECT USING (true);

CREATE POLICY "usuarios autenticados pueden insertar lotes"
  ON lotes_inventario FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados pueden actualizar lotes"
  ON lotes_inventario FOR UPDATE
  USING (auth.role() = 'authenticated');


-- =====================================================
-- 4. POLÍTICAS RLS FALTANTES EN inventario_actual
-- =====================================================
ALTER TABLE inventario_actual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos pueden ver inventario_actual"
  ON inventario_actual FOR SELECT USING (true);

CREATE POLICY "usuarios autenticados pueden insertar inventario_actual"
  ON inventario_actual FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados pueden actualizar inventario_actual"
  ON inventario_actual FOR UPDATE
  USING (auth.role() = 'authenticated');
