// src/lib/constants.ts

export const TALLAS = ['XS', 'S', 'M', 'L', 'XL', '26', '28', '30', '32', '34', '36', '38'] as const

export const GENEROS = ['Hombre', 'Mujer'] as const

export const TIPOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA'] as const

export const TIPOS_GASTO = [
  'Gasolina',
  'Comida',
  'Transporte',
  'Cambio / faltante',
  'Otro',
] as const

export const ROLES = {
  almacenista: 'Almacenista',
  vendedor:    'Vendedor',
  admin:       'Admin',
  repartidor:  'Repartidor',
} as const

export const NAV_ITEMS = {
  almacenista: [
    { label: 'Dashboard',         href: '/authenticated/dashboard',           icon: 'home' },
    { label: 'Inventario',        href: '/authenticated/almacen/articulos',   icon: 'list' },
    { label: 'Entrada mercancía', href: '/authenticated/almacen/entrada',     icon: 'package' },
  ],
  vendedor: [
    { label: 'Dashboard',         href: '/authenticated/dashboard',              icon: 'home' },
    { label: 'Órdenes del día',   href: '/authenticated/vendedor/ordenes',       icon: 'shopping-cart' },
    { label: 'Nueva orden',       href: '/authenticated/vendedor/ordenes/nueva', icon: 'plus' },
    { label: 'Mi corte',          href: '/authenticated/vendedor/corte',         icon: 'report' },
  ],
  repartidor: [
    { label: 'Dashboard',         href: '/authenticated/dashboard',              icon: 'home' },
    { label: 'Órdenes del día',   href: '/authenticated/repartidor/ordenes',     icon: 'shopping-cart' },
    { label: 'Gastos',            href: '/authenticated/repartidor/gastos',      icon: 'receipt' },
    { label: 'Inventario',        href: '/authenticated/repartidor/inventario',  icon: 'package' },
  ],
  admin: [
    { label: 'Dashboard',         href: '/authenticated/dashboard',              icon: 'home' },
    { label: 'Corte general',     href: '/authenticated/admin/corte-general',    icon: 'building-bank' },
    { label: 'Entregas',          href: '/authenticated/admin/entregas',         icon: 'truck' },
    { label: 'Nueva venta',       href: '/authenticated/admin/venta',            icon: 'shopping-cart' },
    { label: 'Inventario',        href: '/authenticated/almacen/articulos',      icon: 'list' },
    { label: 'Entrada mercancía', href: '/authenticated/almacen/entrada',        icon: 'package' },
    { label: 'Usuarios',          href: '/authenticated/admin/usuarios',         icon: 'users' },
  ],
} as const
