// src/hooks/useGastos.ts
'use client'

import useSWR from 'swr'
import { gastosService } from '@/services/gastos'
import { useAuthStore } from '@/store/authStore'
import { today } from '@/lib/formatting'

export const useGastos = () => {
  const { user } = useAuthStore()

  const { data: gastos, mutate, isLoading } = useSWR(
    user ? `gastos-${user.id}-${today()}` : null,
    () => gastosService.listarGastosHoy(user!.id)
  )

  const registrarGasto = async (
    tipo: string,
    monto: number,
    descripcion: string
  ) => {
    if (!user) throw new Error('No autenticado')
    const gasto = await gastosService.registrarGasto(user.id, tipo, monto, descripcion)
    await mutate()
    return gasto
  }

  const eliminarGasto = async (id: string) => {
    await gastosService.eliminarGasto(id)
    await mutate()
  }

  const totalGastos = (gastos ?? []).reduce((s, g) => s + g.monto, 0)

  return {
    gastos: gastos ?? [],
    isLoading,
    registrarGasto,
    eliminarGasto,
    totalGastos,
    mutate,
  }
}
