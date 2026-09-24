import type { ReactNode } from 'react'
import type { EstadoJardim } from '../types/db'

export function StatusDot({ estado }: { estado: EstadoJardim }) {
  const color =
    estado === 'atrasado'
      ? 'var(--color-atr)'
      : estado === 'urgente'
        ? 'var(--color-urg)'
        : 'var(--color-ok)'
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: color }}
      title={estado}
    />
  )
}

export function Badge({
  children,
  dark = false,
}: {
  children: ReactNode
  dark?: boolean
}) {
  return (
    <span
      className={
        'whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ' +
        (dark
          ? 'border-ink bg-ink text-white'
          : 'border-line text-muted')
      }
    >
      {children}
    </span>
  )
}

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={
        'overflow-hidden rounded-xl border border-line bg-surface ' + className
      }
    >
      {title && (
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
          <h2 className="text-[13px] font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function PageState({
  loading,
  error,
  empty,
  emptyLabel = 'Sem dados.',
  children,
}: {
  loading: boolean
  error?: string | null
  empty?: boolean
  emptyLabel?: string
  children: ReactNode
}) {
  if (loading)
    return <div className="p-8 text-center text-sm text-muted">A carregar…</div>
  if (error)
    return (
      <div className="p-8 text-center text-sm text-atr">
        Não foi possível carregar. {error}
      </div>
    )
  if (empty)
    return <div className="p-8 text-center text-sm text-muted">{emptyLabel}</div>
  return <>{children}</>
}
