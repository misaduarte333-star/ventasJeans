// src/services/inventario.ts
import { supabase } from './supabase'
import type { Articulo, LoteInventario, EntradaMercanciaForm } from '@/types'

export const inventarioService = {

  // ─── Catálogo ────────────────────────────────────────────────

  async listarArticulos(): Promise<Articulo[]> {
    const { data, error } = await supabase
      .from('articulos')
      .select('*, inventario:inventario_actual(*)')
      .eq('activo', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async buscarPorSku(sku: string): Promise<Articulo | null> {
    const { data, error } = await supabase
      .from('articulos')
      .select('*, inventario:inventario_actual(*)')
      .eq('sku', sku)
      .single()
    if (error) return null
    return data
  },

  async actualizarPrecio(id: string, precio_venta: number): Promise<void> {
    const { error } = await supabase
      .from('articulos')
      .update({ precio_venta, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async desactivarArticulo(id: string): Promise<void> {
    const { error } = await supabase
      .from('articulos')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error
  },

  async actualizarArticulo(
    id: string,
    updates: Partial<Pick<Articulo, 'nombre' | 'modelo' | 'talla' | 'color' | 'genero' | 'precio_venta'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('articulos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  // ─── Entrada de mercancía (artículo + lote en un solo paso) ──

  async registrarEntrada(form: EntradaMercanciaForm): Promise<{ articulo: Articulo; lote: LoteInventario }> {
    // 1. Generar SKU
    const sku = generarSku()

    // 2. Generar número de lote progresivo (LOTE-001, LOTE-002, ...)
    const { count: totalLotes } = await supabase
      .from('lotes_inventario')
      .select('*', { count: 'exact', head: true })
    const nextNum = ((totalLotes ?? 0) + 1).toString().padStart(3, '0')
    const numero_lote = `LOTE-${nextNum}`

    // 3. Crear artículo
    const { data: articulo, error: errArticulo } = await supabase
      .from('articulos')
      .insert([{
        nombre:       form.nombre,
        modelo:       form.modelo,
        talla:        form.talla,
        color:        form.color,
        genero:       form.genero,
        sku,
        precio_venta: form.precio_venta,
        activo:       true,
      }])
      .select()
      .single()
    if (errArticulo) throw errArticulo

    // 4. Crear lote PEPS con número auto-generado
    const { data: lote, error: errLote } = await supabase
      .from('lotes_inventario')
      .insert([{
        articulo_id:         articulo.id,
        cantidad_inicial:    form.cantidad,
        cantidad_disponible: form.cantidad,
        precio_costo:        form.precio_costo,
        fecha_ingreso:       form.fecha_ingreso,
        numero_lote,
      }])
      .select()
      .single()
    if (errLote) throw errLote

    // 5. Crear o actualizar inventario_actual
    const { error: errInv } = await supabase
      .from('inventario_actual')
      .upsert([{
        articulo_id:         articulo.id,
        cantidad_disponible: form.cantidad,
        cantidad_vendida:    0,
        estado:              'ACTIVO',
      }], { onConflict: 'articulo_id' })
    if (errInv) throw errInv

    return { articulo, lote }
  },

  // ─── Stock ────────────────────────────────────────────────────

  async stockActual() {
    const { data, error } = await supabase
      .from('inventario_actual')
      .select('*, articulo:articulos(nombre, talla, color, genero, sku)')
      .order('ultima_actualizacion', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async lotesPorArticulo(articulo_id: string): Promise<LoteInventario[]> {
    const { data, error } = await supabase
      .from('lotes_inventario')
      .select('*')
      .eq('articulo_id', articulo_id)
      .gt('cantidad_disponible', 0)
      .order('fecha_ingreso', { ascending: true })
    if (error) throw error
    return data ?? []
  },
}

// ─── Helpers ──────────────────────────────────────────────────

function generarSku(): string {
  const ts = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `UPC-${ts}-${rand}`
}
