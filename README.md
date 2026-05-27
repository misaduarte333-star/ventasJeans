# Venta Pantalones Pro 👖🚀

**Venta Pantalones Pro** es una aplicación Web Progresiva (PWA) de alto rendimiento diseñada para la gestión operativa y administración de ventas de pantalones. La plataforma está estructurada en torno a tres perfiles de usuario principales (Administrador, Almacenista y Vendedor/Repartidor), permitiendo una sincronización en tiempo real de inventarios, órdenes de compra y cierres de caja.

---

## 🛠️ Stack Tecnológico

*   **Framework Principal**: [Next.js 14](https://nextjs.org/) (App Router) con TypeScript.
*   **Base de Datos y Autenticación**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime + RLS).
*   **Estilos y Maquetación**: [Tailwind CSS](https://tailwindcss.com/) con diseño adaptado a móviles.
*   **Manejador de Estado**: [Zustand](https://zustand.docs.pmnd.rs/) (estado global para UI y Sesión).
*   **Gestión de Formularios**: React Hook Form en conjunto con validación estricta por [Zod](https://zod.dev/).
*   **Estrategia de Fetching**: SWR para revalidación automática en foco y mutaciones rápidas.

---

## 📂 Estructura del Proyecto

El proyecto sigue la arquitectura recomendada por Next.js App Router, aislando las rutas protegidas y organizando el código modularmente:

```text
src/
├── app/
│   ├── layout.tsx         ← Proveedores de contexto, viewport y configuración global
│   ├── page.tsx           ← Landing Page unificada con formulario Login / Registro
│   └── authenticated/     ← Área protegida de la aplicación
│       ├── layout.tsx     ← Auth Guard y Header superior adaptativo para móviles
│       ├── dashboard/     ← Dashboard principal con paneles dinámicos según el rol activo
│       ├── admin/
│       │   ├── corte-general/
│       │   └── reportes/
│       ├── almacen/
│       │   ├── articulos/ ← Catálogo de artículos (solo lectura + acciones de producto)
│       │   └── entrada/   ← Formulario de entrada de mercancía por lotes (PEPS)
│       └── vendedor/
│           ├── ordenes/   ← Listado de órdenes y carrito de ventas interactivo
│           ├── gastos/    ← Registro de gastos diarios
│           └── corte/     ← Pantalla de corte de caja del vendedor
├── components/
│   ├── admin/             ← Componentes especializados de analítica y cortes generales
│   ├── almacen/           ← ArticulosList (filtrable), EntradaMercanciaForm (con Zod)
│   ├── vendedor/          ← CarritoOrdenes, PagoForm, CorteVendedor
│   └── shared/            ← Sidebar (drawer móvil + selector de rol), Header
├── hooks/                 ← useAuth (sesiones), useInventario, useOrdenes, useCorte
├── services/              ← Módulo cliente de Supabase e integraciones de base de datos
├── lib/                   ← utils, formatting (moneda/fecha), constants, validations (esquemas Zod)
├── store/                 ← authStore (datos de usuario), uiStore (estados del sidebar)
└── types/                 ← index.ts (Definiciones de tipo TypeScript para el dominio)
```

---

## 🔑 Gestión de Roles y Acceso

| Perfil | Módulos Autorizados |
| :--- | :--- |
| **Administrador** | Visibilidad total: Cierre general, Reportes gerenciales, Gestión de Catálogo y Entradas. |
| **Almacenista** | Catálogo, Registro de entradas de mercancía por lotes (PEPS), Gestión de Stock. |
| **Vendedor** | Creación de órdenes de venta, Registro de gastos del día y Cierre de caja individual. |

*Nota: La aplicación incluye un selector dinámico en el menú lateral para usuarios que posean múltiples roles configurados en su metadata (`user_metadata.roles`).*

---

## ⚡ Funcionalidad Actual

-   [x] **Migraciones e Infraestructura**: Base de datos Postgres en Supabase con Row Level Security (RLS) e índices relacionales.
-   [x] **Seguridad y RLS de Escritura**: Políticas RLS implementadas para inserción y actualización segura en `ordenes_venta`, `ordenes_venta_items`, `pagos`, `gastos_vendedor`, `cortes_vendedor` y `cortes_general`.
-   [x] **PostgreSQL RPCs**: Función `obtener_corte_vendedor` programada en PL/pgSQL para cálculos financieros ágiles y consistentes desde el backend.
-   [x] **Portal Unificado (Landing + Auth)**: Página de bienvenida responsiva con formularios integrados para el Login y Registro (con selector de rol de simulación para desarrollo y pruebas interactivas de los 3 perfiles).
-   [x] **Protección de Rutas (Auth Guard)**: Layout autenticado que verifica la sesión y previene cargas parpadeantes (spinner integrado).
-   [x] **Navegación Móvil de Alto Estándar (375x650px)**:
    -   Sidebar responsivo que se transforma en **drawer deslizable** en dispositivos móviles.
    -   Selector de simulación de rol dinámico integrado para validar flujos de `admin`, `almacenista` y `vendedor`.
-   [x] **Catálogo de Artículos con Acciones Completas**:
    -   Generación, visualización, descarga e impresión directa de **códigos QR** basados en el SKU utilizando una API ultraligera.
    -   Edición completa de propiedades de artículo (Nombre, Modelo, Talla, Color, Género y Precio).
    -   **Borrado lógico** (`activo = false`) para preservar históricos financieros y lotes PEPS.
-   [x] **Módulo de Ventas del Vendedor**:
    -   **Nueva Orden**: Carrito de compras interactivo con buscador en tiempo real, validación de stock disponible, metadatos y datos del cliente.
    -   **Órdenes del Día**: Listado reactivo de pedidos diarios con opción de **Cobrar** mediante Efectivo (con cálculo de cambio) o Transferencia Bancaria (con referencia).
-   [x] **Gastos del Vendedor**: Registro de consumos diarios por categoría (Comida, Gasolina, etc.) con listado interactivo y eliminación de registros.
-   [x] **Corte de Caja Individual**: Formulario de cierre con efectivo reportado, cálculo automático de discrepancias, justificaciones obligatorias y bloqueo de operaciones.
-   [x] **Corte General (Administrador)**: Panel consolidado para verificar cierres individuales de vendedores, discrepancias generales, costo de mercancía vendida y stock del día, guardando cierres consolidados en la base de datos.
-   [x] **Validación de Calidad**: Cero errores de compilación TypeScript comprobados mediante `npx tsc --noEmit`.

---

## 🚧 Aspectos Faltantes y Hoja de Ruta Futura

1.  **Middleware de Seguridad en Servidor Edge**: Implementar un `middleware.ts` en Next.js para interceptar peticiones del cliente y validar la sesión con Supabase antes de renderizar la página.
2.  **Soporte Offline Avanzado (PWA)**: Implementar service worker local con Background Sync para guardar ventas locales cuando los repartidores no tengan señal de datos móviles.
3.  **Webhooks y Automatizaciones**: Conexión a herramientas como n8n o Make para notificaciones automáticas en WhatsApp o Discord sobre cierres de caja y alertas de inventario sin stock.

*   **Caché de Páginas**: Configurar Regeneración Estática Incremental (ISR) en Next.js para el catálogo de artículos de lectura, reduciendo las llamadas directas a Supabase a segundos mínimos.
*   **Optimización de Assets**: Configurar la compresión de imágenes y lazy loading nativo en los layouts para reducir el tamaño del paquete JS de primer inicio.
