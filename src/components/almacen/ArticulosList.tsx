// src/components/almacen/ArticulosList.tsx
'use client'

import { useState, useEffect } from 'react'
import { QrCode, Pencil, Trash2, Download, Printer, X, Save } from 'lucide-react'
import { useInventario } from '@/hooks/useInventario'
import { formatCurrency } from '@/lib/formatting'
import { cn } from '@/lib/utils'
import type { EstadoStock, Articulo, Genero } from '@/types'

export const ArticulosList = () => {
  const { articulos, loadingArticulos, actualizarArticulo, desactivarArticulo } = useInventario()
  const [busqueda, setBusqueda] = useState('')
  const [filtroGenero, setFiltroGenero] = useState<'Todos' | 'Hombre' | 'Mujer'>('Todos')
  const [filtroTalla, setFiltroTalla] = useState<string>('Todos')
  const [filtroModelo, setFiltroModelo] = useState<string>('Todos')
  const [filtroColor, setFiltroColor] = useState<string>('Todos')
  const [ultimaImpresion, setUltimaImpresion] = useState<string | null>(null)

  // Modals States
  const [articuloQr, setArticuloQr] = useState<Articulo | null>(null)
  const [articuloEditar, setArticuloEditar] = useState<Articulo | null>(null)
  const [articuloEliminar, setArticuloEliminar] = useState<Articulo | null>(null)

  // Form States for Edit
  const [editNombre, setEditNombre] = useState('')
  const [editModelo, setEditModelo] = useState('')
  const [editTalla, setEditTalla] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editGenero, setEditGenero] = useState<Genero>('Hombre')
  const [editPrecio, setEditPrecio] = useState('')
  const [editPrecioCompra, setEditPrecioCompra] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUltimaImpresion(localStorage.getItem('ultima_impresion_qr'))
    }
  }, [])

  const registrarImpresion = () => {
    const now = new Date()
    const formatted = now.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    localStorage.setItem('ultima_impresion_qr', formatted)
    setUltimaImpresion(formatted)
  }

  const openEditar = (a: Articulo) => {
    setArticuloEditar(a)
    setEditNombre(a.nombre)
    setEditModelo(a.modelo || '')
    setEditTalla(a.talla)
    setEditColor(a.color)
    setEditGenero(a.genero)
    setEditPrecio(String(a.precio_venta))
    setEditPrecioCompra(String(a.precio_compra ?? 0))
    setEditError('')
  }

  const handleSaveEdit = async () => {
    if (!articuloEditar) return
    if (!editNombre.trim() || !editModelo.trim() || !editTalla.trim() || !editColor.trim() || !editPrecio.trim()) {
      setEditError('Todos los campos son obligatorios.')
      return
    }
    const precioNum = parseFloat(editPrecio)
    if (isNaN(precioNum) || precioNum <= 0) {
      setEditError('Precio de venta inválido.')
      return
    }
    const precioCompraNum = parseFloat(editPrecioCompra)
    if (isNaN(precioCompraNum) || precioCompraNum < 0) {
      setEditError('Precio de compra inválido.')
      return
    }

    setSaving(true)
    try {
      await actualizarArticulo(articuloEditar.id, {
        nombre: editNombre.trim(),
        modelo: editModelo.trim(),
        talla: editTalla.trim(),
        color: editColor.trim(),
        genero: editGenero,
        precio_venta: precioNum,
        precio_compra: precioCompraNum,
      })
      setArticuloEditar(null)
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleSoftDelete = async () => {
    if (!articuloEliminar) return
    try {
      await desactivarArticulo(articuloEliminar.id)
      setArticuloEliminar(null)
    } catch (err: unknown) {
      alert('Error al desactivar el artículo: ' + (err instanceof Error ? err.message : ''))
    }
  }

  const handleDownloadQR = (sku: string, text: string) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(sku)}`
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 300
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = url
        link.download = `QR-${text}-${sku}.png`
        link.click()
      }
    }
  }

  const handlePrintQR = (sku: string, nombre: string, talla: string, color: string) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir QR - ${nombre}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                margin: 0;
              }
              h2 { margin: 10px 0 5px 0; font-size: 20px; color: #111; font-weight: 600; }
              p { margin: 3px 0; font-size: 14px; color: #555; }
              img { width: 220px; height: 220px; margin-bottom: 15px; }
              @media print {
                body { height: auto; }
              }
            </style>
          </head>
          <body>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(sku)}" />
            <h2>${nombre}</h2>
            <p>SKU: <strong>${sku}</strong></p>
            <p>Talla: ${talla} | Color: ${color}</p>
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

  const handlePrintAllQRs = (items: Articulo[]) => {
    if (items.length === 0) {
      alert('No hay artículos seleccionados para imprimir.')
      return
    }
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      registrarImpresion()
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir QRs - Inventario</title>
            <style>
              @page {
                size: letter;
                margin: 10mm;
              }
              body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #fff;
                color: #000;
              }
              .grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                padding: 10px;
              }
              .card {
                border: 1px solid #eee;
                border-radius: 8px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                box-sizing: border-box;
                page-break-inside: avoid;
              }
              .qr-img {
                width: 100px;
                height: 100px;
                margin-bottom: 8px;
              }
              .nombre {
                font-size: 11px;
                font-weight: bold;
                margin: 2px 0;
                max-width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .sku {
                font-family: monospace;
                font-size: 9px;
                color: #555;
                margin: 1px 0;
              }
              .detalles {
                font-size: 9px;
                color: #666;
                margin: 1px 0;
              }
              @media print {
                .card {
                  border: 1px solid #ddd;
                }
              }
            </style>
          </head>
          <body>
            <div class="grid">
              ${items.map(a => `
                <div class="card">
                  <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(a.sku)}" />
                  <div class="nombre">${a.nombre}</div>
                  <div class="sku">${a.sku}</div>
                  <div class="detalles">${a.modelo || '-'} | Talla: ${a.talla} | ${a.color}</div>
                </div>
              `).join('')}
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 1000);
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  // Extraer valores únicos reactivamente de la lista actual de artículos
  const uniqueTallas = Array.from(new Set(articulos.map((a) => a.talla).filter(Boolean))).sort()
  const uniqueModelos = Array.from(new Set(articulos.map((a) => a.modelo).filter(Boolean))).sort()
  const uniqueColores = Array.from(new Set(articulos.map((a) => a.color).filter(Boolean))).sort()

  const filtrados = articulos.filter((a) => {
    const matchBusq =
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
      (a.modelo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      a.talla.toLowerCase().includes(busqueda.toLowerCase())
    const matchGenero = filtroGenero === 'Todos' || a.genero === filtroGenero
    const matchTalla = filtroTalla === 'Todos' || a.talla === filtroTalla
    const matchModelo = filtroModelo === 'Todos' || a.modelo === filtroModelo
    const matchColor = filtroColor === 'Todos' || a.color === filtroColor
    return matchBusq && matchGenero && matchTalla && matchModelo && matchColor
  })

  if (loadingArticulos) {
    return <div className="p-6 text-sm text-gray-400">Cargando inventario...</div>
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden relative shadow-sm">
      {/* Header premium con contadores e historial */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50/50">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-gray-900">Inventario de artículos</span>
            <span className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
              {filtrados.length} {filtrados.length === 1 ? 'artículo' : 'artículos'}
            </span>
          </div>
          {ultimaImpresion && (
            <span className="text-[11px] text-brand-600 font-medium flex items-center gap-1">
              <span>🖨️ Última impresión QR:</span>
              <span className="font-semibold">{ultimaImpresion}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => handlePrintAllQRs(filtrados)}
            className="flex items-center gap-1.5 text-[12px] bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-50 font-medium shadow-sm transition-colors"
          >
            <Printer size={13} className="text-gray-500" /> Imprimir QRs (Filtrados: {filtrados.length})
          </button>
          <button 
            onClick={() => handlePrintAllQRs(articulos)}
            className="flex items-center gap-1.5 text-[12px] bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition-colors"
          >
            <Printer size={13} /> Imprimir QRs (Todo: {articulos.length})
          </button>
          <button className="flex items-center gap-1.5 text-[12px] bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <Download size={13} /> Exportar
          </button>
        </div>
      </div>

      {/* Buscador + filtros avanzados */}
      <div className="px-4 py-3 border-b border-gray-100 space-y-3 bg-white">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre, SKU, etc..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] bg-gray-50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['Todos', 'Hombre', 'Mujer'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setFiltroGenero(g)}
                className={cn(
                  'px-3 py-1.5 text-[12px] rounded-lg border transition-colors flex-shrink-0',
                  filtroGenero === g
                    ? 'bg-gray-100 border-gray-300 text-gray-800 font-medium'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* selectores de filtros avanzados por talla, modelo y color */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-50 pt-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Modelo</label>
            <select
              value={filtroModelo}
              onChange={(e) => setFiltroModelo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] bg-gray-50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="Todos">Todos los modelos</option>
              {uniqueModelos.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Talla</label>
            <select
              value={filtroTalla}
              onChange={(e) => setFiltroTalla(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] bg-gray-50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="Todos">Todas las tallas</option>
              {uniqueTallas.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Color</label>
            <select
              value={filtroColor}
              onChange={(e) => setFiltroColor(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] bg-gray-50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="Todos">Todos los colores</option>
              {uniqueColores.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-[13px] min-w-[850px]" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '18%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50">
              {['Artículo', 'Modelo', 'SKU', 'Talla', 'Color', 'Género', 'P. Compra', 'Precio venta', 'Stock', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((a) => {
              const stock = a.inventario?.cantidad_disponible ?? 0
              const estado = a.inventario?.estado ?? 'ACTIVO'
              return (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900 truncate">{a.nombre}</td>
                  <td className="px-4 py-2.5 text-gray-600 truncate">{a.modelo || '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400 truncate">{a.sku}</td>
                  <td className="px-4 py-2.5 text-gray-600">{a.talla}</td>
                  <td className="px-4 py-2.5 text-gray-600 truncate">{a.color}</td>
                  <td className="px-4 py-2.5">
                    <GeneroBadge genero={a.genero} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 font-medium">{formatCurrency(a.precio_compra ?? 0)}</td>
                  <td className="px-4 py-2.5 text-gray-800 font-semibold">{formatCurrency(a.precio_venta)}</td>
                  <td className="px-4 py-2.5">
                    <StockPill estado={estado} cantidad={stock} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button 
                        onClick={() => setArticuloQr(a)}
                        className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700" 
                        title="Ver QR"
                      >
                        <QrCode size={14} />
                      </button>
                      <button 
                        onClick={() => openEditar(a)}
                        className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700" 
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => setArticuloEliminar(a)}
                        className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-500" 
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[13px] text-gray-400">
                  No se encontraron artículos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MODAL QR ─── */}
      {articuloQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-gray-100 overflow-hidden flex flex-col items-center p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-full flex justify-end mb-2">
              <button 
                onClick={() => setArticuloQr(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(articuloQr.sku)}`}
                alt="QR Code"
                className="w-48 h-48 block rounded-lg shadow-sm"
              />
            </div>
            
            <h3 className="text-[16px] font-semibold text-gray-900">{articuloQr.nombre}</h3>
            <p className="text-[11px] font-mono text-gray-400 mt-1 uppercase tracking-wider">SKU: {articuloQr.sku}</p>
            <p className="text-[12px] text-gray-500 mt-1.5">Talla: <span className="font-medium text-gray-700">{articuloQr.talla}</span> | Color: <span className="font-medium text-gray-700">{articuloQr.color}</span></p>
            
            <div className="grid grid-cols-2 gap-2 w-full mt-6">
              <button 
                onClick={() => handleDownloadQR(articuloQr.sku, articuloQr.nombre)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 border border-gray-200 text-gray-600 rounded-lg text-[13px] hover:bg-gray-50 transition-colors"
              >
                <Download size={14} /> Descargar
              </button>
              <button 
                onClick={() => handlePrintQR(articuloQr.sku, articuloQr.nombre, articuloQr.talla, articuloQr.color)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-medium transition-colors shadow-sm"
              >
                <Printer size={14} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL EDITAR ─── */}
      {articuloEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-[15px] font-semibold text-gray-900">Editar artículo</h3>
              <button 
                onClick={() => setArticuloEditar(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {editError && (
                <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-2.5 text-[12px] font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Modelo</label>
                  <input 
                    type="text" 
                    value={editModelo}
                    onChange={(e) => setEditModelo(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Talla</label>
                  <input 
                    type="text" 
                    value={editTalla}
                    onChange={(e) => setEditTalla(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Color</label>
                  <input 
                    type="text" 
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Género</label>
                  <select 
                    value={editGenero}
                    onChange={(e) => setEditGenero(e.target.value as Genero)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  >
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Precio Compra</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editPrecioCompra}
                    onChange={(e) => setEditPrecioCompra(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Precio Venta</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={() => setArticuloEditar(null)}
                disabled={saving}
                className="py-1.5 px-3 border border-gray-200 text-gray-500 rounded-lg text-[13px] hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-1.5 py-1.5 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                <Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CONFIRMAR ELIMINAR (BORRADO LÓGICO) ─── */}
      {articuloEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <Trash2 size={22} />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">¿Eliminar artículo?</h3>
              <p className="text-[12px] text-gray-400 mt-2 px-2">
                ¿Estás seguro de que deseas desactivar el artículo <strong>{articuloEliminar.nombre}</strong> (Talla {articuloEliminar.talla})?
              </p>
              <p className="text-[10px] text-amber-600 mt-2 font-medium bg-amber-50 rounded-lg py-1 px-3.5 border border-amber-100">
                Nota: Se aplicará borrado lógico para preservar históricos de ventas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={() => setArticuloEliminar(null)}
                className="py-1.5 px-3 border border-gray-200 text-gray-500 rounded-lg text-[13px] hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSoftDelete}
                className="py-1.5 px-4.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[13px] font-medium transition-colors shadow-sm"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const GeneroBadge = ({ genero }: { genero: string }) => (
  <span className={cn(
    'inline-block px-2 py-0.5 rounded-full text-[11px] font-medium',
    genero === 'Hombre' ? 'bg-blue-50 text-blue-800' : 'bg-pink-50 text-pink-800'
  )}>
    {genero}
  </span>
)

const StockPill = ({ estado, cantidad }: { estado: EstadoStock; cantidad: number }) => {
  const cfg = {
    ACTIVO:    { cls: 'bg-green-50 text-green-800', label: `${cantidad} pzas` },
    SIN_STOCK: { cls: 'bg-red-50 text-red-800',     label: 'Agotado' },
    INACTIVO:  { cls: 'bg-gray-100 text-gray-500',  label: 'Inactivo' },
  }
  const { cls, label } = cfg[estado] ?? cfg.ACTIVO
  const isLow = estado === 'ACTIVO' && cantidad <= 3
  return (
    <span className={cn(
      'inline-block px-2 py-0.5 rounded-full text-[11px] font-medium',
      isLow ? 'bg-amber-50 text-amber-800' : cls
    )}>
      {isLow ? `${cantidad} pza${cantidad !== 1 ? 's' : ''}` : label}
    </span>
  )
}
