import { useState } from 'react'
import { criarVolta } from '../data/queries'
import type { Volta } from '../types/db'

interface SeletorVoltaInlineProps {
  voltas: Pick<Volta, 'id' | 'nome'>[]
  voltaId: string | null
  onChange: (id: string | null) => void
  onNovaVolta?: (novaVolta: Volta) => void
  label?: string
  disabled?: boolean
}

export function SeletorVoltaInline({
  voltas,
  voltaId,
  onChange,
  onNovaVolta,
  label = 'Volta',
  disabled = false,
}: SeletorVoltaInlineProps) {
  const [modoCriacao, setModoCriacao] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [aCriar, setACriar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleCriar() {
    const nomeLimpo = novoNome.trim()
    if (!nomeLimpo) return

    setACriar(true)
    setErro(null)
    try {
      const v = await criarVolta(nomeLimpo)
      onNovaVolta?.(v)
      onChange(v.id)
      setModoCriacao(false)
      setNovoNome('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar volta.')
    } finally {
      setACriar(false)
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[11.5px] font-medium text-ink-soft">
          {modoCriacao ? 'Criar nova volta' : label}
        </label>
        {!modoCriacao ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setModoCriacao(true)}
            className="text-[11px] text-muted hover:text-ink underline disabled:opacity-50"
          >
            + Nova volta
          </button>
        ) : (
          <button
            type="button"
            disabled={aCriar}
            onClick={() => {
              setModoCriacao(false)
              setNovoNome('')
              setErro(null)
            }}
            className="text-[11px] text-muted hover:text-ink"
          >
            Cancelar
          </button>
        )}
      </div>

      {!modoCriacao ? (
        <select
          value={voltaId ?? ''}
          onChange={(e) => onChange(e.target.value ? e.target.value : null)}
          disabled={disabled}
          className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-ink focus:outline-none disabled:opacity-50"
        >
          <option value="">Sem volta associada</option>
          {voltas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nome}
            </option>
          ))}
        </select>
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Nome da volta (ex.: Rota Sul)"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCriar()
                } else if (e.key === 'Escape') {
                  setModoCriacao(false)
                  setNovoNome('')
                  setErro(null)
                }
              }}
              className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-ink focus:outline-none"
            />
            <button
              type="button"
              disabled={aCriar || !novoNome.trim()}
              onClick={handleCriar}
              className="h-9 whitespace-nowrap rounded-lg bg-ink px-3 text-[12.5px] font-medium text-white hover:bg-ink-soft disabled:opacity-50"
            >
              {aCriar ? 'A criar…' : 'Criar'}
            </button>
          </div>
          {erro && <p className="mt-1 text-[11px] text-atr">{erro}</p>}
        </div>
      )}
    </div>
  )
}
