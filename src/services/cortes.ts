// src/services/cortes.ts
import { supabase } from './supabase'
import type { CorteVendedor, CorteGeneral } from '@/types'

export const cortesService = {

  // ─── Corte individual ─────────────────────────────────────────

  async calcularCorteVendedor(vendedor_id: string, fecha: string) {
    const { data, error } = await supabase.rpc('obtener_corte_vendedor', {
      p_vendedor_id: vendedor_id,
      p_fecha: fecha,
    })
    if (error) throw error
    return data
  },

  async cerrarCorteVendedor(
    vendedor_id: string,
    fecha: string,
    efectivo_reportado: number,
    notas: string,
    totales: {
      total_ventas: number
      total_efectivo: number
      total_transferencia: number
      cantidad_transacciones: number
      total_gastos: number
      total_comisiones: number
    }
  ): Promise<CorteVendedor> {
    const diferencia_efectivo = totales.total_efectivo - efectivo_reportado

    const { data, error } = await supabase
      .from('cortes_vendedor')
      .upsert([{
        vendedor_id,
        fecha,
        ...totales,
        efectivo_reportado,
        diferencia_efectivo,
        notas,
        estado: 'CERRADO',
        reconciliado: diferencia_efectivo === 0,
        closed_at: new Date().toISOString(),
      }], { onConflict: 'vendedor_id,fecha' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async corteVendedorPorFecha(vendedor_id: string, fecha: string): Promise<CorteVendedor | null> {
    const { data, error } = await supabase
      .from('cortes_vendedor')
      .select('*')
      .eq('vendedor_id', vendedor_id)
      .eq('fecha', fecha)
      .single()
    if (error) return null
    return data
  },

  // ─── Corte general ────────────────────────────────────────────

  async todosLosVendedoresCerraronHoy(fecha: string): Promise<boolean> {
    // Verifica que todos los vendedores activos hayan cerrado su corte
    const { data: vendedores } = await supabase
      .from('configuracion_vendedor')
      .select('vendedor_id')
      .eq('activo', true)

    const { data: cortesCerrados } = await supabase
      .from('cortes_vendedor')
      .select('vendedor_id')
      .eq('fecha', fecha)
      .eq('estado', 'CERRADO')

    const idsVendedores = vendedores?.map(v => v.vendedor_id) ?? []
    const idsCerrados = cortesCerrados?.map(c => c.vendedor_id) ?? []

    return idsVendedores.every(id => idsCerrados.includes(id))
  },

  async calcularCorteGeneral(fecha: string) {
    const { data: cortes, error } = await supabase
      .from('cortes_vendedor')
      .select('*')
      .eq('fecha', fecha)
      .eq('estado', 'CERRADO')
    if (error) throw error

    const total_ventas         = cortes?.reduce((s, c) => s + c.total_ventas, 0) ?? 0
    const total_efectivo       = cortes?.reduce((s, c) => s + c.total_efectivo, 0) ?? 0
    const total_transferencia  = cortes?.reduce((s, c) => s + c.total_transferencia, 0) ?? 0
    const cantidad_ordenes     = cortes?.reduce((s, c) => s + c.cantidad_transacciones, 0) ?? 0
    const total_gastos         = cortes?.reduce((s, c) => s + c.total_gastos, 0) ?? 0

    return { total_ventas, total_efectivo, total_transferencia, cantidad_ordenes, total_gastos, cortes }
  },

  async cerrarCorteGeneral(fecha: string, totales: Omit<CorteGeneral, 'id' | 'created_at' | 'created_by'>): Promise<CorteGeneral> {
    const { data, error } = await supabase
      .from('cortes_general')
      .upsert([{ ...totales, fecha, estado: 'CERRADO', closed_at: new Date().toISOString() }], { onConflict: 'fecha' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async historialCortes(limite = 30) {
    const { data, error } = await supabase
      .from('cortes_general')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(limite)
    if (error) throw error
    return data ?? []
  },
}
