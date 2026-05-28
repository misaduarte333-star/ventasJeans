// src/services/gastos.ts
import { supabase } from './supabase'
import type { GastoRepartidor } from '@/types'

export const gastosService = {

  async listarGastosHoy(repartidor_id: string): Promise<GastoRepartidor[]> {
    const hoy = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('gastos_repartidor')
      .select('*')
      .eq('repartidor_id', repartidor_id)
      .eq('fecha', hoy)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async registrarGasto(
    repartidor_id: string,
    tipo: string,
    monto: number,
    descripcion: string
  ): Promise<GastoRepartidor> {
    const fecha = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('gastos_repartidor')
      .insert([{ repartidor_id, tipo, monto, descripcion, fecha }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async eliminarGasto(id: string): Promise<void> {
    const { error } = await supabase
      .from('gastos_repartidor')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
