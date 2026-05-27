// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShirtIcon, Package, BarChart3, Users, Loader2, Eye, EyeOff, ChevronRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { cn } from '@/lib/utils'
import type { Rol } from '@/types'

type Tab = 'login' | 'register'

const ROLES_OPCIONES: { value: Rol; label: string; desc: string }[] = [
  { value: 'vendedor',    label: 'Vendedor',     desc: 'Gestión de órdenes, pagos y corte diario' },
  { value: 'almacenista', label: 'Almacenista',  desc: 'Control de inventario, lotes y entradas' },
  { value: 'admin',       label: 'Admin',        desc: 'Visibilidad total y cortes generales' },
]

export default function HomePage() {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre]     = useState('')
  const [rol, setRol]           = useState<Rol>('vendedor')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  // Si ya tiene sesión, redirige directo al dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace('/authenticated/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
      router.replace('/authenticated/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(msg.includes('Invalid') ? 'Credenciales incorrectas. Verifica tu email y contraseña.' : msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            rol,
            roles: [rol],
          },
        },
      })
      if (err) throw err
      setSuccess('¡Cuenta creada! Revisa tu email para confirmar la cuenta, luego inicia sesión.')
      setTab('login')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear cuenta'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-[#3C3489] to-[#534AB7] flex">

      {/* ─── Panel izquierdo: branding ─────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white relative overflow-hidden">

        {/* Orbs decorativos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-brand-400/20 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <ShirtIcon size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-white">Pantalones Pro</p>
            <p className="text-[11px] text-white/50">Sistema de gestión de ventas</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestión de ventas,<br />
            <span className="text-brand-200">rápida y precisa.</span>
          </h1>
          <p className="text-[15px] text-white/70 leading-relaxed mb-10 max-w-sm">
            Controla tu inventario, procesa ventas y genera cortes diarios con total precisión —desde cualquier dispositivo.
          </p>

          {/* Feature cards */}
          <div className="flex flex-col gap-3">
            {[
              { icon: Package,    title: 'Inventario PEPS', desc: 'Lotes con control de primeras entradas, primeras salidas' },
              { icon: BarChart3,  title: 'Reportes en tiempo real', desc: 'Cortes individuales y generales al instante' },
              { icon: Users,      title: 'Múltiples roles', desc: 'Admin, almacenista y vendedor en un solo sistema' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 bg-white/8 backdrop-blur rounded-xl p-3.5 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">{title}</p>
                  <p className="text-[12px] text-white/55 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-white/30 relative z-10">© 2025 Pantalones Pro · v1.0</p>
      </div>

      {/* ─── Panel derecho: formulario ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#f8f8f7]">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <ShirtIcon size={16} className="text-white" />
            </div>
            <span className="text-[15px] font-semibold text-gray-900">Pantalones Pro</span>
          </div>

          <h2 className="text-[22px] font-semibold text-gray-900 mb-1">
            {tab === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta nueva'}
          </h2>
          <p className="text-[13px] text-gray-500 mb-6">
            {tab === 'login' ? 'Ingresa tus credenciales para continuar.' : 'Completa los datos para acceder al sistema.'}
          </p>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess('') }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-[13px] font-medium transition-all duration-200',
                  tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Success */}
          {success && (
            <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
              <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-green-700">{success}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          {/* ── FORM ── */}
          <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="flex flex-col gap-4">

            {tab === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-gray-600">Nombre completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                  placeholder="Ej: Juan Pérez"
                  className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-gray-600">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-gray-600">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 pr-10 text-[13px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Selector de rol (solo en registro) */}
            {tab === 'register' && (
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-gray-600">Rol en el sistema</label>
                <div className="flex flex-col gap-2">
                  {ROLES_OPCIONES.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRol(value)}
                      className={cn(
                        'flex items-center gap-3 border rounded-xl px-3.5 py-3 text-left transition-all duration-150',
                        rol === value
                          ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
                        rol === value ? 'border-brand-600 bg-brand-600' : 'border-gray-300 bg-white'
                      )} />
                      <div>
                        <p className={cn('text-[13px] font-medium', rol === value ? 'text-brand-800' : 'text-gray-800')}>{label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-800 text-white text-[14px] font-medium transition-colors duration-200 disabled:opacity-60"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Procesando...</>
                : tab === 'login'
                  ? <><ChevronRight size={16} /> Ingresar al sistema</>
                  : <><CheckCircle2 size={16} /> Crear mi cuenta</>
              }
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-gray-400">
            {tab === 'login'
              ? <>¿No tienes cuenta? <button onClick={() => setTab('register')} className="text-brand-600 hover:text-brand-800 font-medium">Regístrate aquí</button></>
              : <>¿Ya tienes cuenta? <button onClick={() => setTab('login')} className="text-brand-600 hover:text-brand-800 font-medium">Inicia sesión</button></>
            }
          </p>
        </div>
      </div>
    </div>
  )
}
