// src/lib/validations.ts
import { z } from 'zod'

export const entradaMercanciaSchema = z.object({
  // Artículo
  nombre:       z.string().min(2, 'Nombre requerido'),
  modelo:       z.string().min(1, 'Modelo requerido'),
  talla:        z.string().min(1, 'Talla requerida'),
  genero:       z.enum(['Hombre', 'Mujer']),
  color:        z.string().min(1, 'Color requerido'),
  precio_venta: z.number().positive('El precio debe ser mayor a 0'),
  // Lote
  cantidad:      z.number().int().positive('La cantidad debe ser mayor a 0'),
  precio_costo:  z.number().positive('El costo debe ser mayor a 0'),
  fecha_ingreso: z.string().min(1, 'Fecha requerida'),
})

export const nuevaOrdenSchema = z.object({
  cliente_nombre:    z.string().min(2, 'Nombre del cliente requerido'),
  direccion_entrega: z.string().optional(),
})

export const pagoSchema = z.discriminatedUnion('tipo_pago', [
  z.object({
    tipo_pago:      z.literal('EFECTIVO'),
    monto_recibido: z.number().positive('Ingresa el monto recibido'),
  }),
  z.object({
    tipo_pago:        z.literal('TRANSFERENCIA'),
    referencia_banco: z.string().min(1, 'Ingresa la referencia bancaria'),
  }),
])

export const gastoSchema = z.object({
  tipo:        z.string().min(1, 'Tipo requerido'),
  monto:       z.number().positive('El monto debe ser mayor a 0'),
  descripcion: z.string().optional(),
  fecha:       z.string().min(1, 'Fecha requerida'),
})

export const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const entradaMercanciaMasivaSchema = z.object({
  nombre:        z.string().min(2, 'Nombre requerido'),
  modelo:        z.string().min(1, 'Modelo requerido'),
  genero:        z.enum(['Hombre', 'Mujer']),
  precio_venta:  z.number().positive('El precio debe ser mayor a 0'),
  precio_costo:  z.number().positive('El costo debe ser mayor a 0'),
  fecha_ingreso: z.string().min(1, 'Fecha requerida'),
  variaciones:   z.array(
    z.object({
      color:    z.string().min(1, 'Color requerido'),
      talla:    z.string().min(1, 'Talla requerida'),
      cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
    })
  ).min(1, 'Debes agregar al menos una variación'),
})

export type EntradaMercanciaForm = z.infer<typeof entradaMercanciaSchema>
export type EntradaMercanciaMasivaForm = z.infer<typeof entradaMercanciaMasivaSchema>
export type NuevaOrdenForm       = z.infer<typeof nuevaOrdenSchema>
export type GastoForm            = z.infer<typeof gastoSchema>
export type LoginForm            = z.infer<typeof loginSchema>
