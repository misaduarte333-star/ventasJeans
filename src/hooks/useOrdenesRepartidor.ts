'use client'

import useSWR from 'swr'
import { ordenesService } from '@/services/ordenes'
import { repartidorService } from '@/services/repartidor'
import { useAuthStore } from '@/store/authStore'
import type { TipoPago } from '@/types'
import { today } from '@/lib/formatting'

export const useOrdenesRepartidor = () => {
  const { user } = useAuthStore()

  // Mis Entregas (Órdenes del día asignadas al repartidor actual)
  const {
    data: misEntregas,
    mutate: mutateMisEntregas,
    isLoading: loadingMisEntregas,
  } = useSWR(
    user ? `repartidor-entregas-${user.id}-${today()}` : null,
    () => ordenesService.ordenesDelDiaRepartidor(user!.id)
  )

  // Entregas Disponibles (Órdenes del día pendientes sin repartidor asignado)
  const {
    data: disponibles,
    mutate: mutateDisponibles,
    isLoading: loadingDisponibles,
  } = useSWR(
    user ? `repartidor-disponibles-${today()}` : null,
    () => repartidorService.ordenesDisponiblesParaEntrega()
  )

  const asignarOrden = async (ordenId: string) => {
    if (!user) throw new Error('No autenticado')
    await repartidorService.asignarRepartidor(ordenId, user.id)
    await Promise.all([mutateMisEntregas(), mutateDisponibles()])
  }

  const desasignarOrden = async (ordenId: string) => {
    await repartidorService.asignarRepartidor(ordenId, null)
    await Promise.all([mutateMisEntregas(), mutateDisponibles()])
  }

  const confirmarEntregaYPago = async (
    ordenId: string,
    tipoPago: TipoPago,
    monto: number,
    extra: { monto_recibido?: number; cambio?: number; referencia_banco?: string }
  ) => {
    if (!user) throw new Error('No autenticado')
    const pago = await ordenesService.confirmarPago(ordenId, tipoPago, monto, extra, user.id)
    await mutateMisEntregas()
    return pago
  }

  const refresh = async () => {
    await Promise.all([mutateMisEntregas(), mutateDisponibles()])
  }

  return {
    misEntregas: misEntregas ?? [],
    disponibles: disponibles ?? [],
    isLoading: loadingMisEntregas || loadingDisponibles,
    asignarOrden,
    desasignarOrden,
    confirmarEntregaYPago,
    refresh,
  }
}
