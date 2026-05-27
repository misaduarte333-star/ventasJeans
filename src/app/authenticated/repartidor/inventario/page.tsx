// src/app/authenticated/repartidor/inventario/page.tsx
'use client'

import { useState } from 'react'
import {
  Package, ArrowDownToLine, ArrowUpFromLine,
  X, Loader2, RefreshCw, ShirtIcon, AlertTriangle
} from 'lucide-react'
import { useInventarioRepartidor } from '@/hooks/useInventarioRepartidor'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/formatting'
import type { InventarioRepartidor } from '@/types'

// ─── Tipo del stock general (join de inventario_actual + articulos) ──
type StockItem = {
  id: string
  articulo_id: string
  cantidad_disponible: number
  cantidad_vendida: number
  estado: string
  articulo?: {
    nombre: string
    talla: string
    color: string
    genero: string
    precio_venta: number
    sku: string
  }
}

// ─── Modal: Cargar desde almacén ─────────────────────────────
const ModalCargar = ({
  item,
  onClose,
  onConfirmar,
}: {
  item: StockItem
  onClose: () => void
  onConfirmar: (articuloId: string, cantidad: number) => Promise<void>
}) => {
  const [cantidad, setCantidad] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const maxCantidad = item.cantidad_disponible

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cantidad <= 0) { setError('La cantidad debe ser mayor a cero.'); return }
    if (cantidad > maxCantidad) { setError(`Solo hay ${maxCantidad} piezas disponibles en almacén.`); return }
    setCargando(true)
    setError('')
    try {
      await onConfirmar(item.articulo_id, cantidad)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el inventario.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Cargar a mi inventario</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {item.articulo?.nombre} · T{item.articulo?.talla} · {item.articulo?.color}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex justify-between text-[13px]">
            <span className="text-blue-600">Disponible en almacén</span>
            <span className="font-semibold text-blue-700">{maxCantidad} pzas</span>
          </div>

          <div>
            <label className="text-[12px] font-medium text-gray-500 block mb-1.5">
              Cantidad a cargar
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCantidad(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={maxCantidad}
                value={cantidad}
                onChange={e => setCantidad(Math.max(1, Math.min(maxCantidad, parseInt(e.target.value) || 1)))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-[16px] text-center font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button
                type="button"
                onClick={() => setCantidad(c => Math.min(maxCantidad, c + 1))}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium"
              >
                +
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] px-3 py-2.5 rounded-xl flex items-center gap-2">
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando || maxCantidad === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {cargando ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
            {cargando ? 'Cargando...' : `Cargar ${cantidad} pieza${cantidad !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Descargar de vuelta al almacén ────────────────────
const ModalDescargar = ({
  item,
  onClose,
  onConfirmar,
}: {
  item: InventarioRepartidor
  onClose: () => void
  onConfirmar: (articuloId: string, cantidad: number) => Promise<void>
}) => {
  const [cantidad, setCantidad] = useState(1)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState('')

  const maxCantidad = item.cantidad

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cantidad <= 0) { setError('La cantidad debe ser mayor a cero.'); return }
    if (cantidad > maxCantidad) { setError(`Solo tienes ${maxCantidad} piezas de este artículo.`); return }
    setDescargando(true)
    setError('')
    try {
      await onConfirmar(item.articulo_id, cantidad)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error al descargar el inventario.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Devolver al almacén</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {item.articulo?.nombre} · T{item.articulo?.talla} · {item.articulo?.color}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex justify-between text-[13px]">
            <span className="text-amber-600">En tu inventario móvil</span>
            <span className="font-semibold text-amber-700">{maxCantidad} pzas</span>
          </div>

          <div>
            <label className="text-[12px] font-medium text-gray-500 block mb-1.5">
              Cantidad a devolver
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCantidad(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={maxCantidad}
                value={cantidad}
                onChange={e => setCantidad(Math.max(1, Math.min(maxCantidad, parseInt(e.target.value) || 1)))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-[16px] text-center font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button
                type="button"
                onClick={() => setCantidad(c => Math.min(maxCantidad, c + 1))}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium"
              >
                +
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] px-3 py-2.5 rounded-xl flex items-center gap-2">
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={descargando}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
          >
            {descargando ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpFromLine size={16} />}
            {descargando ? 'Devolviendo...' : `Devolver ${cantidad} pieza${cantidad !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function InventarioRepartidorPage() {
  const { inventarioMovil, stockGeneral, isLoading, cargarInventario, descargarInventario, refresh } = useInventarioRepartidor()
  const [tab, setTab] = useState<'movil' | 'general'>('movil')
  const [itemCargar, setItemCargar] = useState<StockItem | null>(null)
  const [itemDescargar, setItemDescargar] = useState<InventarioRepartidor | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const totalPiezasMovil = inventarioMovil.reduce((s, i) => s + i.cantidad, 0)
  const totalPiezasGeneral = (stockGeneral as StockItem[]).reduce((s, i) => s + i.cantidad_disponible, 0)

  // Filtrar stock general por búsqueda
  const stockFiltrado = (stockGeneral as StockItem[]).filter(item => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      item.articulo?.nombre?.toLowerCase().includes(q) ||
      item.articulo?.talla?.toLowerCase().includes(q) ||
      item.articulo?.color?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">Inventario</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Gestiona tu stock en ruta y el almacén general</p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
          <p className="text-[11px] text-brand-500 uppercase tracking-wide font-medium">Mi inventario móvil</p>
          <p className="text-[28px] font-bold text-brand-700 mt-1">{totalPiezasMovil}</p>
          <p className="text-[12px] text-brand-400">piezas contigo</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Almacén general</p>
          <p className="text-[28px] font-bold text-gray-700 mt-1">{totalPiezasGeneral}</p>
          <p className="text-[12px] text-gray-400">piezas disponibles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab('movil')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all',
            tab === 'movil'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <ShirtIcon size={13} />
          Mi Inventario
          {totalPiezasMovil > 0 && (
            <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {inventarioMovil.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('general')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all',
            tab === 'general'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Package size={13} />
          Almacén General
        </button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : tab === 'movil' ? (
        /* ── Mi Inventario Móvil ── */
        <div className="space-y-2">
          {inventarioMovil.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center">
              <ShirtIcon size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-[14px] font-medium text-gray-500">Sin piezas cargadas</p>
              <p className="text-[12px] text-gray-400 mt-1">
                Ve a <strong>Almacén General</strong> para cargar mercancía a tu inventario
              </p>
            </div>
          ) : (
            inventarioMovil.map(inv => (
              <div key={inv.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <ShirtIcon size={16} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">
                      {inv.articulo?.nombre ?? 'Artículo'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Talla {inv.articulo?.talla} · {inv.articulo?.color} · {inv.articulo?.genero}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-brand-700">{inv.cantidad}</p>
                      <p className="text-[10px] text-gray-400">pzas</p>
                    </div>
                    <button
                      onClick={() => setItemDescargar(inv)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      <ArrowUpFromLine size={12} />
                      Devolver
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── Inventario General / Almacén ── */
        <div className="space-y-3">
          {/* Buscador */}
          <input
            type="text"
            placeholder="Buscar artículo, talla o color..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          />

          {stockFiltrado.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center">
              <Package size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-[14px] font-medium text-gray-500">
                {busqueda ? 'Sin resultados para tu búsqueda' : 'Almacén vacío'}
              </p>
            </div>
          ) : (
            stockFiltrado.map(item => {
              const disponible = item.cantidad_disponible
              const sinStock   = disponible === 0
              return (
                <div
                  key={item.id}
                  className={cn(
                    'bg-white border rounded-xl overflow-hidden',
                    sinStock ? 'border-gray-100 opacity-60' : 'border-gray-100'
                  )}
                >
                  <div className="px-4 py-3.5 flex items-center gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                      sinStock ? 'bg-gray-100' : 'bg-gray-50'
                    )}>
                      <ShirtIcon size={16} className={sinStock ? 'text-gray-300' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">
                        {item.articulo?.nombre ?? 'Artículo'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Talla {item.articulo?.talla} · {item.articulo?.color}
                        {item.articulo?.precio_venta && (
                          <> · {formatCurrency(item.articulo.precio_venta)}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className={cn(
                          'text-[16px] font-bold',
                          sinStock ? 'text-gray-300' : disponible <= 3 ? 'text-amber-600' : 'text-gray-700'
                        )}>
                          {disponible}
                        </p>
                        <p className="text-[10px] text-gray-400">en almacén</p>
                      </div>
                      <button
                        onClick={() => !sinStock && setItemCargar(item)}
                        disabled={sinStock}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                          sinStock
                            ? 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
                            : 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100'
                        )}
                      >
                        <ArrowDownToLine size={12} />
                        Cargar
                      </button>
                    </div>
                  </div>

                  {sinStock && (
                    <div className="px-4 pb-2.5">
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        Sin stock en almacén
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modales */}
      {itemCargar && (
        <ModalCargar
          item={itemCargar}
          onClose={() => setItemCargar(null)}
          onConfirmar={cargarInventario}
        />
      )}
      {itemDescargar && (
        <ModalDescargar
          item={itemDescargar}
          onClose={() => setItemDescargar(null)}
          onConfirmar={descargarInventario}
        />
      )}
    </div>
  )
}
