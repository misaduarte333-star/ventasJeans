// src/services/gastos.ts
import { supabase } from './supabase'
import type { GastoVendedor } from '@/types'

export const gastosService = {

  async listarGastosHoy(vendedor_id: string): Promise<GastoVendedor[]> {
    const hoy = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('gastos_vendedor')
      .select('*')
      .eq('vendedor_id', vendedor_id)
      .eq('fecha', hoy)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async registrarGasto(
    vendedor_id: string,
    tipo: string,
    monto: number,
    descripcion: string
  ): Promise<GastoVendedor> {
    const fecha = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('gastos_vendedor')
      .insert([{ vendedor_id, tipo, monto, descripcion, fecha }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async eliminarGasto(id: string): Promise<void> {
    const { error } = await supabase
      .from('gastos_vendedor')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
