// src/hooks/useOrdenes.ts
'use client'

import useSWR from 'swr'
import { ordenesService } from '@/services/ordenes'
import { useAuthStore } from '@/store/authStore'
import type { OrdenVentaItem, TipoPago } from '@/types'
import { today } from '@/lib/formatting'

export const useOrdenes = () => {
  const { user } = useAuthStore()

  const { data: ordenes, mutate, isLoading } = useSWR(
    user ? `ordenes-${user.id}-${today()}` : null,
    () => ordenesService.ordenesDelDia(user!.id)
  )

  const crearOrden = async (
    cliente_nombre: string,
    direccion_entrega: string,
    items: Pick<OrdenVentaItem, 'articulo_id' | 'cantidad' | 'precio_unitario'>[]
  ) => {
    if (!user) throw new Error('No autenticado')
    const orden = await ordenesService.crearOrden(user.id, cliente_nombre, direccion_entrega, items)
    await mutate()
    return orden
  }

  const confirmarPago = async (
    orden_id: string,
    tipo_pago: TipoPago,
    monto: number,
    extra: { monto_recibido?: number; cambio?: number; referencia_banco?: string },
    repartidor_id?: string
  ) => {
    const pago = await ordenesService.confirmarPago(orden_id, tipo_pago, monto, extra, repartidor_id)
    await mutate()
    return pago
  }

  return {
    ordenes:  ordenes ?? [],
    isLoading,
    crearOrden,
    confirmarPago,
    mutate,
  }
}
