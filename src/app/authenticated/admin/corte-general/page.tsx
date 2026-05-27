// src/app/authenticated/admin/corte-general/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Loader2, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  ArrowRight, 
  History,
  Lock,
  Coins
} from 'lucide-react'
import { useCorte } from '@/hooks/useCorte'
import { cortesService } from '@/services/cortes'
import { supabase } from '@/services/supabase'
import { formatCurrency, formatDate, today } from '@/lib/formatting'
import { cn } from '@/lib/utils'

export default function CorteGeneralPage() {
  const { cerrarCorteGeneral, loading: closing } = useCorte()

  // Data states
  const [loadingData, setLoadingData] = useState(true)
  const [todosCerrados, setTodosCerrados] = useState(false)
  const [corteGralExistente, setCorteGralExistente] = useState<any>(null)
  const [datosCorte, setDatosCorte] = useState<{
    total_ventas: number
    total_efectivo: number
    total_transferencia: number
    cantidad_ordenes: number
    total_gastos: number
    cortes: any[]
  } | null>(null)
  const [historial, setHistorial] = useState<any[]>([])

  // Form inputs
  const [costoMercancia, setCostoMercancia] = useState('0')
  const [stockInicial, setStockInicial] = useState('0')
  const [stockFinal, setStockFinal] = useState('0')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const loadData = useCallback(async () => {
    setLoadingData(true)
    setError('')
    try {
      const fechaHoy = today()

      // 1. Check if General Cut already exists for today
      const { data: gralCut } = await supabase
        .from('cortes_general')
        .select('*')
        .eq('fecha', fechaHoy)
        .maybeSingle()
      
      if (gralCut) {
        setCorteGralExistente(gralCut)
      }

      // 2. Check if all active sellers closed their cuts today
      const closed = await cortesService.todosLosVendedoresCerraronHoy(fechaHoy)
      setTodosCerrados(closed)

      // 3. Load general calculations (sum of all closed cuts)
      const calc = await cortesService.calcularCorteGeneral(fechaHoy)
      setDatosCorte({
        total_ventas: calc.total_ventas || 0,
        total_efectivo: calc.total_efectivo || 0,
        total_transferencia: calc.total_transferencia || 0,
        cantidad_ordenes: calc.cantidad_ordenes || 0,
        total_gastos: calc.total_gastos || 0,
        cortes: calc.cortes || []
      })

      // 4. Fetch past General Cuts history
      const hist = await cortesService.historialCortes(10)
      setHistorial(hist)
    } catch (err: any) {
      setError(err?.message || 'Error al obtener la información de cortes.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCierreGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!datosCorte) return

    if (!todosCerrados) {
      setError('No puedes realizar el corte general hasta que todos los vendedores activos cierren sus cajas.')
      return
    }

    setError('')
    try {
      const costoVal = parseFloat(costoMercancia) || 0
      const stockIni = parseFloat(stockInicial) || 0
      const stockFin = parseFloat(stockFinal) || 0

      const totalesParaGuardar = {
        total_ventas: datosCorte.total_ventas,
        total_efectivo: datosCorte.total_efectivo,
        total_transferencia: datosCorte.total_transferencia,
        cantidad_ordenes: datosCorte.cantidad_ordenes,
        total_gastos: datosCorte.total_gastos,
        costo_mercancia_vendida: costoVal,
        stock_inicial_dia: stockIni,
        stock_final_dia: stockFin,
        fecha: today(),
        estado: 'CERRADO' as const,
      }

      const res = await cerrarCorteGeneral(totalesParaGuardar)
      setCorteGralExistente(res)
      setSuccess(true)
      
      // Refresh history
      const hist = await cortesService.historialCortes(10)
      setHistorial(hist)
    } catch (err: any) {
      setError(err?.message || 'Error al realizar el corte de caja general.')
    }
  }

  if (loadingData) {
    return (
      <div className="p-6 flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-600" size={24} />
      </div>
    )
  }

  // Calculate total cash expected and total discrepancy in seller cuts
  const totalReportadoVendedores = datosCorte?.cortes.reduce((s, c) => s + (c.efectivo_reportado || 0), 0) ?? 0
  const totalDiferenciaVendedores = datosCorte?.cortes.reduce((s, c) => s + (c.diferencia_efectivo || 0), 0) ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold text-gray-900">Corte General Diario</h1>
        <p className="text-[13px] text-gray-500">Conciliación de caja general de todos los vendedores para la fecha de hoy.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-[13px] font-semibold">
          {error}
        </div>
      )}

      {/* RLS or Status Alert */}
      {!corteGralExistente ? (
        <div className={cn(
          'p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm',
          todosCerrados 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        )}>
          <div className="flex items-start gap-2.5">
            {todosCerrados ? (
              <CheckCircle2 className="text-green-600 mt-0.5 flex-shrink-0" size={18} />
            ) : (
              <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
            )}
            <div>
              <h3 className="text-[14px] font-bold">
                {todosCerrados ? 'Listo para Cierre General' : 'Vendedores con turnos abiertos'}
              </h3>
              <p className="text-[12px] opacity-90 mt-0.5">
                {todosCerrados 
                  ? 'Todos los vendedores activos han cerrado sus cortes. Puedes guardar el consolidado del día.' 
                  : 'Faltan uno o más vendedores por reportar y cerrar sus turnos.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-800 shadow-sm">
          <Lock className="text-green-600 flex-shrink-0" size={18} />
          <div>
            <h3 className="text-[14px] font-bold">Corte General Cerrado</h3>
            <p className="text-[12px] opacity-90 mt-0.5">Las transacciones financieras para hoy ({today()}) han sido bloqueadas y registradas con éxito.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Consolidated metrics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-4">
            <h2 className="text-[15px] font-semibold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-gray-400" />
              Consolidado de Ingresos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Ventas Consolidadas</span>
                <span className="text-[18px] font-bold text-gray-900 mt-1">{formatCurrency(datosCorte?.total_ventas || 0)}</span>
                <span className="text-[11px] text-gray-400 block mt-0.5">{datosCorte?.cantidad_ordenes} órdenes totales</span>
              </div>

              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Efectivo Recibido</span>
                <span className="text-[18px] font-bold text-gray-900 mt-1">{formatCurrency(totalReportadoVendedores)}</span>
                <span className="text-[11px] text-gray-400 block mt-0.5">Físico reportado</span>
              </div>

              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Transferencias Bancarias</span>
                <span className="text-[18px] font-bold text-gray-900 mt-1">{formatCurrency(datosCorte?.total_transferencia || 0)}</span>
                <span className="text-[11px] text-gray-400 block mt-0.5">Vía banco</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 pt-3 gap-2 text-[13px]">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 font-medium">Gastos del Día:</span>
                <span className="font-bold text-red-600">-{formatCurrency(datosCorte?.total_gastos || 0)}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-gray-500 font-medium">Discrepancia Acumulada:</span>
                <span className={cn(
                  'font-bold',
                  totalDiferenciaVendedores === 0 
                    ? 'text-green-600' 
                    : totalDiferenciaVendedores > 0 
                    ? 'text-amber-600' 
                    : 'text-red-600'
                )}>
                  {totalDiferenciaVendedores === 0 ? 'Coincide' : formatCurrency(totalDiferenciaVendedores * -1)}
                </span>
              </div>
            </div>
          </div>

          {/* List of Seller Cuts */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
            <h2 className="text-[15px] font-semibold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Users size={16} className="text-gray-400" />
              Cortes por Vendedor
            </h2>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-[13px] min-w-[550px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Vendedor</th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ventas</th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Efectivo Esperado</th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Reportado</th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Diferencia</th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datosCorte?.cortes.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-b-0">
                      <td className="py-2.5 px-3 font-medium text-gray-800">
                        {c.vendedor_id.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {formatCurrency(c.total_ventas)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {formatCurrency(c.total_efectivo)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-800">
                        {formatCurrency(c.efectivo_reportado)}
                      </td>
                      <td className={cn(
                        'py-2.5 px-3 font-bold',
                        c.diferencia_efectivo === 0 
                          ? 'text-green-600' 
                          : 'text-red-500'
                      )}>
                        {c.diferencia_efectivo === 0 ? '0.00' : formatCurrency(c.diferencia_efectivo * -1)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-green-50 text-green-700 border border-green-100">
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {datosCorte?.cortes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-gray-400 text-[12px]">
                        No hay reportes de cortes individuales cargados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cierre General Panel */}
        <div className="flex flex-col gap-6">
          {!corteGralExistente ? (
            <form onSubmit={handleCierreGeneral} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-4">
              <h2 className="text-[15px] font-semibold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-1.5">
                <Coins size={16} className="text-gray-400" />
                Realizar Cierre General
              </h2>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Costo de Mercancía Vendida ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Costo total de artículos vendidos"
                  value={costoMercancia}
                  onChange={(e) => setCostoMercancia(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Stock Inicial del Día (Pzas/$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Valor del stock en apertura"
                  value={stockInicial}
                  onChange={(e) => setStockInicial(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Stock Final del Día (Pzas/$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Valor del stock en cierre"
                  value={stockFinal}
                  onChange={(e) => setStockFinal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <button
                type="submit"
                disabled={!todosCerrados || closing}
                className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm mt-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {closing ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Guardando...
                  </>
                ) : (
                  'Guardar Cierre General'
                )}
              </button>
            </form>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3.5">
              <h2 className="text-[15px] font-semibold text-gray-900 border-b border-gray-50 pb-2">Valores de Cierre Registrados</h2>
              
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Costo Mercancía Vendida:</span>
                  <span className="font-bold text-gray-800">{formatCurrency(corteGralExistente.costo_mercancia_vendida)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Stock Inicial del Día:</span>
                  <span className="font-bold text-gray-800">{formatCurrency(corteGralExistente.stock_inicial_dia)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Stock Final del Día:</span>
                  <span className="font-bold text-gray-800">{formatCurrency(corteGralExistente.stock_final_dia)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cuts History */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3 flex-1">
            <h2 className="text-[15px] font-semibold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <History size={16} className="text-gray-400" />
              Historial de Cortes
            </h2>

            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {historial.map((hist) => (
                <div key={hist.id} className="flex justify-between items-center text-[12px] border-b border-gray-50 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                  <div>
                    <span className="font-semibold text-gray-800 block">{formatDate(hist.fecha, 'dd MMM yyyy')}</span>
                    <span className="text-[10px] text-gray-400 block">{hist.cantidad_ordenes} órdenes</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatCurrency(hist.total_ventas)}</span>
                </div>
              ))}

              {historial.length === 0 && (
                <p className="text-center py-6 text-gray-400 text-[12px]">Sin cortes registrados.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
