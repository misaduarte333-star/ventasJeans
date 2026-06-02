// src/services/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Usar auth-helpers para manejar la sesión correctamente con cookies
// Esto evita errores 403 por tokens expirados y limpia la sesión al hacer signOut
export const supabase = createClientComponentClient()
