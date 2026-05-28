// src/components/almacen/EntradaMercanciaForm.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { entradaMercanciaSchema, type EntradaMercanciaForm as FormValues } from '@/lib/validations'
import { useInventario } from '@/hooks/useInventario'
import { GENEROS } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatting'
import { today } from '@/lib/formatting'
import { cn } from '@/lib/utils'

const PREDEFINED_TALLAS = Array.from(
  new Set([
    'XS', 'S', 'M', 'L', 'XL', 'XXL',
    ...Array.from({ length: 49 }, (_, i) => i.toString()),
  ])
)

function sortTallas(tallas: string[]): string[] {
  const lettersOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  const isNumber = (val: string) => !isNaN(Number(val))

  const letterTallas = tallas.filter(t => lettersOrder.includes(t.toUpperCase()))
  const numericTallas = tallas.filter(t => isNumber(t))
  const otherTallas = tallas.filter(t => !lettersOrder.includes(t.toUpperCase()) && !isNumber(t))

  letterTallas.sort((a, b) => lettersOrder.indexOf(a.toUpperCase()) - lettersOrder.indexOf(b.toUpperCase()))
  numericTallas.sort((a, b) => Number(a) - Number(b))
  otherTallas.sort()

  return [...letterTallas, ...numericTallas, ...otherTallas]
}

export const EntradaMercanciaForm = () => {
  const { registrarEntrada, articulos } = useInventario()
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  const dbTallas = Array.from(new Set(articulos.map(a => a.talla).filter(Boolean)))
  const allTallas = sortTallas(Array.from(new Set([...PREDEFINED_TALLAS, ...dbTallas])))

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(entradaMercanciaSchema),
    defaultValues: {
      genero:        'Hombre',
      fecha_ingreso: today(),
      cantidad:      1,
      precio_venta:  0,
      precio_costo:  0,
    },
  })

  const cantidad     = watch('cantidad') ?? 0
  const precio_costo = watch('precio_costo') ?? 0
  const totalLote    = cantidad * precio_costo

  const onSubmit = async (data: FormValues) => {
    setGuardando(true)
    setExito(false)
    try {
      await registrarEntrada(data)
      reset()
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch (e) {
      console.error(e)
      alert('Error al guardar. Revisa la consola.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">

      {/* Formulario principal */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[13px] font-medium text-gray-900">Registrar entrada de mercancía</span>
        </div>

        {/* Sección artículo */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
          <span className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Datos del artículo</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-4 flex flex-col gap-3.5">
            <Field label="Nombre del artículo" error={errors.nombre?.message}>
              <input
                {...register('nombre')}
                placeholder="Ej: Pantalón Slim Fit"
                className={inputCls(!!errors.nombre)}
              />
            </Field>

            <Field label="Modelo" error={errors.modelo?.message}>
              <input
                {...register('modelo')}
                placeholder="Ej: Slim Fit, Baggy, Cargo, Recto..."
                className={inputCls(!!errors.modelo)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Talla" error={errors.talla?.message}>
                <input
                  {...register('talla')}
                  list="tallas-list"
                  placeholder="Selecciona o escribe..."
                  className={inputCls(!!errors.talla)}
                  autoComplete="off"
                />
                <datalist id="tallas-list">
                  {allTallas.map(t => <option key={t} value={t} />)}
                </datalist>
              </Field>
              <Field label="Género" error={errors.genero?.message}>
                <select {...register('genero')} className={inputCls(!!errors.genero)}>
                  {GENEROS.map(g => <option key={g}>{g}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Color" error={errors.color?.message}>
                <input
                  {...register('color')}
                  placeholder="Ej: Negro, Caqui..."
                  className={inputCls(!!errors.color)}
                />
              </Field>
              <Field label="Precio de venta" error={errors.precio_venta?.message}>
                <input
                  {...register('precio_venta', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={inputCls(!!errors.precio_venta)}
                />
              </Field>
            </div>

            <Field label="SKU (generado automáticamente)">
              <input
                readOnly
                value="UPC-XXXXXXXXXXXXXX"
                className="w-full border border-gray-100 rounded-lg px-3 py-1.5 text-[12px] font-mono text-gray-400 bg-gray-50"
              />
            </Field>
          </div>

          {/* Sección lote */}
          <div className="bg-gray-50 px-4 py-2 border-y border-gray-100">
            <span className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Datos del lote (PEPS)</span>
          </div>

          <div className="p-4 flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cantidad" error={errors.cantidad?.message}>
                <input
                  {...register('cantidad', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className={inputCls(!!errors.cantidad)}
                />
              </Field>
              <Field label="Precio de costo" error={errors.precio_costo?.message}>
                <input
                  {...register('precio_costo', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={inputCls(!!errors.precio_costo)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de ingreso" error={errors.fecha_ingreso?.message}>
                <input
                  {...register('fecha_ingreso')}
                  type="date"
                  className={inputCls(!!errors.fecha_ingreso)}
                />
              </Field>
              <Field label="N° de lote">
                <div className="w-full border border-gray-100 rounded-lg px-3 py-1.5 text-[12px] font-mono text-gray-400 bg-gray-50 flex items-center gap-1.5">
                  <span className="text-gray-300">#</span>
                  <span>Generado automáticamente</span>
                </div>
              </Field>
            </div>

            {/* Total inversión */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3.5 py-2.5">
              <span className="text-[12px] text-gray-500">Total inversión del lote</span>
              <span className="text-[18px] font-medium text-gray-900">{formatCurrency(totalLote)}</span>
            </div>

            {/* Nota PEPS */}
            <div className="flex gap-2 bg-blue-50 rounded-lg p-3 text-[12px] text-blue-700">
              <span className="mt-0.5 flex-shrink-0">ℹ</span>
              <span>Método PEPS: este lote se consumirá después de los lotes anteriores ya registrados para este artículo.</span>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-3 py-1.5 text-[13px] border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-1.5 text-[13px] bg-brand-600 text-white rounded-lg hover:bg-brand-800 disabled:opacity-60 flex items-center gap-1.5"
            >
              {guardando ? 'Guardando...' : '✓ Guardar artículo y entrada'}
            </button>
          </div>

          {exito && (
            <div className="mx-4 mb-4 p-3 bg-green-50 text-green-700 text-[13px] rounded-lg">
              ✓ Artículo y entrada registrados correctamente.
            </div>
          )}
        </form>
      </div>

      {/* Panel lateral: últimas entradas */}
      <UltimasEntradas />
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────

const Field = ({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[12px] font-medium text-gray-500">{label}</label>
    {children}
    {error && <p className="text-[11px] text-red-500">{error}</p>}
  </div>
)

const inputCls = (hasError: boolean) =>
  cn(
    'w-full border rounded-lg px-3 py-1.5 text-[13px] bg-gray-50 text-gray-900',
    hasError ? 'border-red-300 focus:outline-none focus:ring-1 focus:ring-red-400'
             : 'border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400'
  )

const UltimasEntradas = () => {
  const { articulos } = useInventario()
  const ultimos = articulos.slice(0, 8)

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="text-[13px] font-medium text-gray-900">Últimas entradas</span>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Artículo</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Talla</th>
            <th className="text-right px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Precio</th>
          </tr>
        </thead>
        <tbody>
          {ultimos.map((a) => (
            <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-800">{a.nombre}</td>
              <td className="px-4 py-2.5 text-gray-500">{a.talla}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(a.precio_venta)}</td>
            </tr>
          ))}
          {ultimos.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-[12px] text-gray-400">
                Sin entradas registradas aún
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
