'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, ShirtIcon } from 'lucide-react'
import { Sidebar } from '@/components/shared/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useUiStore } from '@/store/uiStore'
import { ROLES } from '@/lib/constants'
import type { Rol } from '@/types'

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, rolActivo } = useAuth()
  const router = useRouter()
  const { setSidebarOpen, toggleSidebar } = useUiStore()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarOpen])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
          <span className="text-[13px] text-gray-400">Verificando sesión...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 text-gray-900">
      {/* Header móvil */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none"
            aria-label="Menú de navegación"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-1.5">
            <ShirtIcon size={16} className="text-brand-600" />
            <span className="text-[14px] font-semibold text-gray-900">Pantalones Pro</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rolActivo && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              {ROLES[rolActivo as Rol] ?? rolActivo}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

