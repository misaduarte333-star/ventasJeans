// src/app/authenticated/admin/entregas/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Truck, Search, RefreshCw, User, MapPin, Clock,
  CheckCircle2, XCircle, Package, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Check,
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import { adminService, AdminUser } from '@/services/admin'
import { formatCurrency } from '@/lib/formatting'
import { cn } from '@/lib/utils'
import type { OrdenVenta } from '@/types'

type OrdenConDetalle = OrdenVenta & {
  vendedorNombre?: string
  repartidorNombre?: string
}

const EstadoBadge = ({ estado }: { estado: string }) => {
  const cfg: Record<string, string> = {
    PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
    PAGADO:    'bg-green-50 text-green-700 border-green-200',
    CANCELADO: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg[estado] ?? cfg.PENDIENTE}`}>
      {estado === 'PENDIENTE' && <Clock size={10} />}
      {estado === 'PAGADO'    && <Check size={10} />}
      {estado === 'CANCELADO' && <XCircle size={10} />}
      {estado.charAt(0) + estado.slice(1).toLowerCase()}
    </span>
  )
}

export default function AdminEntregasPage() {
  const [ordenes, setOrdenes]       = useState<OrdenConDetalle[]>([])
  const [repartidores, setRepartidores] = useState<AdminUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busqueda, setBusqueda]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [asignando, setAsignando]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ordenesData, usuariosData] = await Promise.all([
        adminService.listAllOrdenes(),
        adminService.getUsers(),
      ])
      const userMap = Object.fromEntries(usuariosData.map((u) => [u.id, u]))
      const enriched = (ordenesData as OrdenConDetalle[]).map((o) => ({
        ...o,
        vendedorNombre:    o.vendedor_id   ? (userMap[o.vendedor_id]?.nombre   ?? o.vendedor_id.slice(0, 8))   : undefined,
        repartidorNombre:  o.repartidor_id ? (userMap[o.repartidor_id]?.nombre ?? o.repartidor_id.slice(0, 8)) : undefined,
      }))
      setOrdenes(enriched)
      setRepartidores(usuariosData.filter((u) => u.roles.includes('repartidor')))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const asignarRepartidor = async (ordenId: string, repartidorId: string) => {
    setAsignando(ordenId)
    try {
      const { error: err } = await supabase
        .from('ordenes_venta')
        .update({ repartidor_id: repartidorId })
        .eq('id', ordenId)
      if (err) throw err
      setSuccessMsg('Repartidor asignado correctamente')
      setTimeout(() => setSuccessMsg(''), 3000)
      await fetchData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al asignar repartidor')
    } finally {
      setAsignando(null)
    }
  }

  const ESTADOS = ['TODOS', 'PENDIENTE', 'PAGADO', 'CANCELADO'] as const

  const ordenesFiltradas = ordenes.filter((o) => {
    const matchEstado = filtroEstado === 'TODOS' || o.estado === filtroEstado
    const q = busqueda.toLowerCase()
    const matchBusqueda =
      !q ||
      o.numero_orden?.toLowerCase().includes(q) ||
      o.cliente_nombre?.toLowerCase().includes(q) ||
      o.direccion_entrega?.toLowerCase().includes(q) ||
      o.vendedorNombre?.toLowerCase().includes(q) ||
      o.repartidorNombre?.toLowerCase().includes(q)
    return matchEstado && matchBusqueda
  })

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">Control de Entregas</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">{ordenes.length} órdenes en total</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-[13px] px-4 py-3 rounded-xl">
          <CheckCircle2 size={15} /> {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-xl">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Buscar por orden, cliente, dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div className="flex gap-1.5">
          {ESTADOS.map((e) => {
            const counts: Record<string, number> = {
              TODOS:     ordenes.length,
              PENDIENTE: ordenes.filter((o) => o.estado === 'PENDIENTE').length,
              PAGADO:    ordenes.filter((o) => o.estado === 'PAGADO').length,
              CANCELADO: ordenes.filter((o) => o.estado === 'CANCELADO').length,
            }
            return (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all',
                  filtroEstado === e
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300'
                )}
              >
                {e === 'TODOS' ? 'Todos' : e.charAt(0) + e.slice(1).toLowerCase()}
                <span className="ml-1 bg-white/20 rounded-full px-1.5 text-[10px] font-bold">
                  {counts[e]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : ordenesFiltradas.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center">
          <Package size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-[14px] font-medium text-gray-500">No hay entregas que coincidan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenesFiltradas.map((orden) => {
            const isExpanded = expandedId === orden.id
            return (
              <div key={orden.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : orden.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-gray-400">#{orden.numero_orden}</span>
                      <EstadoBadge estado={orden.estado} />
                    </div>
                    <p className="text-[13px] font-semibold text-gray-800 mt-0.5 truncate">{orden.cliente_nombre ?? 'Sin nombre'}</p>
                  </div>

                  <div className="hidden sm:flex items-center gap-4 text-[12px] text-gray-500 shrink-0">
                    {orden.repartidorNombre ? (
                      <span className="flex items-center gap-1 text-brand-600 font-medium">
                        <Truck size={12} /> {orden.repartidorNombre}
                      </span>
                    ) : (
                      <span className="text-amber-500 italic">Sin repartidor</span>
                    )}
                    <span className="font-bold text-gray-800 text-[13px]">{formatCurrency(orden.subtotal)}</span>
                  </div>

                  {isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 grid sm:grid-cols-2 gap-4">
                    {/* Detalles */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Detalles de entrega</p>
                      {orden.direccion_entrega && (
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin size={12} />
                          </div>
                          <p className="text-[12.5px] text-gray-700">{orden.direccion_entrega}</p>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Clock size={12} />
                        </div>
                        <p className="text-[12.5px] text-gray-700">{new Date(orden.created_at).toLocaleString('es-MX')}</p>
                      </div>
                      {orden.vendedorNombre && (
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                            <User size={12} />
                          </div>
                          <p className="text-[12.5px] text-gray-700">Vendedor: {orden.vendedorNombre}</p>
                        </div>
                      )}

                      {/* Items */}
                      {orden.items && orden.items.length > 0 && (
                        <div className="bg-white border border-gray-100 rounded-lg p-2.5 space-y-1.5 mt-2">
                          {orden.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-[12px]">
                              <span className="text-gray-700 truncate max-w-[200px]">
                                {item.articulo?.nombre} — T{item.articulo?.talla} · {item.articulo?.color}
                              </span>
                              <span className="text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-[10.5px]">
                                ×{item.cantidad}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Asignar repartidor */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Asignar repartidor</p>
                      {repartidores.length === 0 ? (
                        <p className="text-[12px] text-gray-400">No hay repartidores registrados.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {repartidores.map((rep) => {
                            const isAsigned = orden.repartidor_id === rep.id
                            return (
                              <button
                                key={rep.id}
                                disabled={asignando === orden.id}
                                onClick={() => asignarRepartidor(orden.id, rep.id)}
                                className={cn(
                                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border transition-all',
                                  isAsigned
                                    ? 'bg-brand-600 text-white border-brand-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                                )}
                              >
                                {asignando === orden.id
                                  ? <Loader2 size={13} className="animate-spin" />
                                  : <Truck size={13} />
                                }
                                {rep.nombre || rep.email}
                                {isAsigned && <Check size={13} className="ml-auto" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
