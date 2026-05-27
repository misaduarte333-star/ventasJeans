// src/app/authenticated/repartidor/ordenes/page.tsx
'use client'

import { useState } from 'react'
import {
  MapPin, User, ShoppingCart, Check, DollarSign, CreditCard,
  X, Loader2, Clock, Package, ChevronRight, Truck, RefreshCw,
  Phone, MessageCircle, ExternalLink
} from 'lucide-react'
import { useOrdenesRepartidor } from '@/hooks/useOrdenesRepartidor'
import { formatCurrency, formatDateTime } from '@/lib/formatting'
import { cn } from '@/lib/utils'
import type { OrdenVenta, TipoPago } from '@/types'

// ─── Badge de estado ──────────────────────────────────────────
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
      {estado.charAt(0) + estado.slice(1).toLowerCase()}
    </span>
  )
}

// ─── Parser de Dirección y Contacto ───────────────────────────
function parseDireccion(dirStr: string) {
  if (!dirStr) return { address: '', phone: '', envio: '', horario: '', extras: [] }
  
  const phoneMatch = dirStr.match(/Tel:\s*([\d\s+-]+)/i)
  const phone = phoneMatch ? phoneMatch[1].replace(/[^\d+]/g, '') : ''
  
  const envioMatch = dirStr.match(/Envío:\s*([^)]+)/i)
  const envio = envioMatch ? envioMatch[1].trim() : ''

  const horarioMatch = dirStr.match(/(?:Hora|Horario|Rango):\s*([^)]+)/i)
  const horario = horarioMatch ? horarioMatch[1].trim() : ''
  
  const parentheses = [...dirStr.matchAll(/\(([^)]+)\)/g)].map(m => m[1])
  const extras = parentheses.filter(p => 
    !p.toLowerCase().startsWith('tel:') && 
    !p.toLowerCase().startsWith('envío:') &&
    !p.toLowerCase().startsWith('hora:') &&
    !p.toLowerCase().startsWith('horario:') &&
    !p.toLowerCase().startsWith('rango:')
  )
  
  const address = dirStr.replace(/\([^)]+\)/g, '').trim()
  
  return { address, phone, envio, horario, extras }
}

