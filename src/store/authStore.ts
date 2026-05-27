// src/store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import type { Rol } from '@/types'
import { supabase } from '@/services/supabase'

interface AuthState {
  user:      User | null
  rolActivo: Rol | null
  loading:   boolean
  setUser:       (user: User | null) => void
  setRolActivo:  (rol: Rol) => void
  setLoading:    (v: boolean) => void
  logout:        () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:      null,
      rolActivo: null,
      loading:   true,

      setUser:      (user) => set({ user }),
      setRolActivo: (rolActivo) => set({ rolActivo }),
      setLoading:   (loading) => set({ loading }),

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, rolActivo: null })
      },
    }),
    {
      name: 'auth-store',
      partialize: (s) => ({ rolActivo: s.rolActivo }),
    }
  )
)
