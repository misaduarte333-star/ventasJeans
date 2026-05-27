// src/app/authenticated/vendedor/ordenes/nueva/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Search, Plus, Minus, Trash2, ArrowLeft, Loader2, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react'
import { useInventario } from '@/hooks/useInventario'
import { useOrdenes } from '@/hooks/useOrdenes'
import { formatCurrency } from '@/lib/formatting'
import Link from 'next/link'

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

export default function NuevaOrdenPage() {
  const router = useRouter()
  const { articulos, loadingArticulos } = useInventario()
  const { crearOrden } = useOrdenes()

  // Search & Filter
  const [busqueda, setBusqueda] = useState('')

  // Form Client
  const [clienteNombre, setClienteNombre] = useState('')
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [telefono, setTelefono] = useState('')
  const [horario, setHorario] = useState('')
  const [costoEnvio, setCostoEnvio] = useState('')
  const [especificaciones, setEspecificaciones] = useState('')

  // WhatsApp Parser
  const [textoMensaje, setTextoMensaje] = useState('')
  const [isParserOpen, setIsParserOpen] = useState(true)
  const [feedbackMensaje, setFeedbackMensaje] = useState<{
    type: 'success' | 'warning' | 'error'
    text: string
    addedItems?: { nombre: string; talla: string; color: string; cantidad: number }[]
    warnings?: string[]
  } | null>(null)

  // Cart
  const [carrito, setCarrito] = useState<CartItem[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const parseWhatsAppMessage = () => {
    if (!textoMensaje.trim()) {
      setFeedbackMensaje({
        type: 'error',
        text: 'Por favor, ingresa el texto del mensaje para procesar.',
      })
      return
    }

    if (!articulos || articulos.length === 0) {
      setFeedbackMensaje({
        type: 'error',
        text: 'El catálogo de productos aún se está cargando. Por favor, espera.',
      })
      return
    }

    const lines = textoMensaje.split('\n')
    let cliente = ''
    let productosText = ''
    let direccion = ''
    let tel = ''
    let subtotalEnvio = ''
    let hor = ''
    let esp = ''

    lines.forEach((rawLine) => {
      const lineClean = rawLine.trim()
      if (!lineClean) return

      // Intentar clasificar usando sufijos explícitos comunes (con o sin guion)
      const clientMatch = lineClean.match(/^(?:@)?(.*?)\s*-\s*Nombre/i)
      const productsMatch = lineClean.match(/^(.*?)\s*-\s*Producto/i)
      const addressMatch = lineClean.match(/^(.*?)\s*-\s*Direcci/i)
      const phoneMatch = lineClean.match(/^(.*?)\s*-\s*(N[úu]mero|Contacto|Tel)/i)
      const priceMatch = lineClean.match(/^(.*?)\s*-\s*Subtotal/i)

      if (clientMatch) { cliente = clientMatch[1].replace(/^@/, '').trim(); return }
      if (productsMatch) { productosText = productsMatch[1].trim(); return }
      if (addressMatch) { direccion = addressMatch[1].trim(); return }
      if (phoneMatch) { tel = phoneMatch[1].trim(); return }
      if (priceMatch) { subtotalEnvio = priceMatch[1].trim(); return }

      // Clasificación heurística (fallback si no tiene etiquetas explícitas)
      if (lineClean.startsWith('@')) {
        cliente = lineClean.replace(/^@/, '').split('-')[0].trim()
      } else if (/\b(talla|color|pantalon|pantalón|recto|skinny|slim|corte)\b/i.test(lineClean)) {
        productosText = lineClean.split('-')[0].trim()
      } else if (/^\d{7,15}$/.test(lineClean.replace(/\D/g, ''))) {
        tel = lineClean.split('-')[0].trim()
      } else if (/\b(envio|envío|subtotal|\$|\+)\b/i.test(lineClean)) {
        subtotalEnvio = lineClean.split('-')[0].trim()
      } else if (/\b(antes|despues|después|am|pm|hora|horario)\b/i.test(lineClean) && lineClean.length < 30) {
        hor = lineClean.split('-')[0].trim()
      } else if (/\b(especificacion|especificaciones|detalle|detalles|nota|notas)\b/i.test(lineClean)) {
        esp = lineClean.split('-')[0].trim()
      } else {
        const possibleAddress = lineClean.split('-')[0].trim()
        if (possibleAddress) {
          if (!direccion) direccion = possibleAddress
          else direccion += ' ' + possibleAddress
        }
      }
    })

    if (cliente) setClienteNombre(cliente)
    if (tel) setTelefono(tel)
    if (hor) setHorario(hor)
    if (esp) setEspecificaciones(esp)
    if (direccion) setDireccionEntrega(direccion)

    // Extracción de envío
    let costoEnv = ''
    if (subtotalEnvio) {
      const parts = subtotalEnvio.split('+')
      if (parts.length > 1) {
        costoEnv = parts[1].trim()
      } else {
        const envioRegex = /(?:env[íi]o|de env[íi]o|envio)\s*(?:de\s*)?\$?\s*(\d+)/i
        const match = subtotalEnvio.match(envioRegex)
        if (match) {
          costoEnv = `${match[1]}$ envío`
        } else if (subtotalEnvio.toLowerCase().includes('env')) {
          costoEnv = subtotalEnvio
        }
      }
    }
    if (costoEnv) setCostoEnvio(costoEnv)

    // Procesamiento de productos en el catálogo
    const warnings: string[] = []
    const addedItems: { nombre: string; talla: string; color: string; cantidad: number }[] = []
    const newCartItems: CartItem[] = []

    if (productosText) {
      // Obtener términos únicos de catálogo
      const uniqueModels = Array.from(new Set(articulos.map(a => a.modelo?.toLowerCase()).filter(Boolean)))
      const uniqueColors = Array.from(new Set(articulos.map(a => a.color?.toLowerCase()).filter(Boolean)))
      const uniqueTallas = Array.from(new Set(articulos.map(a => a.talla?.toLowerCase()).filter(Boolean)))

      const prodTextLower = productosText.toLowerCase()

      const matchedModels = uniqueModels.filter(m => prodTextLower.includes(m!))
      const matchedColors = uniqueColors.filter(c => prodTextLower.includes(c!))
      
      let matchedTallas = uniqueTallas.filter(t => {
        const regex = new RegExp(`\\b${t}\\b`, 'i')
        return regex.test(prodTextLower)
      })

      // Intentar extraer talla específica si no se encontró con word boundaries
      const explTallaMatch = prodTextLower.match(/talla\s*([a-z0-9]+)/i)
      if (explTallaMatch && explTallaMatch[1]) {
        const extractedTalla = explTallaMatch[1]
        if (!matchedTallas.includes(extractedTalla)) {
          matchedTallas = [extractedTalla]
        }
      }

      if (matchedTallas.length === 0) {
        warnings.push(`No se detectó ninguna talla específica en: "${productosText}".`)
      }

      // Buscar artículos que coincidan
      const candidatos = articulos.filter(art => {
        const modelMatch = matchedModels.length === 0 || 
          matchedModels.includes(art.modelo?.toLowerCase() || '') ||
          matchedModels.some(m => art.nombre.toLowerCase().includes(m))
        const colorMatch = matchedColors.length === 0 || 
          (art.color && matchedColors.includes(art.color.toLowerCase()))
        const tallaMatch = matchedTallas.length === 0 || 
          (art.talla && matchedTallas.includes(art.talla.toLowerCase()))
        return modelMatch && colorMatch && tallaMatch
      })

      if (candidatos.length === 0) {
        warnings.push(`No se encontraron artículos que coincidan con los filtros (Modelos: ${matchedModels.join(', ') || 'cualquiera'}, Colores: ${matchedColors.join(', ') || 'cualquiera'}, Tallas: ${matchedTallas.join(', ') || 'ninguna'}).`)
      } else {
        candidatos.forEach(art => {
          const stock = art.inventario?.cantidad_disponible ?? 0
          if (stock <= 0) {
            warnings.push(`El artículo "${art.nombre} Talla ${art.talla} (${art.color})" no tiene stock disponible.`)
          } else {
            newCartItems.push({
              articulo_id: art.id,
              nombre: art.nombre,
              modelo: art.modelo || '',
              talla: art.talla,
              color: art.color,
              precio_unitario: art.precio_venta,
              cantidad: 1,
              stockMax: stock,
            })
            addedItems.push({
              nombre: art.nombre,
              talla: art.talla,
              color: art.color,
              cantidad: 1,
            })
          }
        })
      }
    } else {
      warnings.push('No se detectó la línea de productos o estaba vacía.')
    }

    if (newCartItems.length > 0) {
      setCarrito(newCartItems)
    }

    if (warnings.length > 0) {
      setFeedbackMensaje({
        type: 'warning',
        text: newCartItems.length > 0 
          ? 'Mensaje procesado parcialmente.' 
          : 'No se pudieron agregar productos al carrito.',
        addedItems,
        warnings,
      })
    } else {
      setFeedbackMensaje({
        type: 'success',
        text: '¡Mensaje procesado y orden autocompletada con éxito!',
        addedItems,
      })
    }
  }

  // Filter articles with stock > 0
  const articulosDisponibles = (articulos ?? []).filter((art) => {
    const stock = art.inventario?.cantidad_disponible ?? 0
    if (stock <= 0) return false

    const term = busqueda.toLowerCase()
    return (
      art.nombre.toLowerCase().includes(term) ||
      (art.modelo || '').toLowerCase().includes(term) ||
      art.sku.toLowerCase().includes(term) ||
      art.talla.toLowerCase().includes(term) ||
      art.color.toLowerCase().includes(term)
    )
  })

  const agregarAlCarrito = (art: typeof articulos[0]) => {
    const stock = art.inventario?.cantidad_disponible ?? 0
    if (stock <= 0) return

    setCarrito((prev) => {
      const exist = prev.find((item) => item.articulo_id === art.id)
      if (exist) {
        if (exist.cantidad >= stock) return prev // Can't add more than stock
        return prev.map((item) =>
          item.articulo_id === art.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      }
      return [
        ...prev,
        {
          articulo_id: art.id,
          nombre: art.nombre,
          modelo: art.modelo || '',
          talla: art.talla,
          color: art.color,
          precio_unitario: art.precio_venta,
          cantidad: 1,
          stockMax: stock,
        },
      ]
    })
  }

  const actualizarCantidad = (articulo_id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.articulo_id === articulo_id) {
            const nuevaCant = item.cantidad + delta
            if (nuevaCant <= 0) return null
            if (nuevaCant > item.stockMax) return item // No excede stock
            return { ...item, cantidad: nuevaCant }
          }
          return item
        })
        .filter((item): item is CartItem => item !== null)
    )
  }

  const eliminarDelCarrito = (articulo_id: string) => {
    setCarrito((prev) => prev.filter((item) => item.articulo_id !== articulo_id))
  }

  const totalOrden = carrito.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  const handleCrearOrden = async (e: React.FormEvent) => {
    e.preventDefault()
    if (carrito.length === 0) {
      setError('El carrito está vacío.')
      return
    }
    if (!clienteNombre.trim()) {
      setError('El nombre del cliente es obligatorio.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const items = carrito.map((item) => ({
        articulo_id: item.articulo_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
      }))

      // Re-ensamblamos la dirección con el formato que el repartidor parsea
      const extraDetails: string[] = []
      if (telefono) extraDetails.push(`Tel: ${telefono}`)
      if (costoEnvio) extraDetails.push(`Envío: ${costoEnvio}`)
      if (horario) extraDetails.push(`Hora: ${horario}`)
      if (especificaciones) extraDetails.push(especificaciones)

      let finalDireccion = direccionEntrega.trim()
      if (extraDetails.length > 0) {
        finalDireccion += ` (${extraDetails.join(') (')})`
      }

      await crearOrden(clienteNombre.trim(), finalDireccion.trim(), items)
      router.push('/authenticated/vendedor/ordenes')
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la orden de venta.')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/authenticated/vendedor/ordenes"
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">Nueva orden de venta</h1>
            <p className="text-[13px] text-gray-500">Agrega productos al carrito y genera la venta</p>
          </div>
        </div>
      </div>

      {/* Panel de Autocompletar desde WhatsApp */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsParserOpen(!isParserOpen)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-brand-50/50 to-indigo-50/20 hover:from-brand-50 hover:to-indigo-50/40 transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <div className="bg-brand-100/50 p-1.5 rounded-lg text-brand-800">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900 flex items-center gap-1.5">
                Autocompletar desde Mensaje (WhatsApp)
              </h2>
              <p className="text-[11px] text-gray-500">Pega el texto del pedido para llenar el formulario automáticamente</p>
            </div>
          </div>
          <span className="text-xs text-brand-600 font-medium">
            {isParserOpen ? 'Ocultar panel' : 'Mostrar panel'}
          </span>
        </button>

        {isParserOpen && (
          <div className="p-4 border-t border-gray-50 flex flex-col gap-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Pegar Mensaje Completo
                </label>
                <textarea
                  placeholder={`Ejemplo:\n@Marcela Vega - Nombre del cliente\nPantalon Recto Talla 34 y 36 color negro. - Producto o productos.\nHuachinera 435. Jacinto Lopez. -Dirección de domicilio.\n6341064269 - Numero de contacto\n450$ + 50$ envío -Subtotal de venta.`}
                  rows={6}
                  value={textoMensaje}
                  onChange={(e) => setTextoMensaje(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400 font-mono resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTextoMensaje(
                        `@Marcela Vega   - Nombre del cliente\nPantalon Recto Talla 34 y 36 color negro.  - Producto o productos.  \nHuachinera 435. Jacinto Lopez.   -Dirección de domicilio. \n6341064269    - Numero de contacto \n450$ + 50$ envío    -Subtotal de venta.`
                      )
                    }}
                    className="text-[11px] text-brand-600 hover:underline transition-all"
                  >
                    Cargar ejemplo de prueba
                  </button>
                  <button
                    type="button"
                    onClick={parseWhatsAppMessage}
                    className="flex items-center gap-1 text-[12px] font-semibold bg-brand-600 hover:bg-brand-700 text-white py-1.5 px-4 rounded-lg transition-colors shadow-sm"
                  >
                    Procesar Mensaje
                  </button>
                </div>
              </div>

              <div className="border border-dashed border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col justify-center min-h-[140px]">
                {feedbackMensaje ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      {feedbackMensaje.type === 'success' && (
                        <>
                          <CheckCircle className="text-green-500 shrink-0" size={16} />
                          <span className="text-[13px] font-bold text-green-700">{feedbackMensaje.text}</span>
                        </>
                      )}
                      {feedbackMensaje.type === 'warning' && (
                        <>
                          <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                          <span className="text-[13px] font-bold text-amber-700">{feedbackMensaje.text}</span>
                        </>
                      )}
                      {feedbackMensaje.type === 'error' && (
                        <>
                          <AlertTriangle className="text-red-500 shrink-0" size={16} />
                          <span className="text-[13px] font-bold text-red-700">{feedbackMensaje.text}</span>
                        </>
                      )}
                    </div>

                    {/* Added items list */}
                    {feedbackMensaje.addedItems && feedbackMensaje.addedItems.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase">Productos Agregados:</p>
                        <ul className="text-[11px] list-disc list-inside text-gray-700 space-y-0.5 mt-1">
                          {feedbackMensaje.addedItems.map((item, idx) => (
                            <li key={idx}>
                              {item.nombre} - Talla {item.talla} ({item.color}) x{item.cantidad}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Warnings list */}
                    {feedbackMensaje.warnings && feedbackMensaje.warnings.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[11px] font-semibold text-amber-600 uppercase">Advertencias / Faltantes:</p>
                        <ul className="text-[11px] list-disc list-inside text-amber-700 space-y-0.5 mt-1 border-t border-amber-100 pt-1">
                          {feedbackMensaje.warnings.map((warn, idx) => (
                            <li key={idx} className="leading-tight">{warn}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 flex flex-col items-center gap-1">
                    <Sparkles size={20} className="text-gray-300" />
                    <p className="text-[12px] font-medium text-gray-700">Esperando mensaje para procesar</p>
                    <p className="text-[10px] max-w-[280px]">El sistema completará los campos del cliente, la dirección (con teléfono/envío) y el carrito automáticamente al procesar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector de Articulos */}
        <div className="lg:col-span-2 flex flex-col gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Catálogo de Productos</h2>
          
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Buscar por modelo, talla, color..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:bg-white transition-all"
            />
          </div>

          {loadingArticulos ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-brand-600" size={24} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {articulosDisponibles.map((art) => {
                const stock = art.inventario?.cantidad_disponible ?? 0
                const exist = carrito.find((i) => i.articulo_id === art.id)
                const cantEnCart = exist ? exist.cantidad : 0
                const stockRestante = stock - cantEnCart

                return (
                  <div
                    key={art.id}
                    className="border border-gray-100 rounded-xl p-3 bg-gray-50 hover:bg-white hover:border-brand-100 hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[13px] font-semibold text-gray-900 truncate">
                          {art.nombre}
                        </span>
                        <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                          Talla {art.talla}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Modelo: {art.modelo || '-'} | Color: {art.color}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono mt-1 uppercase">SKU: {art.sku}</p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <span className="text-[14px] font-bold text-gray-900">
                          {formatCurrency(art.precio_venta)}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {stockRestante > 0 ? `${stockRestante} disponibles` : 'Sin stock disponible'}
                        </p>
                      </div>

                      <button
                        onClick={() => agregarAlCarrito(art)}
                        disabled={stockRestante <= 0}
                        className="flex items-center gap-1 text-[11px] font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:bg-gray-200 disabled:text-gray-400 py-1.5 px-2.5 rounded-lg transition-colors shadow-sm"
                      >
                        <Plus size={12} /> Agregar
                      </button>
                    </div>
                  </div>
                )
              })}

              {articulosDisponibles.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-400 text-[13px]">
                  No se encontraron productos con stock disponible
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumen del Carrito y Formulario Cliente */}
        <div className="flex flex-col gap-4">
          <form
            onSubmit={handleCrearOrden}
            className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center gap-1.5 border-b border-gray-100 pb-3">
              <ShoppingCart size={16} className="text-gray-400" />
              <h2 className="text-[15px] font-semibold text-gray-900">Resumen del Carrito</h2>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-2.5 text-[12px] font-medium">
                {error}
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {carrito.map((item) => (
                <div
                  key={item.articulo_id}
                  className="flex items-center justify-between border-b border-gray-50 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0"
                >
                  <div className="max-w-[60%]">
                    <p className="text-[12px] font-semibold text-gray-800 truncate">{item.nombre}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      Talla {item.talla} | Color {item.color}
                    </p>
                    <p className="text-[11px] font-bold text-gray-700 mt-0.5">
                      {formatCurrency(item.precio_unitario * item.cantidad)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => actualizarCantidad(item.articulo_id, -1)}
                      className="p-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-500"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-[12px] font-semibold text-gray-800 px-1.5 min-w-[20px] text-center">
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => actualizarCantidad(item.articulo_id, 1)}
                      className="p-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-500"
                    >
                      <Plus size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarDelCarrito(item.articulo_id)}
                      className="p-1 rounded text-red-500 hover:bg-red-50 ml-1.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {carrito.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-[12px]">
                  El carrito está vacío. Agrega productos.
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-[13px] font-medium text-gray-500">Total Venta:</span>
              <span className="text-[18px] font-bold text-gray-900">{formatCurrency(totalOrden)}</span>
            </div>

            {/* Client Info inputs */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Dirección de entrega
                  </label>
                  <textarea
                    placeholder="Ej. Av. Hidalgo #123"
                    rows={2}
                    value={direccionEntrega}
                    onChange={(e) => setDireccionEntrega(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Especificaciones / Detalles
                  </label>
                  <textarea
                    placeholder="Ej. Tocar timbre..."
                    rows={2}
                    value={especificaciones}
                    onChange={(e) => setEspecificaciones(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 6623804064"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Horario de entrega
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Antes 5:30"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Costo de Envío
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 50$"
                    value={costoEnvio}
                    onChange={(e) => setCostoEnvio(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={carrito.length === 0 || submitting}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm mt-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Creando Orden...
                </>
              ) : (
                'Crear Orden de Venta'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
