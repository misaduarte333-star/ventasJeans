// src/services/admin.ts
import { supabase } from './supabase'
import type { Rol, OrdenVenta } from '@/types'

export interface AdminUser {
  id: string
  email: string
  nombre: string
  rol: Rol
  roles: Rol[]
  created_at: string
}

export const adminService = {
  /**
   * Obtiene la lista de todos los usuarios registrados en el sistema
   */
  async getUsers(): Promise<AdminUser[]> {
    const { data, error } = await supabase.rpc('admin_get_users')
    if (error) throw error
    return (data as AdminUser[]) ?? []
  },

  /**
   * Crea un nuevo usuario directamente en el sistema con roles y contraseña pre-cifrada
   */
  async createUser(form: Omit<AdminUser, 'id' | 'created_at'> & { password?: string }): Promise<string> {
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: form.email,
      p_password: form.password ?? '123456', // default fallback
      p_nombre: form.nombre,
      p_rol: form.rol,
      p_roles: form.roles,
    })
    if (error) throw error
    return data as string
  },

  /**
   * Actualiza los datos de un usuario existente
   */
  async updateUser(form: Pick<AdminUser, 'id' | 'nombre' | 'rol' | 'roles' | 'email'> & { password?: string }): Promise<void> {
    const { error } = await supabase.rpc('admin_update_user', {
      p_user_id: form.id,
      p_email: form.email,
      p_password: form.password || '',
      p_nombre: form.nombre,
      p_rol: form.rol,
      p_roles: form.roles,
    })
    if (error) throw error
  },

  /**
   * Elimina un usuario por completo
   */
  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.rpc('admin_delete_user', {
      p_user_id: id,
    })
    if (error) throw error
  },

  /**
   * Obtiene todas las órdenes del sistema con su detalle de items, artículos y pagos
   */
  async listAllOrdenes(): Promise<OrdenVenta[]> {
    const { data, error } = await supabase
      .from('ordenes_venta')
      .select('*, items:ordenes_venta_items(*, articulo:articulos(*)), pago:pagos(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as OrdenVenta[]) ?? []
  },
}
