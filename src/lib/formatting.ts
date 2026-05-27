// src/lib/formatting.ts
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string, pattern = 'dd MMM yyyy'): string {
  return format(parseISO(dateStr), pattern, { locale: es })
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "dd MMM yyyy 'a las' HH:mm", { locale: es })
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}
