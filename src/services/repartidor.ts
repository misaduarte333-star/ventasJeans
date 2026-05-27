import { supabase } from './supabase'
import type { InventarioRepartidor, OrdenVenta } from '@/types'

export const repartidorService = {
  async obtenerInventarioRepartidor(repartidorId: string): Promise<InventarioRepartidor[]> {
    const { data, error } = await supabase
      .from('inventario_repartidor')
      .select('*, articulo:articulos(*)')
      .eq('repartidor_id', repartidorId)
      .gt('cantidad', 0)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async transferirStock(
    repartidorId: string,
    articuloId: string,
    cantidad: number,
    tipo: 'CARGAR' | 'DESCARGAR'
  ): Promise<void> {
    const { error } = await supabase.rpc('transferir_inventario_repartidor', {
      p_repartidor_id: repartidorId,
      p_articulo_id:   articuloId,
      p_cantidad:      cantidad,
      p_tipo:          tipo,
    })
    if (error) throw error
  },

  async asignarRepartidor(ordenId: string, repartidorId: string | null): Promise<void> {
    const { error } = await supabase
      .from('ordenes_venta')
      .update({ repartidor_id: repartidorId })
      .eq('id', ordenId)
    if (error) throw error
  },

  async ordenesDisponiblesParaEntrega(): Promise<OrdenVenta[]> {
    const hoy = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('ordenes_venta')
      .select('*, items:ordenes_venta_items(*, articulo:articulos(*)), pago:pagos(*)')
      .is('repartidor_id', null)
      .eq('estado', 'PENDIENTE')
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
}
