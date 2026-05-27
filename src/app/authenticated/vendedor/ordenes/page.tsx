// src/app/authenticated/vendedor/ordenes/page.tsx
'use client'

import { useState } from 'react'
import { Plus, Check, Search, Receipt, ArrowUpRight, DollarSign, CreditCard, X, Loader2 } from 'lucide-react'
import { useOrdenes } from '@/hooks/useOrdenes'
import { formatCurrency, formatDateTime } from '@/lib/formatting'
import { cn } from '@/lib/utils'
import type { OrdenVenta, TipoPago } from '@/types'
import Link from 'next/link'

export default function OrdenesPage() {
  const { ordenes, isLoading, confirmarPago } = useOrdenes()
  
  // States
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'PENDIENTE' | 'PAGADO'>('TODAS')
  const [ordenCobrar, setOrdenCobrar] = useState<OrdenVenta | null>(null)

  // Payment Form States
  const [tipoPago, setTipoPago] = useState<TipoPago>('EFECTIVO')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [referenciaBanco, setReferenciaBanco] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [errorPago, setErrorPago] = useState('')

  // Filter orders
  const ordenesFiltradas = (ordenes ?? []).filter((ord) => {
    const matchBusqueda =
      ord.numero_orden.toLowerCase().includes(busqueda.toLowerCase()) ||
      (ord.cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase())
    
    const matchEstado = filtroEstado === 'TODAS' || ord.estado === filtroEstado
    return matchBusqueda && matchEstado
  })

  // Calculation for change (Efectivo)
  const totalACobrar = ordenCobrar ? ordenCobrar.subtotal : 0
  const recibidoNum = parseFloat(montoRecibido) || 0
  const cambioCalculado = recibidoNum >= totalACobrar ? recibidoNum - totalACobrar : 0

  const handleOpenCobrar = (ord: OrdenVenta) => {
    setOrdenCobrar(ord)
    setTipoPago('EFECTIVO')
    setMontoRecibido(String(ord.subtotal))
    setReferenciaBanco('')
    setErrorPago('')
    setCobrando(false)
  }

  const handleProcesarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ordenCobrar) return

    if (tipoPago === 'EFECTIVO' && recibidoNum < totalACobrar) {
      setErrorPago('El monto recibido no puede ser menor al total de la orden.')
      return
    }

    if (tipoPago === 'TRANSFERENCIA' && !referenciaBanco.trim()) {
      setErrorPago('La referencia bancaria es obligatoria.')
      return
    }

    setCobrando(true)
    setErrorPago('')
    try {
      const extra = tipoPago === 'EFECTIVO' 
        ? { monto_recibido: recibidoNum, cambio: cambioCalculado }
        : { referencia_banco: referenciaBanco.trim() }

      await confirmarPago(ordenCobrar.id, tipoPago, totalACobrar, extra)
      setOrdenCobrar(null)
    } catch (err: any) {
      setErrorPago(err?.message || 'Error al procesar el pago de la orden.')
    } finally {
      setCobrando(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Órdenes del día</h1>
          <p className="text-[13px] text-gray-500">Historial y cobro de órdenes creadas hoy</p>
        </div>
        <Link
          href="/authenticated/vendedor/ordenes/nueva"
          className="flex items-center justify-center gap-1.5 py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={15} /> Nueva orden
        </Link>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Buscar por número de orden o cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(['TODAS', 'PENDIENTE', 'PAGADO'] as const).map((est) => (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              className={cn(
                'px-3 py-1.5 text-[12px] rounded-lg border transition-colors flex-shrink-0',
                filtroEstado === est
                  ? 'bg-gray-100 border-gray-300 text-gray-800 font-semibold'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              )}
            >
              {est === 'TODAS' ? 'Todas' : est === 'PENDIENTE' ? 'Pendientes' : 'Pagadas'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table/List */}
      {isLoading ? (
        <div className="flex justify-center py-16 bg-white border border-gray-100 rounded-xl">
          <Loader2 className="animate-spin text-brand-600" size={24} />
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px] min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Orden</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Hora</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Monto</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Método</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ordenesFiltradas.map((ord) => {
                  const itemsCount = ord.items?.reduce((s, i) => s + i.cantidad, 0) ?? 0
                  return (
                    <tr key={ord.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-b-0">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-gray-900 block">{ord.numero_orden}</span>
                        <span className="text-[11px] text-gray-400 block mt-0.5">{itemsCount} artículos</span>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {ord.cliente_nombre || '-'}
                        {ord.direccion_entrega && (
                          <span className="text-[11px] text-gray-400 block font-normal truncate max-w-[200px]" title={ord.direccion_entrega}>
                            📍 {ord.direccion_entrega}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-normal">
                        {formatDateTime(ord.created_at).split(' a las ')[1]}
                      </td>
                      <td className="px-5 py-3 font-bold text-gray-900">
                        {formatCurrency(ord.subtotal)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium',
                          ord.estado === 'PAGADO' 
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        )}>
                          {ord.estado === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-medium">
                        {ord.pago ? (
                          <span className="text-[12px] text-gray-700">
                            {ord.pago.tipo_pago === 'EFECTIVO' ? '💵 Efectivo' : '💳 Transferencia'}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end">
                          {ord.estado === 'PENDIENTE' && (
                            <button
                              onClick={() => handleOpenCobrar(ord)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[12px] font-semibold transition-colors border border-brand-100"
                            >
                              <Check size={13} /> Cobrar
                            </button>
                          )}
                          {ord.estado === 'PAGADO' && (
                            <div className="text-[11px] text-green-600 bg-green-50 border border-green-100 rounded-lg px-2 py-1 flex items-center gap-1 font-semibold">
                              <Check size={12} /> Completada
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {ordenesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                      No se encontraron órdenes el día de hoy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL COBRAR ─── */}
      {ordenCobrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <Receipt size={16} className="text-brand-600" />
                <h3 className="text-[15px] font-semibold text-gray-900">Registrar cobro: {ordenCobrar.numero_orden}</h3>
              </div>
              <button 
                onClick={() => setOrdenCobrar(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProcesarPago} className="p-5 space-y-4">
              {errorPago && (
                <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-2.5 text-[12px] font-medium">
                  {errorPago}
                </div>
              )}

              {/* Order total display */}
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-brand-700 font-semibold uppercase tracking-wider block">Total a Pagar</span>
                  <span className="text-[13px] text-gray-500 mt-0.5">Cliente: {ordenCobrar.cliente_nombre}</span>
                </div>
                <span className="text-[22px] font-bold text-brand-900">{formatCurrency(ordenCobrar.subtotal)}</span>
              </div>

              {/* Selector de Método de Pago */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoPago('EFECTIVO')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2.5 rounded-lg border text-[13px] font-semibold transition-all',
                      tipoPago === 'EFECTIVO'
                        ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    <DollarSign size={15} /> Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPago('TRANSFERENCIA')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2.5 rounded-lg border text-[13px] font-semibold transition-all',
                      tipoPago === 'TRANSFERENCIA'
                        ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    <CreditCard size={15} /> Transferencia
                  </button>
                </div>
              </div>

              {/* Cash fields */}
              {tipoPago === 'EFECTIVO' && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Monto Recibido</label>
                    <input
                      type="number"
                      step="0.01"
                      min={ordenCobrar.subtotal}
                      required
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[14px] font-bold text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 pt-2.5 mt-2">
                    <span className="text-[12px] text-gray-500 font-medium">Cambio a entregar:</span>
                    <span className={cn(
                      'text-[15px] font-bold',
                      cambioCalculado > 0 ? 'text-green-600' : 'text-gray-700'
                    )}>
                      {formatCurrency(cambioCalculado)}
                    </span>
                  </div>
                </div>
              )}

              {/* Transfer fields */}
              {tipoPago === 'TRANSFERENCIA' && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Referencia Bancaria</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. REF-9831032"
                    value={referenciaBanco}
                    onChange={(e) => setReferenciaBanco(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 bg-white">
                <button
                  type="button"
                  onClick={() => setOrdenCobrar(null)}
                  disabled={cobrando}
                  className="py-2 px-4 border border-gray-200 text-gray-500 rounded-lg text-[13px] hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cobrando}
                  className="flex items-center gap-1.5 py-2 px-5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                  {cobrando ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Guardando...
                    </>
                  ) : (
                    'Confirmar Pago'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
