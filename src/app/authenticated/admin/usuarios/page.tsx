// src/app/authenticated/admin/usuarios/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, UserPlus, Edit3, Shield, CheckCircle2,
  AlertCircle, Loader2, X, Eye, EyeOff, RefreshCw, Trash2,
} from 'lucide-react'
import { adminService, AdminUser } from '@/services/admin'
import { cn } from '@/lib/utils'
import { ROLES } from '@/lib/constants'
import type { Rol } from '@/types'

const ALL_ROLES: Rol[] = ['admin', 'almacenista', 'vendedor', 'repartidor']

const ROL_STYLES: Record<Rol, string> = {
  admin:       'bg-purple-50 text-purple-700 border-purple-200',
  almacenista: 'bg-amber-50 text-amber-700 border-amber-200',
  vendedor:    'bg-green-50 text-green-700 border-green-200',
  repartidor:  'bg-blue-50 text-blue-700 border-blue-200',
}

const ROL_ACTIVE: Record<Rol, string> = {
  admin:       'bg-purple-600 text-white border-purple-600',
  almacenista: 'bg-amber-500 text-white border-amber-500',
  vendedor:    'bg-green-600 text-white border-green-600',
  repartidor:  'bg-blue-600 text-white border-blue-600',
}

function RolBadge({ rol, small }: { rol: Rol; small?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 border rounded-full font-medium',
      small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
      ROL_STYLES[rol]
    )}>
      <Shield size={small ? 9 : 10} />
      {ROLES[rol]}
    </span>
  )
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios]   = useState<AdminUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const [modal, setModal]         = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)

  const [formNombre, setFormNombre]         = useState('')
  const [formEmail, setFormEmail]           = useState('')
  const [formPassword, setFormPassword]     = useState('')
  const [formShowPwd, setFormShowPwd]       = useState(false)
  const [formRolPrimario, setFormRolPrimario] = useState<Rol>('vendedor')
  const [formRoles, setFormRoles]           = useState<Rol[]>(['vendedor'])
  const [modalError, setModalError]         = useState('')

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUsuarios(await adminService.getUsers())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsuarios() }, [fetchUsuarios])

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }

  const openCreate = () => {
    setFormNombre(''); setFormEmail(''); setFormPassword('')
    setFormRolPrimario('vendedor'); setFormRoles(['vendedor'])
    setEditTarget(null); setModalError(''); setModal('create')
  }

  const openEdit = (u: AdminUser) => {
    setFormNombre(u.nombre); setFormEmail(u.email); setFormPassword('')
    setFormRolPrimario(u.rol)
    setFormRoles(u.roles.length > 0 ? u.roles : [u.rol])
    setEditTarget(u); setModalError(''); setModal('edit')
  }

  const closeModal = () => { setModal(null); setEditTarget(null); setModalError('') }

  const toggleRol = (r: Rol) => {
    setFormRoles((prev) => {
      if (prev.includes(r)) {
        if (prev.length === 1) return prev
        const next = prev.filter((x) => x !== r)
        if (formRolPrimario === r) setFormRolPrimario(next[0])
        return next
      }
      return [...prev, r]
    })
  }

  const changePrimario = (r: Rol) => {
    setFormRolPrimario(r)
    setFormRoles((prev) => prev.includes(r) ? prev : [...prev, r])
  }

  const handleSave = async () => {
    if (!formNombre.trim() || !formEmail.trim()) { setModalError('Nombre y email son obligatorios'); return }
    setSaving(true); setModalError('')
    try {
      if (modal === 'create') {
        if (!formPassword.trim()) { setModalError('Ingresa una contraseña'); setSaving(false); return }
        await adminService.createUser({ email: formEmail.trim(), nombre: formNombre.trim(), rol: formRolPrimario, roles: formRoles, password: formPassword })
        showSuccess(`Usuario "${formNombre}" creado correctamente`)
      } else if (modal === 'edit' && editTarget) {
        await adminService.updateUser({ 
          id: editTarget.id, 
          email: formEmail.trim(), 
          nombre: formNombre.trim(), 
          rol: formRolPrimario, 
          roles: formRoles, 
          password: formPassword 
        })
        showSuccess(`Usuario "${formNombre}" actualizado correctamente`)
      }
      closeModal()
      await fetchUsuarios()
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editTarget) return
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${editTarget.nombre || editTarget.email}"? Esta acción no se puede deshacer.`)) return
    
    setDeleting(true)
    setModalError('')
    try {
      await adminService.deleteUser(editTarget.id)
      showSuccess(`Usuario eliminado correctamente`)
      closeModal()
      await fetchUsuarios()
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : 'Error al eliminar usuario')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">{usuarios.length} usuarios registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsuarios}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-xs"
          >
            <UserPlus size={13} /> Nuevo usuario
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-[13px] px-4 py-3 rounded-xl">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-xl">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {/* Encabezado */}
          <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            {['Nombre / Email', 'Rol principal', 'Todos los roles', ''].map((h) => (
              <span key={h} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</span>
            ))}
          </div>

          {usuarios.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-[14px] font-medium text-gray-500">No hay usuarios registrados</p>
            </div>
          ) : (
            usuarios.map((u, idx) => (
              <div
                key={u.id}
                className={cn(
                  'grid grid-cols-[1fr_1fr_1.5fr_auto] items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors',
                  idx < usuarios.length - 1 && 'border-b border-gray-100'
                )}
              >
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{u.nombre || '(Sin nombre)'}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{u.email}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">Desde {new Date(u.created_at).toLocaleDateString('es-MX')}</p>
                </div>

                <div>
                  <RolBadge rol={u.rol} />
                </div>

                <div className="flex flex-wrap gap-1">
                  {u.roles.map((r) => <RolBadge key={r} rol={r} small />)}
                </div>

                <button
                  onClick={() => openEdit(u)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
                >
                  <Edit3 size={12} /> Editar
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── MODAL ──────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">
                  {modal === 'create' ? 'Crear nuevo usuario' : 'Editar usuario'}
                </h2>
                {editTarget && (
                  <p className="text-[12px] text-gray-400 mt-0.5">{editTarget.email}</p>
                )}
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Error del modal */}
              {modalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] px-3 py-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertCircle size={13} /> {modalError}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="text-[12px] font-medium text-gray-500 block mb-1">Nombre completo *</label>
                <input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej. María García"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[12px] font-medium text-gray-500 block mb-1">Correo electrónico *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-[12px] font-medium text-gray-500 block mb-1">
                  Contraseña {modal === 'edit' && <span className="font-normal text-gray-400">(dejar en blanco para no cambiar)</span>}
                </label>
                <div className="relative">
                  <input
                    type={formShowPwd ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={modal === 'edit' ? "Nueva contraseña..." : "Mínimo 6 caracteres"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {formShowPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Roles */}
              <div>
                <p className="text-[12px] font-medium text-gray-500 mb-2">Roles asignados (puede tener varios)</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map((r) => {
                    const active = formRoles.includes(r)
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRol(r)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-medium border transition-all',
                          active ? ROL_ACTIVE[r] : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <Shield size={12} /> {ROLES[r]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Rol primario (si tiene más de 1) */}
              {formRoles.length > 1 && (
                <div>
                  <p className="text-[12px] font-medium text-gray-500 mb-2">Rol principal al iniciar sesión</p>
                  <div className="flex flex-wrap gap-2">
                    {formRoles.map((r) => {
                      const isPrimary = formRolPrimario === r
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => changePrimario(r)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-all',
                            isPrimary ? ROL_ACTIVE[r] : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          )}
                        >
                          {isPrimary && <CheckCircle2 size={12} />}
                          {ROLES[r]}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">El usuario puede cambiar de rol desde el menú lateral.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div>
                {modal === 'edit' && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors disabled:opacity-50"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deleting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || deleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {saving ? 'Guardando...' : modal === 'create' ? 'Crear usuario' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
