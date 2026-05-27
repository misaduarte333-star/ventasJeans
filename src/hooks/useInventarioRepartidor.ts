'use client'

import useSWR from 'swr'
import { repartidorService } from '@/services/repartidor'
import { useAuthStore } from '@/store/authStore'
import { inventarioService } from '@/services/inventario'

export const useInventarioRepartidor = () => {
  const { user } = useAuthStore()

  // Inventario móvil en posesión del repartidor actual
  const {
    data: inventarioMovil,
    mutate: mutateInventario,
    isLoading: loadingInventario,
  } = useSWR(
    user ? `repartidor-inventario-${user.id}` : null,
    () => repartidorService.obtenerInventarioRepartidor(user!.id)
  )

  // Stock consolidado en el almacén general
  const {
    data: stockGeneral,
    mutate: mutateStockGeneral,
    isLoading: loadingStockGeneral,
  } = useSWR(
    'stock-actual',
    () => inventarioService.stockActual()
  )

  const cargarInventario = async (articuloId: string, cantidad: number) => {
    if (!user) throw new Error('No autenticado')
    await repartidorService.transferirStock(user.id, articuloId, cantidad, 'CARGAR')
    await Promise.all([mutateInventario(), mutateStockGeneral()])
  }

  const descargarInventario = async (articuloId: string, cantidad: number) => {
    if (!user) throw new Error('No autenticado')
    await repartidorService.transferirStock(user.id, articuloId, cantidad, 'DESCARGAR')
    await Promise.all([mutateInventario(), mutateStockGeneral()])
  }

  const refresh = async () => {
    await Promise.all([mutateInventario(), mutateStockGeneral()])
  }

  return {
    inventarioMovil: inventarioMovil ?? [],
    stockGeneral:    stockGeneral ?? [],
    isLoading:       loadingInventario || loadingStockGeneral,
    cargarInventario,
    descargarInventario,
    refresh,
  }
}
