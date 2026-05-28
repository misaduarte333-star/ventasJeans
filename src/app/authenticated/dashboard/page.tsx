// src/app/authenticated/dashboard/page.tsx
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ShoppingCart, Package, TrendingUp, Users, ArrowRight,
  DollarSign, Receipt, BarChart3, AlertTriangle,
  CreditCard, Wallet, ClipboardList, Plus, ShirtIcon
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useInventario } from '@/hooks/useInventario'
import { useOrdenes } from '@/hooks/useOrdenes'
import { useOrdenesRepartidor } from '@/hooks/useOrdenesRepartidor'
import { useInventarioRepartidor } from '@/hooks/useInventarioRepartidor'
import { formatCurrency } from '@/lib/formatting'
import type { Rol } from '@/types'

// ─── KPI Card ────────────────────────────────────────────────────────────────

type KpiCardProps = {
  icon: React.ReactNode
  label: string
  value: string | number
  sublabel?: string
  highlight?: boolean
  warning?: boolean
}

const KpiCard = ({ icon, label, value, sublabel, highlight, warning }: KpiCardProps) => (
  <div className={`bg-white border rounded-xl p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3 transition-all hover:shadow-sm ${
    highlight ? 'border-brand-200 bg-brand-50/30' : warning ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100'
  }`}>
    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${
      highlight ? 'bg-brand-100 text-brand-600' : warning ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
    }`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] sm:text-[11px] font-medium text-gray-400 uppercase tracking-wide truncate">{label}</p>
      <p className={`text-[16px] sm:text-[22px] font-semibold mt-0.5 truncate ${
        highlight ? 'text-brand-700' : warning ? 'text-amber-700' : 'text-gray-900'
      }`} title={String(value)}>{value}</p>
      {sublabel && <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">{sublabel}</p>}
    </div>
  </div>
)

// ─── Quick Action Button ──────────────────────────────────────────────────────

const QuickAction = ({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) => (
  <Link
    href={href}
    className="group flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-brand-200 hover:bg-brand-50/20 transition-all"
  >
    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-brand-100 text-gray-500 group-hover:text-brand-600 flex items-center justify-center transition-colors">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-medium text-gray-800">{label}</p>
      <p className="text-[11px] text-gray-400 truncate">{desc}</p>
    </div>
    <ArrowRight size={14} className="text-gray-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
  </Link>
)

// ─── Badge de estado orden ────────────────────────────────────────────────────
const EstadoBadge = ({ estado }: { estado: string }) => {
  const cfg: Record<string, string> = {
    PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
    PAGADO:    'bg-green-50 text-green-700 border-green-200',
    CANCELADO: 'bg-red-50   text-red-700   border-red-200',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg[estado] ?? cfg.PENDIENTE}`}>
      {estado.charAt(0) + estado.slice(1).toLowerCase()}
    </span>
  )
}

