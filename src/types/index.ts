// src/types/index.ts

export type Rol = 'almacenista' | 'vendedor' | 'admin' | 'repartidor'

export type Genero = 'Hombre' | 'Mujer'

export type EstadoStock = 'ACTIVO' | 'SIN_STOCK' | 'INACTIVO'

export type EstadoOrden = 'PENDIENTE' | 'PAGADO' | 'CANCELADO'

export type TipoPago = 'EFECTIVO' | 'TRANSFERENCIA'

export type TipoComision = 'TARIFA_FIJA' | 'PORCENTAJE'

export type EstadoCorte = 'ABIERTO' | 'CERRADO'

// ─── Artículo ────────────────────────────────────────────────
export interface Articulo {
  id: string
  nombre: string
  modelo: string
  talla: string
  color: string
  genero: Genero
  sku: string
  precio_venta: number
  precio_compra?: number
  activo: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  // Virtual (join)
  inventario?: InventarioActual
}

// ─── Lote de inventario (PEPS) ────────────────────────────────
export interface LoteInventario {
  id: string
  articulo_id: string
  cantidad_inicial: number
  cantidad_disponible: number
  precio_costo: number
  fecha_ingreso: string
  numero_lote?: string
  created_at: string
  created_by?: string
}

// ─── Inventario consolidado ───────────────────────────────────
export interface InventarioActual {
  id: string
  articulo_id: string
  cantidad_disponible: number
  cantidad_vendida: number
  estado: EstadoStock
  ultima_actualizacion: string
}

// ─── Orden de venta ───────────────────────────────────────────
export interface OrdenVenta {
  id: string
  numero_orden: string
  vendedor_id: string
  repartidor_id?: string
  cliente_nombre?: string
  direccion_entrega?: string
  pedido_bot_id?: string
  estado: EstadoOrden
  subtotal: number
  created_at: string
  updated_at: string
  paid_at?: string
  // Joins
  items?: OrdenVentaItem[]
  pago?: Pago
}

export interface InventarioRepartidor {
  id: string
  repartidor_id: string
  articulo_id: string
  cantidad: number
  created_at: string
  updated_at: string
  // Virtual join
  articulo?: Articulo
}

export interface OrdenVentaItem {
  id: string
  orden_venta_id: string
  articulo_id: string
  cantidad: number
  precio_unitario: number
  lote_id?: string
  created_at: string
  // Join
  articulo?: Articulo
}

// ─── Pago ─────────────────────────────────────────────────────
export interface Pago {
  id: string
  orden_venta_id: string
  tipo_pago: TipoPago
  monto: number
  monto_recibido?: number
  cambio?: number
  referencia_banco?: string
  estado: string
  created_at: string
  created_by?: string
}

// ─── Gasto de repartidor ────────────────────────────────────────
export interface GastoRepartidor {
  id: string
  repartidor_id: string
  tipo: string
  monto: number
  descripcion?: string
  fecha: string
  created_at: string
  created_by?: string
}

// ─── Configuración de comisiones ──────────────────────────────
export interface ConfiguracionVendedor {
  id: string
  vendedor_id: string
  tipo_comision: TipoComision
  valor_comision: number
  activo: boolean
  updated_at: string
  updated_by?: string
}

// ─── Corte individual ─────────────────────────────────────────
export interface CorteVendedor {
  id: string
  vendedor_id: string
  fecha: string
  total_ventas: number
  total_efectivo: number
  total_transferencia: number
  cantidad_transacciones: number
  efectivo_reportado?: number
  diferencia_efectivo?: number
  total_gastos: number
  total_comisiones: number
  estado: EstadoCorte
  reconciliado: boolean
  notas?: string
  created_at: string
  created_by?: string
  closed_at?: string
}

// ─── Corte general ────────────────────────────────────────────
export interface CorteGeneral {
  id: string
  fecha: string
  total_ventas: number
  total_efectivo: number
  total_transferencia: number
  cantidad_ordenes: number
  stock_inicial_dia?: number
  stock_final_dia?: number
  costo_mercancia_vendida: number
  total_gastos: number
  estado: EstadoCorte
  created_by?: string
  created_at: string
  closed_at?: string
}

// ─── Kardex ───────────────────────────────────────────────────
export interface KardexEntry {
  id: string
  tabla_origen: string
  registro_id?: string
  tipo_movimiento: string
  cantidad_anterior?: number
  cantidad_nueva?: number
  usuario_id?: string
  fecha: string
  descripcion?: string
}

// ─── Pedido bot (WhatsApp) ────────────────────────────────────
export interface PedidoBot {
  id: string
  codigo_pedido_bot: string
  cliente_nombre?: string
  cliente_telefono?: string
  direccion_entrega?: string
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'ENTREGADO' | 'CANCELADO'
  created_at: string
}

// ─── Forms ────────────────────────────────────────────────────
export interface EntradaMercanciaForm {
  // Datos artículo
  nombre: string
  modelo: string
  talla: string
  genero: Genero
  color: string
  precio_venta: number
  // Datos lote
  cantidad: number
  precio_costo: number
  fecha_ingreso: string
}

export interface EntradaMercanciaMasivaForm {
  nombre: string
  modelo: string
  genero: Genero
  precio_venta: number
  precio_costo: number
  fecha_ingreso: string
  variaciones: {
    color: string
    talla: string
    cantidad: number
  }[]
}

export interface PagoForm {
  tipo_pago: TipoPago
  monto_recibido?: number
  referencia_banco?: string
}
