// src/services/ordenes.ts
import { supabase } from './supabase'
import type { OrdenVenta, OrdenVentaItem, Pago, TipoPago } from '@/types'

export const ordenesService = {

  async generarNumeroOrden(): Promise<string> {
    const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const { count } = await supabase
      .from('ordenes_venta')
      .select('*', { count: 'exact', head: true })
      .like('numero_orden', `ORD-${fecha}-%`)
    const sec = ((count ?? 0) + 1).toString().padStart(3, '0')
    return `ORD-${fecha}-${sec}`
  },

  async crearOrden(
    vendedor_id: string,
    cliente_nombre: string,
    direccion_entrega: string,
    items: Pick<OrdenVentaItem, 'articulo_id' | 'cantidad' | 'precio_unitario'>[]
  ): Promise<OrdenVenta> {
    const numero_orden = await this.generarNumeroOrden()
    const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

    // Usamos RPC con SECURITY DEFINER para evitar el error de RLS en INSERT.
    // La función valida internamente que auth.uid() == p_vendedor_id.
    const { data: orden, error: errOrden } = await supabase.rpc('crear_orden_venta', {
      p_vendedor_id:       vendedor_id,
      p_cliente_nombre:    cliente_nombre,
      p_direccion_entrega: direccion_entrega,
      p_numero_orden:      numero_orden,
      p_subtotal:          subtotal,
      p_items:             items,
    })
    if (errOrden) throw errOrden

    return orden as OrdenVenta
  },

  async confirmarPago(
    orden_id: string,
    tipo_pago: TipoPago,
    monto: number,
    extra: { monto_recibido?: number; cambio?: number; referencia_banco?: string },
    repartidor_id?: string
  ): Promise<Pago> {
    const { data: pago, error: errPago } = await supabase
      .from('pagos')
      .insert([{ orden_venta_id: orden_id, tipo_pago, monto, estado: 'PAGADO', ...extra }])
      .select()
      .single()
    if (errPago) throw errPago

    const { error: errOrden } = await supabase
      .from('ordenes_venta')
      .update({ estado: 'PAGADO', paid_at: new Date().toISOString() })
      .eq('id', orden_id)
    if (errOrden) throw errOrden

    // Actualizar inventario vía RPC
    const { data: items } = await supabase
      .from('ordenes_venta_items')
      .select('articulo_id, cantidad')
      .eq('orden_venta_id', orden_id)

    for (const item of items ?? []) {
      if (repartidor_id) {
        const { error: rpcErr } = await supabase.rpc('actualizar_inventario_repartidor_venta', {
          p_repartidor_id: repartidor_id,
          p_articulo_id:   item.articulo_id,
          p_cantidad:      item.cantidad,
        })
        if (rpcErr) throw rpcErr
      } else {
        const { error: rpcErr } = await supabase.rpc('actualizar_inventario_venta', {
          p_articulo_id: item.articulo_id,
          p_cantidad:    item.cantidad,
        })
        if (rpcErr) throw rpcErr
      }
    }

    return pago
  },

  async ordenesDelDia(vendedor_id: string): Promise<OrdenVenta[]> {
    const hoy = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('ordenes_venta')
      .select('*, items:ordenes_venta_items(*, articulo:articulos(*)), pago:pagos(*)')
      .eq('vendedor_id', vendedor_id)
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async ordenesDelDiaRepartidor(repartidor_id: string): Promise<OrdenVenta[]> {
    const hoy = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('ordenes_venta')
      .select('*, items:ordenes_venta_items(*, articulo:articulos(*)), pago:pagos(*)')
      .eq('repartidor_id', repartidor_id)
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
}