// ─── Dashboard Admin ─────────────────────────────────────────────────────────
const DashboardAdmin = () => {
  const { articulos, stock } = useInventario()

  const totalArticulos   = articulos.length
  const totalPiezas      = stock.reduce((s, i) => s + (i.cantidad_disponible ?? 0), 0)
  const articulosSinStock = stock.filter(i => i.estado === 'SIN_STOCK').length
  const valorInventario  = articulos.reduce((s, a) => {
    const piezas = stock.find(i => i.articulo_id === a.id)?.cantidad_disponible ?? 0
    return s + (a.precio_venta * piezas)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-[20px] font-semibold text-gray-900">Panel de Administración</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Vista consolidada de la operación hoy</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          icon={<Package size={16} />}
          label="Artículos activos"
          value={totalArticulos}
          sublabel="en inventario"
          highlight
        />
        <KpiCard
          icon={<ShirtIcon size={16} />}
          label="Piezas en stock"
          value={totalPiezas}
          sublabel="unidades disponibles"
        />
        <KpiCard
          icon={<DollarSign size={16} />}
          label="Valor inventario"
          value={formatCurrency(valorInventario)}
          sublabel="precio de venta"
          highlight
        />
        <KpiCard
          icon={<AlertTriangle size={16} />}
          label="Sin stock"
          value={articulosSinStock}
          sublabel="artículos agotados"
          warning={articulosSinStock > 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Artículos con stock bajo */}
        <div className="xl:col-span-2 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[13px] font-medium text-gray-900">Artículos con stock bajo</span>
            <Link href="/authenticated/almacen/articulos" className="text-[12px] text-brand-600 hover:text-brand-800 flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px] min-w-[450px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Artículo / Modelo</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Talla / Color</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Stock</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Precio</th>
                </tr>
              </thead>
              <tbody>
                {articulos
                  .filter(a => {
                    const inv = stock.find(i => i.articulo_id === a.id)
                    return (inv?.cantidad_disponible ?? 0) <= 3
                  })
                  .slice(0, 6)
                  .map(a => {
                    const piezas = stock.find(i => i.articulo_id === a.id)?.cantidad_disponible ?? 0
                    return (
                      <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50/70">
                        <td className="px-3 py-2.5">
                          <p className="text-gray-800 font-medium leading-tight truncate max-w-[160px]">{a.nombre}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{a.modelo}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1">
                            <span className="text-gray-700 font-medium">{a.talla}</span>
                            {a.color && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-gray-500">{a.color}</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            piezas === 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {piezas === 0 ? 'Agotado' : `${piezas} pza${piezas !== 1 ? 's' : ''}`}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{formatCurrency(a.precio_venta)}</td>
                      </tr>
                    )
                  })}
                {articulos.filter(a => {
                  const inv = stock.find(i => i.articulo_id === a.id)
                  return (inv?.cantidad_disponible ?? 0) <= 3
                }).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-gray-400">
                      ✓ Todos los artículos tienen stock suficiente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex flex-col gap-3">
          <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">Acciones rápidas</p>
          <QuickAction href="/authenticated/almacen/entrada"   icon={<Plus size={15} />}    label="Registrar entrada"  desc="Agregar nuevo artículo y lote" />
          <QuickAction href="/authenticated/almacen/articulos" icon={<ClipboardList size={15} />} label="Ver inventario"  desc="Artículos y precios" />
          <QuickAction href="/authenticated/admin/corte-general" icon={<BarChart3 size={15} />}  label="Corte general" desc="Consolidar ventas del día" />
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Almacenista ────────────────────────────────────────────────────
const DashboardAlmacenista = () => {
  const { articulos, stock, loadingArticulos } = useInventario()

  const totalArticulos    = articulos.length
  const totalPiezas       = stock.reduce((s, i) => s + (i.cantidad_disponible ?? 0), 0)
  const stockBajo         = stock.filter(i => i.estado !== 'SIN_STOCK' && i.cantidad_disponible <= 3).length
  const sinStock          = stock.filter(i => i.estado === 'SIN_STOCK').length
  const totalVendidas     = stock.reduce((s, i) => s + (i.cantidad_vendida ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-gray-900">Control de Inventario</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Estado actual del almacén e inventario</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard icon={<Package size={16} />}       label="Artículos" value={totalArticulos}              sublabel="en inventario" highlight />
        <KpiCard icon={<ShirtIcon size={16} />}     label="Piezas disponibles" value={totalPiezas}        sublabel="en bodega" />
        <KpiCard icon={<TrendingUp size={16} />}    label="Total vendidas" value={totalVendidas}           sublabel="piezas despachadas" />
        <KpiCard icon={<AlertTriangle size={16} />} label="Alertas de stock" value={stockBajo + sinStock}  sublabel={`${sinStock} agotados`} warning={stockBajo + sinStock > 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[13px] font-medium text-gray-900">Últimas entradas al inventario</span>
            <Link href="/authenticated/almacen/articulos" className="text-[12px] text-brand-600 hover:text-brand-800 flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {loadingArticulos ? (
            <div className="px-4 py-8 text-center text-[12px] text-gray-400">Cargando...</div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-[13px] min-w-[500px]">
                <thead>
                  <tr className="bg-gray-50">
                    {['Artículo', 'Talla', 'Color', 'Stock', 'Precio venta'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {articulos.slice(0, 6).map(a => {
                    const inv     = stock.find(i => i.articulo_id === a.id)
                    const piezas  = inv?.cantidad_disponible ?? 0
                    const estado  = inv?.estado ?? 'ACTIVO'
                    return (
                      <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800 truncate max-w-[160px]">{a.nombre}</td>
                        <td className="px-4 py-2.5 text-gray-500">{a.talla}</td>
                        <td className="px-4 py-2.5 text-gray-500">{a.color}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            estado === 'SIN_STOCK' ? 'bg-red-50 text-red-700'
                            : piezas <= 3          ? 'bg-amber-50 text-amber-700'
                            :                        'bg-green-50 text-green-700'
                          }`}>
                            {estado === 'SIN_STOCK' ? 'Agotado' : `${piezas} pzas`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{formatCurrency(a.precio_venta)}</td>
                      </tr>
                    )
                  })}
                  {articulos.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-gray-400">Sin artículos registrados aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">Acciones rápidas</p>
          <QuickAction href="/authenticated/almacen/entrada"   icon={<Plus size={15} />}         label="Nueva entrada"    desc="Registrar artículo y lote" />
          <QuickAction href="/authenticated/almacen/articulos" icon={<ClipboardList size={15} />} label="Ver inventario"     desc="Artículos activos" />
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Vendedor ───────────────────────────────────────────────────────
const DashboardVendedor = () => {
  const { user }     = useAuth()
  const { ordenes, isLoading } = useOrdenes()

  const totalVentas      = useMemo(() => ordenes.filter(o => o.estado === 'PAGADO').reduce((s, o) => s + o.subtotal, 0), [ordenes])
  const pendientes       = useMemo(() => ordenes.filter(o => o.estado === 'PENDIENTE').length, [ordenes])
  const pagadas          = useMemo(() => ordenes.filter(o => o.estado === 'PAGADO').length, [ordenes])
  const totalTransacciones = ordenes.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-gray-900">Mis ventas de hoy</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          {user?.email} · {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard icon={<DollarSign size={16} />}     label="Total cobrado"     value={formatCurrency(totalVentas)}  sublabel="ventas pagadas" highlight />
        <KpiCard icon={<ShoppingCart size={16} />}   label="Órdenes totales"   value={totalTransacciones}           sublabel="del día" />
        <KpiCard icon={<Wallet size={16} />}         label="Pagadas"           value={pagadas}                      sublabel="transacciones" />
        <KpiCard icon={<Receipt size={16} />}        label="Pendientes"        value={pendientes}                   sublabel="sin cobrar" warning={pendientes > 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[13px] font-medium text-gray-900">Órdenes de hoy</span>
            <Link href="/authenticated/vendedor/ordenes" className="text-[12px] text-brand-600 hover:text-brand-800 flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {isLoading ? (
            <div className="px-4 py-8 text-center text-[12px] text-gray-400">Cargando órdenes...</div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-[13px] min-w-[400px]">
                <thead>
                  <tr className="bg-gray-50">
                    {['# Orden', 'Cliente', 'Total', 'Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordenes.slice(0, 7).map(o => (
                    <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400">{o.numero_orden}</td>
                      <td className="px-4 py-2.5 text-gray-800 truncate max-w-[150px]">{o.cliente_nombre ?? '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{formatCurrency(o.subtotal)}</td>
                      <td className="px-4 py-2.5"><EstadoBadge estado={o.estado} /></td>
                    </tr>
                  ))}
                  {ordenes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center">
                        <p className="text-[13px] text-gray-400">Sin órdenes registradas hoy</p>
                        <p className="text-[12px] text-gray-300 mt-1">Empieza creando tu primera orden del día</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">Acciones rápidas</p>
          <QuickAction href="/authenticated/vendedor/ordenes/nueva" icon={<Plus size={15} />}           label="Nueva venta"      desc="Crear orden y cobrar" />
          <QuickAction href="/authenticated/vendedor/gastos"        icon={<Receipt size={15} />}         label="Registrar gasto"  desc="Gasolina, comida, etc." />
          <QuickAction href="/authenticated/vendedor/corte"         icon={<CreditCard size={15} />}      label="Mi corte diario"  desc="Cerrar y reportar" />
          <QuickAction href="/authenticated/vendedor/ordenes"       icon={<ClipboardList size={15} />}   label="Mis órdenes"      desc="Ver historial del día" />
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Repartidor ────────────────────────────────────────────────────
const DashboardRepartidor = () => {
  const { user } = useAuth()
  const { misEntregas, disponibles, isLoading } = useOrdenesRepartidor()
  const { inventarioMovil } = useInventarioRepartidor()

  const entregadas   = useMemo(() => misEntregas.filter(o => o.estado === 'PAGADO').length, [misEntregas])
  const pendientes   = useMemo(() => misEntregas.filter(o => o.estado === 'PENDIENTE').length, [misEntregas])
  const entregasPendientes = useMemo(() => misEntregas.filter(o => o.estado === 'PENDIENTE'), [misEntregas])
  const totalCobrado   = useMemo(() => misEntregas.filter(o => o.estado === 'PAGADO').reduce((s, o) => s + o.subtotal, 0), [misEntregas])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-gray-900">Mis Entregas de Hoy</h1>
      </div>

      <div className="flex flex-col gap-3 max-w-md">
        {/* KPI: Dinero acumulado por entregas cobradas */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-xl p-3.5 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-100">Dinero acumulado por entregas</p>
            <p className="text-[20px] font-extrabold">{formatCurrency(totalCobrado)}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <DollarSign size={16} />
          </div>
        </div>

        {/* KPIs móviles de estado más pequeños */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-amber-100 bg-amber-50/20 rounded-xl p-3 flex flex-col gap-1.5 transition-all hover:shadow-xs">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-xs">
              <Receipt size={14} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide truncate">Pendientes</p>
              <p className="text-[15px] sm:text-[18px] font-bold text-amber-700 mt-0.5 truncate">{pendientes}</p>
            </div>
          </div>
          <div className="bg-white border border-green-100 bg-green-50/20 rounded-xl p-3 flex flex-col gap-1.5 transition-all hover:shadow-xs">
            <div className="w-6 h-6 rounded-lg bg-green-100 text-green-600 flex items-center justify-center text-xs">
              <TrendingUp size={14} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide truncate">Completadas</p>
              <p className="text-[15px] sm:text-[18px] font-bold text-green-700 mt-0.5 truncate">{entregadas}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {/* Acceso rápido a Entregas Pendientes */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[13px] font-medium text-gray-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Entregas pendientes por realizar
              </span>
              <Link href="/authenticated/repartidor/ordenes" className="text-[12px] text-brand-600 hover:text-brand-800 flex items-center gap-1">
                Ver todas ({entregasPendientes.length}) <ArrowRight size={12} />
              </Link>
            </div>
            {isLoading ? (
              <div className="px-4 py-8 text-center text-[12px] text-gray-400">Cargando...</div>
            ) : entregasPendientes.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-[12px]">
                ✓ No tienes entregas pendientes por realizar hoy
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto scrollbar-thin">
                {entregasPendientes.map(orden => {
                  const totalPiezas = orden.items?.reduce((s, i) => s + i.cantidad, 0) ?? 0
                  return (
                    <div key={orden.id} className="p-3 sm:p-4 hover:bg-gray-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-gray-400">{orden.numero_orden}</span>
                          <span className="text-[12px] font-semibold text-gray-900 truncate">{orden.cliente_nombre ?? 'Cliente sin nombre'}</span>
                        </div>
                        {orden.direccion_entrega && (
                          <p className="text-[11.5px] text-gray-500 truncate max-w-md" title={orden.direccion_entrega}>
                            {orden.direccion_entrega}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400">
                          {totalPiezas} piezas · {formatCurrency(orden.subtotal)}
                        </p>
                      </div>
                      <Link
                        href="/authenticated/repartidor/ordenes"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-800 transition-colors self-start sm:self-center"
                      >
                        Cobrar / Ver
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Resumen de inventario móvil */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[13px] font-medium text-gray-900">Mi inventario móvil</span>
              <Link href="/authenticated/repartidor/inventario" className="text-[12px] text-brand-600 hover:text-brand-800 flex items-center gap-1">
                Gestionar <ArrowRight size={12} />
              </Link>
            </div>
            {isLoading ? (
              <div className="px-4 py-8 text-center text-[12px] text-gray-400">Cargando...</div>
            ) : inventarioMovil.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Package size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-[13px] text-gray-400">Sin piezas cargadas</p>
                <p className="text-[12px] text-gray-300 mt-1">Ve a Inventario para cargar mercancía</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-[13px] min-w-[400px]">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Artículo', 'Talla', 'Color', 'Piezas'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inventarioMovil.map(inv => (
                      <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800 truncate max-w-[160px]">{inv.articulo?.nombre ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{inv.articulo?.talla ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{inv.articulo?.color ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-50 text-brand-700">
                            {inv.cantidad} pza{inv.cantidad !== 1 ? 's' : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Acciones rápidas (sin conteo de piezas ni pedidos disponibles) */}
        <div className="flex flex-col gap-3">
          <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">Acciones rápidas</p>
          <QuickAction href="/authenticated/repartidor/ordenes"    icon={<ShoppingCart size={15} />} label="Mis entregas"   desc="Ver y cobrar pedidos" />
          <QuickAction href="/authenticated/repartidor/inventario" icon={<Package size={15} />}      label="Inventario"    desc="Cargar / descargar stock" />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { rolActivo } = useAuth()

  if (!rolActivo) {
    return (
      <div className="p-6 flex items-center gap-2 text-[13px] text-gray-400">
        <Users size={15} /> Cargando tu panel...
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      {rolActivo === 'admin'       && <DashboardAdmin />}
      {rolActivo === 'almacenista' && <DashboardAlmacenista />}
      {rolActivo === 'vendedor'    && <DashboardVendedor />}
      {rolActivo === 'repartidor'  && <DashboardRepartidor />}
    </div>
  )
}
