// src/app/authenticated/vendedor/gastos/page.tsx
'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, AlertCircle, Calendar } from 'lucide-react'
import { useGastos } from '@/hooks/useGastos'
import { formatCurrency, formatDate } from '@/lib/formatting'
import { cn } from '@/lib/utils'

export default function GastosRepartidorPage() {
  const { gastos, isLoading, registrarGasto, eliminarGasto, totalGastos } = useGastos()

  // Form States
  const [tipo, setTipo] = useState('Gasolina')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  // Categories list
  const categorias = ['Gasolina', 'Comida', 'Transporte', 'Cambio de Caja', 'Otros']

  const handleRegistrarGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('Por favor, ingresa un monto válido mayor a 0.')
      return
    }

    setGuardando(true)
    setError('')
    setExito(false)

    try {
      await registrarGasto(tipo, montoNum, descripcion.trim())
      setMonto('')
      setDescripcion('')
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el gasto.')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarGasto = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return
    try {
      await eliminarGasto(id)
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar el gasto.')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Top Title */}
      <div>
        <h1 className="text-[20px] font-bold text-gray-900">Registro de Gastos</h1>
        <p className="text-[13px] text-gray-500">Reporta gastos diarios realizados durante tu turno</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="md:col-span-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm h-fit">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-3">Nuevo Gasto</h2>

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-2.5 text-[12px] font-medium mb-3">
              {error}
            </div>
          )}

          {exito && (
            <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg p-2.5 text-[12px] font-medium mb-3">
              ¡Gasto registrado con éxito!
            </div>
          )}

          <form onSubmit={handleRegistrarGasto} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Categoría/Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Monto
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ej. 150.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Descripción
              </label>
              <textarea
                rows={3}
                required
                placeholder="Ej. Gasolina para entrega del pedido ORD-2026..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Guardando...
                </>
              ) : (
                <>
                  <Plus size={14} /> Registrar Gasto
                </>
              )}
            </button>
          </form>
        </div>

        {/* Listado de Gastos */}
        <div className="md:col-span-2 bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-[15px] font-semibold text-gray-900">Gastos Registrados Hoy</h2>
            <div className="flex items-center gap-1.5 text-gray-400 text-[12px] font-medium bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
              <Calendar size={13} />
              <span>{formatDate(new Date().toISOString().split('T')[0], "dd 'de' MMMM")}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-brand-600" size={22} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {gastos.map((gas) => (
                <div
                  key={gas.id}
                  className="flex items-start justify-between border border-gray-100 hover:border-brand-100 rounded-xl p-3 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="max-w-[75%]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                        {gas.tipo}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-600 mt-2 font-medium">{gas.descripcion}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-bold text-red-600">
                      -{formatCurrency(gas.monto)}
                    </span>
                    <button
                      onClick={() => handleEliminarGasto(gas.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar Gasto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {gastos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-1.5">
                  <AlertCircle size={20} className="text-gray-300" />
                  <p className="text-[13px]">No has registrado ningún gasto el día de hoy.</p>
                </div>
              )}

              {/* Total Gastos */}
              {gastos.length > 0 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                  <span className="text-[13px] font-semibold text-gray-500">Total Gastos Reportados:</span>
                  <span className="text-[16px] font-bold text-red-600">{formatCurrency(totalGastos)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
