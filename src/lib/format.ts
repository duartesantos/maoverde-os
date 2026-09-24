// Pequenos helpers de formatação em português.

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

/** "2026-09-08" -> "08 set" */
export function dataCurta(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`
}

/** "2026-09-08T14:32:00Z" -> "08 set às 14:32" */
export function dataHora(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const hora = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dataCurta(iso)} às ${hora}:${min}`
}

/** Dias de atraso (positivo) ou até (negativo) face a hoje. */
export function diasAte(iso: string | null): number | null {
  if (!iso) return null
  const alvo = new Date(iso)
  if (Number.isNaN(alvo.getTime())) return null
  const hoje = new Date()
  const ms = alvo.setHours(0, 0, 0, 0) - hoje.setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}

export function euros(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

// ---- Datas / semana ----

export const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** Data local em ISO (YYYY-MM-DD), sem deslocamento de fuso. */
export function isoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Segunda-feira da semana da data dada. */
export function inicioSemana(d: Date): Date {
  const x = new Date(d)
  const off = (x.getDay() + 6) % 7 // 0 = segunda
  x.setDate(x.getDate() - off)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDias(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** "1 – 7 set" para a semana que começa em `inicio`. */
export function labelSemana(inicio: Date): string {
  const fim = addDias(inicio, 6)
  const dia = (d: Date) => String(d.getDate())
  return `${dia(inicio)} – ${dataCurta(isoLocal(fim))}`
}
