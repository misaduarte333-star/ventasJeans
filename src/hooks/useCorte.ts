// src/hooks/useCorte.ts
'use client'

import { useState } from 'react'
import { cortesService } from '@/services/cortes'
import { useAuthStore } from '@/store/authStore'
import { today } from '@/lib/formatting'

export const useCorte = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const calcularCorteVendedor = async () => {
    if (!user) throw new Error('No autenticado')
    return cortesService.calcularCorteVendedor(user.id, today())
  }

  const cerrarCorteVendedor = async (
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
  ) => {
    if (!user) throw new Error('No autenticado')
    setLoading(true)
    try {
      return await cortesService.cerrarCorteVendedor(user.id, today(), efectivo_reportado, notas, totales)
    } finally {
      setLoading(false)
    }
  }

  const calcularCorteGeneral = async () => {
    return cortesService.calcularCorteGeneral(today())
  }

  const cerrarCorteGeneral = async (totales: Parameters<typeof cortesService.cerrarCorteGeneral>[1]) => {
    setLoading(true)
    try {
      return await cortesService.cerrarCorteGeneral(today(), totales)
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    calcularCorteVendedor,
    cerrarCorteVendedor,
    calcularCorteGeneral,
    cerrarCorteGeneral,
  }
}
