// src/app/authenticated/almacen/entrada/page.tsx
import { EntradaMercanciaForm } from '@/components/almacen/EntradaMercanciaForm'

export default function EntradaPage() {
  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-[18px] font-medium text-gray-900">Entrada de mercancía</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Registra un artículo nuevo y su primer lote en un solo paso</p>
      </div>
      <EntradaMercanciaForm />
    </div>
  )
}
