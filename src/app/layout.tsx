// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Venta Pantalones Pro',
  description: 'App de gestión de ventas de pantalones',
  manifest:    '/manifest.json',
}

export const viewport = {
  themeColor:  '#534AB7',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
