// src/app/authenticated/admin/venta/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart, Search, Plus, Minus, Trash2, ArrowLeft,
  Loader2, CheckCircle2, AlertCircle, User, Users,
} from 'lucide-react'
import Link from 'next/link'
import { useInventario } from '@/hooks/useInventario'
import { ordenesService } from '@/services/ordenes'
import { adminService, AdminUser } from '@/services/admin'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/formatting'
import { cn } from '@/lib/utils'

interface CartItem {
  articulo_id: string
  nombre: string
  modelo: string
  talla: string
  color: string
  precio_unitario: number
  cantidad: number
  stockMax: number
}

export default function AdminNuevaVentaPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { articulos, loadingArticulos } = useInventario()

  const [vendedores, setVendedores]           = useState<AdminUser[]>([])
  const [vendedorId, setVendedorId]           = useState<string>('')
  const [loadingVendedores, setLoadingVendedores] = useState(true)

  const [clienteNombre, setClienteNombre]     = useState('')
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [busqueda, setBusqueda]               = useState('')
  const [carrito, setCarrito]                 = useState<CartItem[]>([])
  const [error, setError]                     = useState('')
  const [submitting, setSubmitting]           = useState(false)
  const [success, setSuccess]                 = useState('')

  useEffect(() => {
    adminService.getUsers()
      .then((users) => {
        const vends = users.filter((u) => u.roles.includes('vendedor') || u.roles.includes('admin'))
        setVendedores(vends)
        if (user) {
          const self = vends.find((v) => v.id === user.id)
          setVendedorId(self?.id ?? vends[0]?.id ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingVendedores(false))
  }, [user])

  const articulosFiltrados = (articulos ?? []).filter((a) => {
    if ((a.inventario?.cantidad_disponible ?? 0) <= 0) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      a.nombre.toLowerCase().includes(q) ||
      a.modelo.toLowerCase().includes(q) ||
      a.talla.toLowerCase().includes(q) ||
      a.color.toLowerCase().includes(q)
    )
  })

  const addToCart = useCallback((a: typeof articulosFiltrados[0]) => {
    const stockMax = a.inventario?.cantidad_disponible ?? 0
    setCarrito((prev) => {
      const existing = prev.find((c) => c.articulo_id === a.id)
      if (existing) {
        if (existing.cantidad >= stockMax) return prev
        return prev.map((c) => c.articulo_id === a.id ? { ...c, cantidad: c.cantidad + 1 } : c)
      }
      return [...prev, { articulo_id: a.id, nombre: a.nombre, modelo: a.modelo, talla: a.talla, color: a.color, precio_unitario: a.precio_venta, cantidad: 1, stockMax }]
    })
  }, [])

  const removeFromCart = useCallback((id: string) => setCarrito((prev) => prev.filter((c) => c.articulo_id !== id)), [])

  const changeQty = useCallback((id: string, delta: number) => {
    setCarrito((prev) => prev.map((c) => {
      if (c.articulo_id !== id) return c
      const nq = c.cantidad + delta
      if (nq < 1 || nq > c.stockMax) return c
      return { ...c, cantidad: nq }
    }))
  }, [])

  const total = carrito.reduce((s, c) => s + c.cantidad * c.precio_unitario, 0)

  const handleSubmit = async () => {
    if (!vendedorId)          { setError('Selecciona un vendedor'); return }
    if (carrito.length === 0) { setError('El carrito está vacío'); return }
    if (!clienteNombre.trim()) { setError('Ingresa el nombre del cliente'); return }
    setError('')
    setSubmitting(true)
    try {
      await ordenesService.crearOrden(
        vendedorId,
        clienteNombre.trim(),
        direccionEntrega.trim(),
        carrito.map((c) => ({ articulo_id: c.articulo_id, cantidad: c.cantidad, precio_unitario: c.precio_unitario }))
      )
      setSuccess('Orden creada correctamente')
      setTimeout(() => router.push('/authenticated/admin/entregas'), 1800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear la orden')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/authenticated/admin/entregas"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">Nueva Venta (Admin)</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Crea una orden en nombre de cualquier vendedor</p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-[13px] px-4 py-3 rounded-xl">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-xl">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* LEFT: Configuración + Catálogo */}
        <div className="lg:col-span-2 space-y-4">

          {/* Vendedor */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users size={13} /> Vendedor asignado
            </p>
            {loadingVendedores ? (
              <Loader2 size={16} className="animate-spin text-brand-400" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {vendedores.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVendedorId(v.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-all',
                      vendedorId === v.id
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                    )}
                  >
                    <User size={12} /> {v.nombre || v.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Datos cliente */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos del cliente</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-gray-500 block mb-1">Nombre del cliente *</label>
                <input
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-500 block mb-1">Dirección de entrega</label>
                <input
                  value={direccionEntrega}
                  onChange={(e) => setDireccionEntrega(e.target.value)}
                  placeholder="Ej. Calle 5 #23, Col. Centro"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
          </div>

          {/* Catálogo */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Catálogo de productos</p>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Buscar por modelo, talla, color..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {loadingArticulos ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={22} className="animate-spin text-brand-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
                {articulosFiltrados.map((a) => {
                  const inCart = carrito.find((c) => c.articulo_id === a.id)
                  const stock  = a.inventario?.cantidad_disponible ?? 0
                  const full   = !!inCart && inCart.cantidad >= stock
                  return (
                    <button
                      key={a.id}
                      onClick={() => addToCart(a)}
                      disabled={full}
                      className={cn(
                        'text-left p-3 rounded-xl border transition-all',
                        inCart
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-100 hover:border-brand-300 hover:shadow-sm',
                        full && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {inCart && (
                        <span className="inline-flex items-center justify-center bg-green-600 text-white text-[10px] font-bold w-5 h-5 rounded-full float-right">
                          {inCart.cantidad}
                        </span>
                      )}
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{a.modelo}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">T:{a.talla} · {a.color}</p>
                      <p className="text-[13px] font-bold text-green-600 mt-1">{formatCurrency(a.precio_venta)}</p>
                      <p className={cn('text-[10.5px] mt-0.5', stock <= 3 ? 'text-red-500' : 'text-gray-400')}>
                        Stock: {stock}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Carrito */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <ShoppingCart size={13} /> Carrito ({carrito.length})
          </p>

          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <ShoppingCart size={28} />
              <p className="text-[12px] text-gray-400 mt-2">Agrega productos del catálogo</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {carrito.map((item) => (
                  <div key={item.articulo_id} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800">{item.modelo}</p>
                        <p className="text-[11px] text-gray-400">T:{item.talla} · {item.color}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.articulo_id)} className="text-red-400 hover:text-red-600 p-0.5">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeQty(item.articulo_id, -1)}
                          className="w-6 h-6 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-[13px] font-bold text-gray-800 min-w-[1.2rem] text-center">{item.cantidad}</span>
                        <button
                          onClick={() => changeQty(item.articulo_id, 1)}
                          disabled={item.cantidad >= item.stockMax}
                          className="w-6 h-6 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <span className="text-[13px] font-bold text-green-600">
                        {formatCurrency(item.cantidad * item.precio_unitario)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-[13px] text-gray-500">Total</span>
                <span className="text-[18px] font-extrabold text-gray-900">{formatCurrency(total)}</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {submitting ? 'Creando orden...' : 'Crear orden'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
