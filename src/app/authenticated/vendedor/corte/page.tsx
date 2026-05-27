// src/app/authenticated/vendedor/corte/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, DollarSign, ArrowUpRight, Scale, CheckCircle2, ShieldAlert, FileText, Printer, AlertTriangle } from 'lucide-react'
import { useCorte } from '@/hooks/useCorte'
import { cortesService } from '@/services/cortes'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/formatting'
import { today } from '@/lib/formatting'
import { cn } from '@/lib/utils'

interface TotalesCorte {
  total_ventas: number
  total_efectivo: number
  total_transferencia: number
  cantidad_transacciones: number
  total_gastos: number
  total_comisiones: number
}

export default function CorteVendedorPage() {
  const { user } = useAuthStore()
  const { cerrarCorteVendedor, loading: closing } = useCorte()

  // Loading States
  const [loadingData, setLoadingData] = useState(true)
  const [corteExistente, setCorteExistente] = useState<any>(null)
  const [totales, setTotales] = useState<TotalesCorte | null>(null)

  // Form States
  const [efectivoReportado, setEfectivoReportado] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Fetch today's calculated values and check existing corte
  const loadCorteInfo = useCallback(async () => {
    if (!user) return
    setLoadingData(true)
    setError('')
    try {
      const fechaHoy = today()
      
      // 1. Check if corte is already closed today
      const exist = await cortesService.corteVendedorPorFecha(user.id, fechaHoy)
      if (exist && exist.estado === 'CERRADO') {
        setCorteExistente(exist)
      } else {
        // 2. Otherwise calculate dynamic values
        const calc = await cortesService.calcularCorteVendedor(user.id, fechaHoy)
        if (calc) {
          setTotales({
            total_ventas: parseFloat(calc.total_ventas) || 0,
            total_efectivo: parseFloat(calc.total_efectivo) || 0,
            total_transferencia: parseFloat(calc.total_transferencia) || 0,
            cantidad_transacciones: parseInt(calc.cantidad_transacciones) || 0,
            total_gastos: parseFloat(calc.total_gastos) || 0,
            total_comisiones: parseFloat(calc.total_comisiones) || 0,
          })
          setEfectivoReportado(String(calc.total_efectivo || 0))
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error al obtener la información del corte.')
    } finally {
      setLoadingData(false)
    }
  }, [user])

  useEffect(() => {
    loadCorteInfo()
  }, [loadCorteInfo])

  // Discrepancy calculations
  const totalEfectivoEsperado = totales ? totales.total_efectivo : 0
  const reportadoNum = parseFloat(efectivoReportado) || 0
  const discrepancia = reportadoNum - totalEfectivoEsperado // positive: sobra, negative: falta

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!totales) return

    if (efectivoReportado === '') {
      setError('Por favor, ingresa el efectivo contado físico.')
      return
    }

    if (Math.abs(discrepancia) > 0 && !notas.trim()) {
      setError('Hay discrepancia en la caja. Por favor, escribe una nota aclaratoria.')
      return
    }

    setError('')
    try {
      const resp = await cerrarCorteVendedor(reportadoNum, notas.trim(), totales)
      setCorteExistente(resp)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'Error al realizar el cierre de caja.')
    }
  }

  const handleImprimirCorte = () => {
    const dataCorte = corteExistente || totales
    if (!dataCorte) return

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Corte de Caja - ${user?.email || 'Vendedor'}</title>
            <style>
              body { font-family: monospace; font-size: 13px; max-width: 300px; margin: 15px auto; padding: 10px; border: 1px dashed #ccc; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .header { margin-bottom: 15px; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
              .bold { font-weight: bold; }
              @media print { body { border: none; } }
            </style>
          </head>
          <body>
            <div class="text-center header">
              <h2>CORTE DE CAJA</h2>
              <p>Fecha: ${today()}</p>
              <p>Vendedor: ${user?.email}</p>
              <p>Estado: ${corteExistente ? 'CERRADO' : 'BORRADOR'}</p>
            </div>
            <div class="divider"></div>
            <div class="row"><span>Ventas Totales:</span><span class="bold">${formatCurrency(dataCorte.total_ventas)}</span></div>
            <div class="row"><span>Cant. Órdenes:</span><span>${dataCorte.cantidad_transacciones}</span></div>
            <div class="divider"></div>
            <div class="row"><span>Efectivo Esperado:</span><span>${formatCurrency(dataCorte.total_efectivo)}</span></div>
            <div class="row"><span>Transferencias:</span><span>${formatCurrency(dataCorte.total_transferencia)}</span></div>
            <div class="row"><span>Gastos Turno:</span><span>-${formatCurrency(dataCorte.total_gastos)}</span></div>
            <div class="row bold"><span>Comisión Ganada:</span><span>${formatCurrency(dataCorte.total_comisiones)}</span></div>
            <div class="divider"></div>
            <div class="row bold"><span>Efectivo Reportado:</span><span>${formatCurrency(corteExistente ? dataCorte.efectivo_reportado : reportadoNum)}</span></div>
            <div class="row bold"><span>Discrepancia:</span><span>${formatCurrency(corteExistente ? dataCorte.diferencia_efectivo * -1 : discrepancia)}</span></div>
            ${dataCorte.notas ? `<div class="divider"></div><p><strong>Notas:</strong> ${dataCorte.notas}</p>` : ''}
            <div class="divider"></div>
            <p class="text-center">¡Cierre de Turno Realizado!</p>
            <script>
              window.onload = () => {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  if (loadingData) {
    return (
      <div className="p-6 flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-600" size={24} />
      </div>
    )
  }

  // View when corte is already closed
  if (corteExistente) {
    return (
      <div className="p-6 max-w-xl mx-auto flex flex-col gap-6 items-center text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 border border-green-100 flex items-center justify-center mb-2">
          <CheckCircle2 size={36} />
        </div>

        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Caja cerrada con éxito</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Has completado el cierre de tu turno para hoy ({today()})
          </p>
        </div>

        <div className="w-full bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3.5 text-left">
          <h2 className="text-[14px] font-bold text-gray-800 border-b border-gray-50 pb-2">Resumen Registrado</h2>
          
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <span className="text-gray-400 block">Total Ventas:</span>
              <span className="font-bold text-gray-800">{formatCurrency(corteExistente.total_ventas)}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Transacciones:</span>
              <span className="font-bold text-gray-800">{corteExistente.cantidad_transacciones} ventas</span>
            </div>
            <div>
              <span className="text-gray-400 block">Efectivo Reportado:</span>
              <span className="font-bold text-gray-800">{formatCurrency(corteExistente.efectivo_reportado)}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Transferencias:</span>
              <span className="font-bold text-gray-800">{formatCurrency(corteExistente.total_transferencia)}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Gastos deducidos:</span>
              <span className="font-bold text-red-600">-{formatCurrency(corteExistente.total_gastos)}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Comisión acumulada:</span>
              <span className="font-bold text-brand-600">{formatCurrency(corteExistente.total_comisiones)}</span>
            </div>
          </div>

          <div className={cn(
            'p-3 rounded-lg border text-[12px] flex items-center justify-between font-semibold',
            corteExistente.diferencia_efectivo === 0
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          )}>
            <span>Diferencia de caja (Efectivo):</span>
            <span>
              {corteExistente.diferencia_efectivo === 0 
                ? 'Coincide perfecto' 
                : formatCurrency(corteExistente.diferencia_efectivo * -1)}
            </span>
          </div>

          {corteExistente.notas && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-[12px] text-gray-600">
              <strong>Notas aclaratorias:</strong> {corteExistente.notas}
            </div>
          )}
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={handleImprimirCorte}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm"
          >
            <Printer size={15} /> Imprimir Comprobante
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-[20px] font-bold text-gray-900">Mi Corte de Caja</h1>
        <p className="text-[13px] text-gray-500">Realiza el cierre de tu turno. Una vez cerrado no podrás modificar ventas ni gastos.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-2.5 text-[12px] font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dynamic metrics card */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-4">
            <h2 className="text-[15px] font-semibold text-gray-900 border-b border-gray-50 pb-2">Desglose del Turno</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Total Ventas</span>
                <span className="text-[18px] font-bold text-gray-900 mt-1">{formatCurrency(totales?.total_ventas || 0)}</span>
                <span className="text-[11px] text-gray-400 block mt-0.5">{totales?.cantidad_transacciones} órdenes</span>
              </div>

              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Comisión Estimada</span>
                <span className="text-[18px] font-bold text-brand-600 mt-1">{formatCurrency(totales?.total_comisiones || 0)}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Calculada según configuración</span>
              </div>

              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Efectivo en Caja (Esperado)</span>
                <span className="text-[18px] font-bold text-gray-900 mt-1">{formatCurrency(totales?.total_efectivo || 0)}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Pagos en efectivo</span>
              </div>

              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Transferencias Bancarias</span>
                <span className="text-[18px] font-bold text-gray-900 mt-1">{formatCurrency(totales?.total_transferencia || 0)}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Pagos vía banco</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-[13px]">
              <span className="text-gray-500 font-medium">Gastos del Vendedor deducidos:</span>
              <span className="font-bold text-red-600">-{formatCurrency(totales?.total_gastos || 0)}</span>
            </div>
          </div>
        </div>

        {/* Closing form */}
        <div className="md:col-span-1">
          <form onSubmit={handleCerrarCaja} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-gray-900 border-b border-gray-50 pb-2">Confirmación del Cierre</h2>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Efectivo Físico Contado
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                  <DollarSign size={14} />
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Monto de efectivo actual"
                  value={efectivoReportado}
                  onChange={(e) => setEfectivoReportado(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[14px] font-bold text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:bg-white"
                />
              </div>
            </div>

            {/* Discrepancy indicator */}
            <div className={cn(
              'p-2.5 rounded-lg border text-[11px] flex items-center justify-between font-semibold transition-all',
              discrepancia === 0
                ? 'bg-green-50 border-green-100 text-green-700'
                : discrepancia > 0
                ? 'bg-amber-50 border-amber-100 text-amber-700'
                : 'bg-red-50 border-red-100 text-red-700'
            )}>
              <span className="flex items-center gap-1">
                {discrepancia !== 0 && <AlertTriangle size={13} />}
                {discrepancia === 0 ? 'Caja cuadra perfectamente' : discrepancia > 0 ? 'Sobrante en Caja:' : 'Faltante en Caja:'}
              </span>
              <span>{formatCurrency(Math.abs(discrepancia))}</span>
            </div>

            {/* Notes (mandatory if there is discrepancy) */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Notas / Explicación
                {Math.abs(discrepancia) > 0 && <span className="text-red-500 font-bold ml-0.5">* Obligatorio</span>}
              </label>
              <textarea
                rows={3}
                placeholder="Escribe comentarios sobre diferencias de efectivo, inconvenientes, etc."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
              />
            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 flex items-start gap-1.5">
              <ShieldAlert size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 leading-normal">
                Al presionar Cierre definitivo, se guardará el balance de tu turno en la base de datos y se reportará a Administración.
              </p>
            </div>

            <button
              type="submit"
              disabled={closing}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {closing ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Registrando Cierre...
                </>
              ) : (
                'Cierre Definitivo de Caja'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
