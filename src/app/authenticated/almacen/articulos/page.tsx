// src/app/authenticated/almacen/articulos/page.tsx
import { ArticulosList } from '@/components/almacen/ArticulosList'

export default function ArticulosPage() {
  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-[18px] font-medium text-gray-900">Inventario de artículos</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Todos los artículos registrados en el sistema</p>
      </div>
      <ArticulosList />
    </div>
  )
}
