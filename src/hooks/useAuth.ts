// src/hooks/useAuth.ts
'use client'

import { useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Rol } from '@/types'

const getValidRol = (user: any, preferredRol: Rol | null): Rol => {
  const defaultRol = (user.user_metadata?.rol as Rol) ?? 'vendedor'
  const isUserAdmin = user.user_metadata?.rol === 'admin' || (user.user_metadata?.roles as Rol[] | undefined)?.includes('admin')
  
  if (isUserAdmin) {
    const validRoles: Rol[] = ['admin', 'almacenista', 'vendedor', 'repartidor']
    if (preferredRol && validRoles.includes(preferredRol)) {
      return preferredRol
    }
    return defaultRol
  }
  
  const allowedRoles = (user.user_metadata?.roles as Rol[] | undefined) ?? [defaultRol]
  if (preferredRol && allowedRoles.includes(preferredRol)) {
    return preferredRol
  }
  return defaultRol
}

export const useAuth = () => {
  const { user, rolActivo, loading, setUser, setRolActivo, setLoading, logout } = useAuthStore()

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const currentActive = useAuthStore.getState().rolActivo
        const validRol = getValidRol(session.user, currentActive)
        setRolActivo(validRol)
      }
      setLoading(false)
    })

    // Listener de cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        const currentActive = useAuthStore.getState().rolActivo
        const validRol = getValidRol(session.user, currentActive)
        setRolActivo(validRol)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { user, rolActivo, loading, setRolActivo, logout }
}

