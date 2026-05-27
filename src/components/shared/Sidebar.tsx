// src/components/shared/Sidebar.tsx
'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ShirtIcon, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, ROLES } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import type { Rol } from '@/types'

import { useUiStore } from '@/store/uiStore'

export const Sidebar = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { user, rolActivo, setRolActivo, logout } = useAuth()
  const { sidebarOpen, setSidebarOpen } = useUiStore()

  if (!rolActivo) return null

  const navItems = NAV_ITEMS[rolActivo as Rol] ?? []
  const isUserAdmin = user?.user_metadata?.rol === 'admin' || (user?.user_metadata?.roles as Rol[] | undefined)?.includes('admin')
  const rolesDisponibles: Rol[] = isUserAdmin
    ? ['admin', 'almacenista', 'vendedor', 'repartidor']
    : (user?.user_metadata?.roles as Rol[]) ?? [rolActivo]

  return (
    <>
      {/* Backdrop para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        'w-[200px] min-h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out',
        'fixed inset-y-0 left-0 z-50 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0 shadow-lg lg:shadow-none' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShirtIcon size={18} className="text-brand-600" />
            <span className="text-[15px] font-medium text-gray-900">Pantalones Pro</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 p-1"
          >
            ✕
          </button>
        </div>

        {/* Selector de rol */}
        {rolesDisponibles.length > 1 && (
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Rol activo</p>
            <div className="relative">
              <select
                value={rolActivo}
                onChange={(e) => {
                  const newRol = e.target.value as Rol
                  setRolActivo(newRol)
                  setSidebarOpen(false)
                  router.push('/authenticated/dashboard')
                }}
                className="w-full text-[12px] bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 pr-6 appearance-none text-gray-700 cursor-pointer"
              >
                {rolesDisponibles.map((r) => (
                  <option key={r} value={r}>{ROLES[r]}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Navegación */}
        <nav className="flex-1 py-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 px-4 pt-3 pb-1">
            {ROLES[rolActivo as Rol] ?? rolActivo}
          </p>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors',
                  isActive
                    ? 'bg-gray-50 text-gray-900 font-medium border-l-2 border-brand-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Usuario + logout */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
          <button
            onClick={() => {
              setSidebarOpen(false)
              logout()
            }}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-red-500 mt-1.5 transition-colors"
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
