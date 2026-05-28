// src/components/almacen/EntradaMercanciaForm.tsx
'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { entradaMercanciaMasivaSchema, type EntradaMercanciaMasivaForm as FormValues } from '@/lib/validations'
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
  const { registrarEntradaMasiva, articulos } = useInventario()
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  const dbTallas = Array.from(new Set(articulos.map(a => a.talla).filter(Boolean)))
  const allTallas = sortTallas(Array.from(new Set([...PREDEFINED_TALLAS, ...dbTallas])))
  
  const dbColores = Array.from(new Set(articulos.map(a => a.color).filter(Boolean)))
  const allColores = dbColores.sort((a, b) => a.localeCompare(b))

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(entradaMercanciaMasivaSchema),
    defaultValues: {
      genero:        'Hombre',
      fecha_ingreso: today(),
      precio_venta:  0,
      precio_costo:  0,
      variaciones:   [{ color: '', talla: '', cantidad: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variaciones',
  })

  const precio_costo = watch('precio_costo') ?? 0
  const variaciones  = watch('variaciones') ?? []
  const totalCantidad = variaciones.reduce((acc, curr) => acc + (Number(curr?.cantidad) || 0), 0)
  const totalInversion = totalCantidad * precio_costo

  const onSubmit = async (data: FormValues) => {
    setGuardando(true)
    setExito(false)
    try {
      await registrarEntradaMasiva(data)
      reset({
        nombre: '',
        modelo: '',
        genero: 'Hombre',
        precio_venta: 0,
        precio_costo: 0,
        fecha_ingreso: today(),
        variaciones: [{ color: '', talla: '', cantidad: 1 }],
      })
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
          <span className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Datos del artículo (Modelo)</span>
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
              <Field label="Género" error={errors.genero?.message}>
                <select {...register('genero')} className={inputCls(!!errors.genero)}>
                  {GENEROS.map(g => <option key={g}>{g}</option>)}
                </select>
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
          </div>

          {/* Sección lote */}
          <div className="bg-gray-50 px-4 py-2 border-y border-gray-100">
            <span className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Datos del lote (PEPS)</span>
          </div>

          <div className="p-4 flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
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
              <Field label="Fecha de ingreso" error={errors.fecha_ingreso?.message}>
                <input
                  {...register('fecha_ingreso')}
                  type="date"
                  className={inputCls(!!errors.fecha_ingreso)}
                />
              </Field>
            </div>
          </div>

          {/* Sección variaciones */}
          <div className="bg-gray-50 px-4 py-2 border-y border-gray-100 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Variaciones (Tallas / Colores)</span>
            <span className="text-[11px] text-gray-400 font-mono">Variaciones: {fields.length}</span>
          </div>

          <div className="p-4 flex flex-col gap-3.5">
            {errors.variaciones?.message && (
              <div className="p-2.5 bg-red-50 text-red-700 text-[12px] rounded-lg">
                ⚠️ {errors.variaciones.message}
              </div>
            )}

            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 relative group">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <Field label="Color" error={errors.variaciones?.[index]?.color?.message}>
                      <input
                        {...register(`variaciones.${index}.color` as const)}
                        list="colores-list"
                        placeholder="Ej: Negro"
                        className={inputCls(!!errors.variaciones?.[index]?.color)}
                        autoComplete="off"
                      />
                    </Field>
                    <Field label="Talla" error={errors.variaciones?.[index]?.talla?.message}>
                      <input
                        {...register(`variaciones.${index}.talla` as const)}
                        list="tallas-list"
                        placeholder="Ej: 32"
                        className={inputCls(!!errors.variaciones?.[index]?.talla)}
                        autoComplete="off"
                      />
                    </Field>
                    <Field label="Cantidad" error={errors.variaciones?.[index]?.cantidad?.message}>
                      <input
                        {...register(`variaciones.${index}.cantidad` as const, { valueAsNumber: true })}
                        type="number"
                        min="1"
                        placeholder="1"
                        className={inputCls(!!errors.variaciones?.[index]?.cantidad)}
                      />
                    </Field>
                  </div>

                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="mt-6 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar variación"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => append({ color: '', talla: '', cantidad: 1 })}
              className="py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition flex items-center justify-center gap-1.5 text-[13px] font-medium"
            >
              ➕ Añadir variación (Color / Talla)
            </button>

            <datalist id="tallas-list">
              {allTallas.map(t => <option key={t} value={t} />)}
            </datalist>

            <datalist id="colores-list">
              {allColores.map(c => <option key={c} value={c} />)}
            </datalist>

            {/* Total inversión */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3.5 py-2.5 mt-2">
              <div className="flex flex-col">
                <span className="text-[12px] text-gray-500">Total prendas</span>
                <span className="text-[13px] font-semibold text-gray-800">{totalCantidad} uds</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[12px] text-gray-500">Total inversión del lote</span>
                <span className="text-[18px] font-medium text-gray-900">{formatCurrency(totalInversion)}</span>
              </div>
            </div>

            {/* Nota PEPS */}
            <div className="flex gap-2 bg-blue-50 rounded-lg p-3 text-[12px] text-blue-700">
              <span className="mt-0.5 flex-shrink-0">ℹ</span>
              <span>Método PEPS: se generarán artículos y lotes independientes para cada combinación de talla/color.</span>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => reset({
                nombre: '',
                modelo: '',
                genero: 'Hombre',
                precio_venta: 0,
                precio_costo: 0,
                fecha_ingreso: today(),
                variaciones: [{ color: '', talla: '', cantidad: 1 }],
              })}
              className="px-3 py-1.5 text-[13px] border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-1.5 text-[13px] bg-brand-600 text-white rounded-lg hover:bg-brand-800 disabled:opacity-60 flex items-center gap-1.5"
            >
              {guardando ? 'Guardando...' : '✓ Guardar artículo y entradas'}
            </button>
          </div>

          {exito && (
            <div className="mx-4 mb-4 p-3 bg-green-50 text-green-700 text-[13px] rounded-lg">
              ✓ Artículos y entradas registrados correctamente.
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
  const ultimos = articulos.slice(0, 10)

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-900">Últimas entradas</span>
        <span className="text-[11px] text-gray-400 font-mono">{ultimos.length} artículos</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Artículo / Modelo</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Talla / Color</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Cant.</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Precio</th>
            </tr>
          </thead>
          <tbody>
            {ultimos.map((a) => (
              <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50/70">
                <td className="px-3 py-2.5">
                  <p className="text-gray-800 font-medium leading-tight">{a.nombre}</p>
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
                  <span className={`font-semibold ${(a.inventario?.cantidad_disponible ?? 0) === 0 ? 'text-red-400' : 'text-gray-800'}`}>
                    {a.inventario?.cantidad_disponible ?? '—'}
                  </span>
                  <span className="text-[11px] text-gray-400 ml-1">uds</span>
                </td>
                <td className="px-3 py-2.5 text-right text-gray-700">{formatCurrency(a.precio_venta)}</td>
              </tr>
            ))}
            {ultimos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[12px] text-gray-400">
                  Sin entradas registradas aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
