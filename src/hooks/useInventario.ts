// src/hooks/useInventario.ts
'use client'

import useSWR from 'swr'
import { inventarioService } from '@/services/inventario'
import type { EntradaMercanciaForm } from '@/types'

export const useInventario = () => {
  const { data: articulos, mutate: mutateArticulos, isLoading: loadingArticulos } = useSWR(
    'articulos',
    () => inventarioService.listarArticulos()
  )

  const { data: stock, mutate: mutateStock, isLoading: loadingStock } = useSWR(
    'stock-actual',
    () => inventarioService.stockActual()
  )

  const registrarEntrada = async (form: EntradaMercanciaForm) => {
    const result = await inventarioService.registrarEntrada(form)
    await mutateArticulos()
    await mutateStock()
    return result
  }

  const buscarPorSku = async (sku: string) => {
    return inventarioService.buscarPorSku(sku)
  }

  const desactivarArticulo = async (id: string) => {
    await inventarioService.desactivarArticulo(id)
    await mutateArticulos()
    await mutateStock()
  }

  const actualizarArticulo = async (
    id: string,
    updates: Partial<Pick<import('@/types').Articulo, 'nombre' | 'modelo' | 'talla' | 'color' | 'genero' | 'precio_venta'>>
  ) => {
    await inventarioService.actualizarArticulo(id, updates)
    await mutateArticulos()
    await mutateStock()
  }

  return {
    articulos:        articulos ?? [],
    stock:            stock ?? [],
    loadingArticulos,
    loadingStock,
    registrarEntrada,
    buscarPorSku,
    desactivarArticulo,
    actualizarArticulo,
    mutateArticulos,
    mutateStock,
  }
}