// ─── Tarjeta de Orden ─────────────────────────────────────────
const OrdenCard = ({
  orden,
  onCobrar,
  onAsignar,
  showAsignar = false,
}: {
  orden: OrdenVenta
  onCobrar?: (o: OrdenVenta) => void
  onAsignar?: (o: OrdenVenta) => void
  showAsignar?: boolean
}) => {
  const totalPiezas = orden.items?.reduce((s, i) => s + i.cantidad, 0) ?? 0
  const { address, phone, envio, horario, extras } = parseDireccion(orden.direccion_entrega || '')

  const cleanMapAddress = address ? address.trim() : ''
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanMapAddress)}`

  const getWhatsAppLink = (phoneNumber: string) => {
    const cleanNum = phoneNumber.replace(/\D/g, '')
    if (cleanNum.length === 10) {
      return `https://wa.me/52${cleanNum}`
    }
    return `https://wa.me/${cleanNum}`
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-sm transition-all flex flex-col gap-3.5 p-4">
      {/* Header / Folio & Badge */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-gray-400 font-medium">Folio: {orden.numero_orden}</span>
        <EstadoBadge estado={orden.estado} />
      </div>

      {/* Info list - Exact requested order */}
      <div className="space-y-3">
        {/* 1. Nombre del cliente o persona a recoger */}
        {orden.cliente_nombre && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <User size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cliente / Persona a recoger</p>
              <p className="text-[13px] font-semibold text-gray-800 truncate">{orden.cliente_nombre}</p>
            </div>
          </div>
        )}

        {/* 2. Dirección con acceso a Google Maps */}
        {orden.direccion_entrega && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Dirección de Entrega</p>
              <p className="text-[12.5px] text-gray-700 leading-snug">{cleanMapAddress || 'No especificada'}</p>
              {cleanMapAddress && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                >
                  <ExternalLink size={11} />
                  Ver en Google Maps
                </a>
              )}
            </div>
          </div>
        )}

        {/* 3. Número de celular con acceso rápido a llamadas y WhatsApp */}
        {phone && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Phone size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Contacto Celular</p>
              <p className="text-[12.5px] text-gray-700 font-medium">{phone}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  <Phone size={10} />
                  Llamar
                </a>
                <a
                  href={getWhatsAppLink(phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-green-50 hover:bg-green-100 text-green-700 transition-colors"
                >
                  <MessageCircle size={10} />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 4. Hora o rango de horario de entrega */}
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock size={13} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Horario de Entrega</p>
            <p className="text-[12.5px] text-gray-700">
              {horario || `Hoy (Creado: ${formatDateTime(orden.created_at)})`}
            </p>
          </div>
        </div>

        {/* 5. Piezas o productos solicitados */}
        {orden.items && orden.items.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Package size={13} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Productos ({totalPiezas} piezas)
              </p>
              <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-2.5 space-y-1.5">
                {orden.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-[12px]">
                    <span className="text-gray-700 font-medium truncate max-w-[200px]">
                      {item.articulo?.nombre ?? 'Artículo'} — T{item.articulo?.talla}
                    </span>
                    <span className="text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-[10.5px]">
                      ×{item.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. Detalles o especificaciones */}
        {(envio || extras.length > 0) && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock size={12} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Detalles / Especificaciones</p>
              <div className="text-[12px] text-gray-600 mt-0.5 leading-relaxed space-y-1">
                {envio && <p>📦 Costo de envío: <span className="font-semibold">{envio}</span></p>}
                {extras.map((ex, i) => (
                  <p key={i}>📝 {ex}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. Subtotal de la venta con el envío */}
      <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Monto total (con envío)</p>
          <span className="text-[16px] font-extrabold text-gray-900">{formatCurrency(orden.subtotal)}</span>
        </div>

        {/* Actions buttons */}
        <div className="flex gap-2">
          {showAsignar && onAsignar && (
            <button
              onClick={() => onAsignar(orden)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-xs"
            >
              <Truck size={12} />
              Asignarme
            </button>
          )}
          {!showAsignar && orden.estado === 'PENDIENTE' && onCobrar && (
            <button
              onClick={() => onCobrar(orden)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-xs"
            >
              <DollarSign size={12} />
              Cobrar
            </button>
          )}
          {orden.estado === 'PAGADO' && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
              <Check size={12} />
              Cobrado · {orden.paid_at ? formatDateTime(orden.paid_at) : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal de Cobro ───────────────────────────────────────────
const ModalCobro = ({
  orden,
  onClose,
  onConfirmar,
}: {
  orden: OrdenVenta
  onClose: () => void
  onConfirmar: (tipoPago: TipoPago, monto: number, extra: { monto_recibido?: number; cambio?: number; referencia_banco?: string }) => Promise<void>
}) => {
  const [tipoPago, setTipoPago] = useState<TipoPago>('EFECTIVO')
  const [montoRecibido, setMontoRecibido] = useState(String(orden.subtotal))
  const [referenciaBanco, setReferenciaBanco] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [error, setError] = useState('')

  const totalACobrar = orden.subtotal
  const recibidoNum  = parseFloat(montoRecibido) || 0
  const cambio       = recibidoNum >= totalACobrar ? recibidoNum - totalACobrar : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (tipoPago === 'EFECTIVO' && recibidoNum < totalACobrar) {
      setError('El monto recibido no puede ser menor al total.')
      return
    }
    if (tipoPago === 'TRANSFERENCIA' && !referenciaBanco.trim()) {
      setError('La referencia bancaria es obligatoria.')
      return
    }
    setCobrando(true)
    setError('')
    try {
      const extra = tipoPago === 'EFECTIVO'
        ? { monto_recibido: recibidoNum, cambio }
        : { referencia_banco: referenciaBanco.trim() }
      await onConfirmar(tipoPago, totalACobrar, extra)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el pago.')
    } finally {
      setCobrando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Registrar cobro</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">{orden.numero_orden} · {orden.cliente_nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Total */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-[13px] text-gray-500">Total a cobrar</span>
            <span className="text-[20px] font-bold text-gray-900">{formatCurrency(totalACobrar)}</span>
          </div>

          {/* Tipo de pago */}
          <div>
            <p className="text-[12px] font-medium text-gray-500 mb-2">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {(['EFECTIVO', 'TRANSFERENCIA'] as TipoPago[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoPago(t)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium border transition-all',
                    tipoPago === t
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  )}
                >
                  {t === 'EFECTIVO' ? <DollarSign size={14} /> : <CreditCard size={14} />}
                  {t === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'}
                </button>
              ))}
            </div>
          </div>

          {/* Campos según tipo */}
          {tipoPago === 'EFECTIVO' && (
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-medium text-gray-500 block mb-1">Monto recibido</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={montoRecibido}
                  onChange={e => setMontoRecibido(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              {recibidoNum >= totalACobrar && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex justify-between text-[13px]">
                  <span className="text-green-700">Cambio a devolver</span>
                  <span className="font-semibold text-green-700">{formatCurrency(cambio)}</span>
                </div>
              )}
            </div>
          )}

          {tipoPago === 'TRANSFERENCIA' && (
            <div>
              <label className="text-[12px] font-medium text-gray-500 block mb-1">Referencia bancaria</label>
              <input
                type="text"
                placeholder="Folio / número de operación"
                value={referenciaBanco}
                onChange={e => setReferenciaBanco(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cobrando}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {cobrando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {cobrando ? 'Procesando...' : 'Confirmar cobro'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function OrdenesRepartidorPage() {
  const { misEntregas, disponibles, isLoading, asignarOrden, confirmarEntregaYPago, refresh } = useOrdenesRepartidor()
  const [tab, setTab] = useState<'mis' | 'disponibles'>('mis')
  const [ordenCobrar, setOrdenCobrar] = useState<OrdenVenta | null>(null)
  const [asignando, setAsignando] = useState<string | null>(null)

  const handleAsignar = async (orden: OrdenVenta) => {
    setAsignando(orden.id)
    try {
      await asignarOrden(orden.id)
    } catch (err: any) {
      alert(err?.message || 'Error al asignar la orden')
    } finally {
      setAsignando(null)
    }
  }

  const pendientesMias   = misEntregas.filter(o => o.estado === 'PENDIENTE').length
  const entregadasMias   = misEntregas.filter(o => o.estado === 'PAGADO').length

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">Órdenes del Día</h1>
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

      {/* KPIs rápidos (Solo Pendientes y Entregadas) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-amber-100 bg-amber-50/30 rounded-xl px-3 py-3 text-center">
          <p className="text-[20px] font-bold text-amber-600">{pendientesMias}</p>
          <p className="text-[11px] text-amber-500 mt-0.5">Pendientes</p>
        </div>
        <div className="bg-white border border-green-100 bg-green-50/30 rounded-xl px-3 py-3 text-center">
          <p className="text-[20px] font-bold text-green-600">{entregadasMias}</p>
          <p className="text-[11px] text-green-500 mt-0.5">Entregadas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab('mis')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all',
            tab === 'mis' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Truck size={13} />
          Mis Entregas
          {pendientesMias > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {pendientesMias}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('disponibles')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all',
            tab === 'disponibles' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <ShoppingCart size={13} />
          Disponibles
          {disponibles.length > 0 && (
            <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {disponibles.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido por tab */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : tab === 'mis' ? (
        <div className="space-y-3">
          {misEntregas.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center">
              <Truck size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-[14px] font-medium text-gray-500">Sin entregas asignadas</p>
              <p className="text-[12px] text-gray-400 mt-1">
                Ve a la pestaña &quot;Disponibles&quot; para asignarte pedidos
              </p>
            </div>
          ) : (
            misEntregas.map(orden => (
              <OrdenCard
                key={orden.id}
                orden={orden}
                onCobrar={setOrdenCobrar}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {disponibles.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center">
              <ShoppingCart size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-[14px] font-medium text-gray-500">Sin pedidos disponibles</p>
              <p className="text-[12px] text-gray-400 mt-1">No hay pedidos pendientes sin repartidor asignado</p>
            </div>
          ) : (
            disponibles.map(orden => (
              <div key={orden.id} className={cn('transition-opacity', asignando === orden.id && 'opacity-50 pointer-events-none')}>
                <OrdenCard
                  orden={orden}
                  onAsignar={handleAsignar}
                  showAsignar
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de Cobro */}
      {ordenCobrar && (
        <ModalCobro
          orden={ordenCobrar}
          onClose={() => setOrdenCobrar(null)}
          onConfirmar={async (tipoPago, monto, extra) => {
            await confirmarEntregaYPago(ordenCobrar.id, tipoPago, monto, extra)
          }}
        />
      )}
    </div>
  )
}
