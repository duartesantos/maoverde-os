import { useEffect, useState, type FormEvent } from 'react'
import {
  atualizarJardim,
  getVoltas,
  type AtualizarJardimInput,
} from '../data/queries'
import { PageState } from './ui'
import { SeletorVoltaInline } from './SeletorVoltaInline'
import type { EtapaRotativa, Frequencia, Volta } from '../types/db'

export interface DadosEdicaoJardim {
  id: string
  clienteNome: string
  morada_rua: string | null
  morada_cidade: string | null
  morada_codigo_postal: string | null
  volta_id: string | null
  frequencia: Frequencia
  notas: string | null
  tem_plano_rotativo: boolean
  etapa_atual_id: string | null
  etapas: EtapaRotativa[]
}

interface ModalEditarJardimProps {
  aberto: boolean
  onFechar: () => void
  onGuardado: () => void
  dados: DadosEdicaoJardim
}

export function ModalEditarJardim({
  aberto,
  onFechar,
  onGuardado,
  dados,
}: ModalEditarJardimProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aGravar, setAGravar] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  // Voltas
  const [voltas, setVoltas] = useState<Volta[]>([])

  // Campos do Formulário
  const [voltaId, setVoltaId] = useState<string | null>(dados.volta_id)
  const [moradaRua, setMoradaRua] = useState<string>(dados.morada_rua ?? '')
  const [moradaCidade, setMoradaCidade] = useState<string>(dados.morada_cidade ?? '')
  const [moradaCodigoPostal, setMoradaCodigoPostal] = useState<string>(
    dados.morada_codigo_postal ?? '',
  )
  const [frequencia, setFrequencia] = useState<Frequencia>(dados.frequencia)
  const [notas, setNotas] = useState<string>(dados.notas ?? '')

  // Plano Rotativo
  const [temPlanoRotativo, setTemPlanoRotativo] = useState<boolean>(
    dados.tem_plano_rotativo,
  )
  const [etapas, setEtapas] = useState<{ ordem: number; instrucoes: string }[]>(() => {
    if (dados.etapas && dados.etapas.length > 0) {
      return dados.etapas.map((e) => ({
        ordem: e.ordem,
        instrucoes: e.instrucoes ?? '',
      }))
    }
    return [
      { ordem: 1, instrucoes: '' },
      { ordem: 2, instrucoes: '' },
    ]
  })

  // Etapa atual (pela ordem 1, 2, ...)
  const etapaAtualOrdemInicial = () => {
    if (dados.etapa_atual_id && dados.etapas) {
      const encontrada = dados.etapas.find((e) => e.id === dados.etapa_atual_id)
      if (encontrada) return encontrada.ordem
    }
    return 1
  }

  const [etapaAtualOrdem, setEtapaAtualOrdem] = useState<number>(etapaAtualOrdemInicial)

  // Sincroniza dados sempre que abrir ou dados mudarem
  useEffect(() => {
    if (!aberto) return

    let ativo = true
    setLoading(true)
    setError(null)
    setErroForm(null)

    // Reset aos campos locais
    setVoltaId(dados.volta_id)
    setMoradaRua(dados.morada_rua ?? '')
    setMoradaCidade(dados.morada_cidade ?? '')
    setMoradaCodigoPostal(dados.morada_codigo_postal ?? '')
    setFrequencia(dados.frequencia)
    setNotas(dados.notas ?? '')
    setTemPlanoRotativo(dados.tem_plano_rotativo)

    if (dados.etapas && dados.etapas.length > 0) {
      setEtapas(
        dados.etapas.map((e) => ({
          ordem: e.ordem,
          instrucoes: e.instrucoes ?? '',
        })),
      )
    } else {
      setEtapas([
        { ordem: 1, instrucoes: '' },
        { ordem: 2, instrucoes: '' },
      ])
    }
    setEtapaAtualOrdem(etapaAtualOrdemInicial())

    getVoltas()
      .then((vList) => {
        if (!ativo) return
        setVoltas(vList)
        setLoading(false)
      })
      .catch((err) => {
        if (!ativo) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar voltas.')
        setLoading(false)
      })

    return () => {
      ativo = false
    }
  }, [aberto, dados])

  // Gestão de etapas
  function adicionarEtapa() {
    setEtapas((prev) => [...prev, { ordem: prev.length + 1, instrucoes: '' }])
  }

  function removerEtapa(index: number) {
    if (etapas.length <= 1) return
    setEtapas((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index)
      const reordenadas = filtered.map((e, idx) => ({ ...e, ordem: idx + 1 }))
      if (etapaAtualOrdem > reordenadas.length) {
        setEtapaAtualOrdem(reordenadas.length)
      }
      return reordenadas
    })
  }

  function atualizarEtapa(index: number, instrucoes: string) {
    setEtapas((prev) =>
      prev.map((e, idx) => (idx === index ? { ...e, instrucoes } : e)),
    )
  }

  async function submeter(e: FormEvent) {
    e.preventDefault()
    setErroForm(null)

    if (temPlanoRotativo) {
      const validas = etapas.filter((et) => et.instrucoes.trim().length > 0)
      if (validas.length === 0) {
        setErroForm(
          'Adiciona pelo menos uma instrução para o plano rotativo ou desativa o plano.',
        )
        return
      }
    }

    setAGravar(true)
    try {
      const input: AtualizarJardimInput = {
        morada_rua: moradaRua.trim() || null,
        morada_cidade: moradaCidade.trim() || null,
        morada_codigo_postal: moradaCodigoPostal.trim() || null,
        volta_id: voltaId,
        frequencia,
        notas: notas.trim() || null,
        tem_plano_rotativo: temPlanoRotativo,
        etapas: temPlanoRotativo
          ? etapas.filter((et) => et.instrucoes.trim().length > 0)
          : undefined,
        etapa_atual_ordem: temPlanoRotativo ? etapaAtualOrdem : null,
      }

      await atualizarJardim(dados.id, input)
      onGuardado()
      onFechar()
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao atualizar jardim.')
      setAGravar(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Editar jardim</h2>
            <p className="text-[12px] text-muted">{dados.clienteNome}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1 text-muted hover:bg-page hover:text-ink"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <PageState loading={loading} error={error}>
          <form onSubmit={submeter} className="flex flex-col gap-4 overflow-y-auto p-5">
            {/* Bloco 1: Localização e Volta */}
            <div className="rounded-xl border border-line bg-[#fcfcfb] p-3.5 space-y-3">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                1. Localização e Volta
              </span>

              <SeletorVoltaInline
                voltas={voltas}
                voltaId={voltaId}
                onChange={setVoltaId}
                onNovaVolta={(v) => {
                  setVoltas((antigas) =>
                    [...antigas, v].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
                  )
                }}
              />

              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                    Rua / Morada (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex.: Rua das Amendoeiras, 14 ou Quinta do Vale"
                    value={moradaRua}
                    onChange={(e) => setMoradaRua(e.target.value)}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-ink focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                      Localidade
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: Óbidos"
                      value={moradaCidade}
                      onChange={(e) => setMoradaCidade(e.target.value)}
                      className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-ink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                      Código Postal (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: 2510-001"
                      value={moradaCodigoPostal}
                      onChange={(e) => setMoradaCodigoPostal(e.target.value)}
                      className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Frequência e Notas */}
            <div className="rounded-xl border border-line bg-[#fcfcfb] p-3.5 space-y-3">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                2. Serviço e Notas
              </span>

              <div>
                <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                  Frequência de manutenção
                </label>
                <div className="flex gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                    <input
                      type="radio"
                      name="frequencia_edit"
                      value="semanal"
                      checked={frequencia === 'semanal'}
                      onChange={() => setFrequencia('semanal')}
                      className="accent-ink"
                    />
                    Semanal (+7 dias)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                    <input
                      type="radio"
                      name="frequencia_edit"
                      value="quinzenal"
                      checked={frequencia === 'quinzenal'}
                      onChange={() => setFrequencia('quinzenal')}
                      className="accent-ink"
                    />
                    Quinzenal (+14 dias)
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                  Notas de acesso ou cliente (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex.: Portão lateral com código 1234, cão no quintal…"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface p-2.5 text-[13px] placeholder:text-faint focus:border-ink focus:outline-none"
                />
              </div>
            </div>

            {/* Bloco 3: Plano Rotativo */}
            <div className="rounded-xl border border-line bg-[#fcfcfb] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                    3. Plano Rotativo
                  </span>
                  <p className="text-[11.5px] text-muted">
                    Ciclo de trabalhos alternados a cada visita
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={temPlanoRotativo}
                    onChange={(e) => setTemPlanoRotativo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 rounded-full bg-line-soft peer peer-checked:bg-ink peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>

              {temPlanoRotativo && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-2">
                    {etapas.map((etapa, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-semibold text-ink">
                          {etapa.ordem}
                        </span>
                        <input
                          type="text"
                          placeholder={`Instruções da Etapa ${etapa.ordem}`}
                          value={etapa.instrucoes}
                          onChange={(e) => atualizarEtapa(idx, e.target.value)}
                          className="h-8 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] placeholder:text-faint focus:border-ink focus:outline-none"
                        />
                        {etapas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removerEtapa(idx)}
                            className="p-1 text-muted hover:text-atr"
                            title="Remover etapa"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={adicionarEtapa}
                      className="text-[11.5px] font-medium text-ink-soft hover:text-ink underline"
                    >
                      + Adicionar etapa
                    </button>
                  </div>

                  {/* Seletor da Etapa em Curso */}
                  <div className="border-t border-line-soft pt-2.5">
                    <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                      Etapa atualmente em curso na próxima visita:
                    </label>
                    <select
                      value={etapaAtualOrdem}
                      onChange={(e) => setEtapaAtualOrdem(Number(e.target.value))}
                      className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                    >
                      {etapas.map((etapa) => (
                        <option key={etapa.ordem} value={etapa.ordem}>
                          Etapa {etapa.ordem}
                          {etapa.instrucoes ? ` — ${etapa.instrucoes}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Mensagem de Erro */}
            {erroForm && (
              <div className="rounded-lg border border-atr/30 bg-atr/10 px-3 py-2 text-[12px] text-atr">
                {erroForm}
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={aGravar}
                onClick={onFechar}
                className="h-9 rounded-lg border border-line px-4 text-[12.5px] font-medium text-muted hover:bg-page hover:text-ink disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={aGravar}
                className="h-9 rounded-lg bg-ink px-5 text-[12.5px] font-medium text-white hover:bg-ink-soft disabled:opacity-50"
              >
                {aGravar ? 'A guardar…' : 'Guardar alterações'}
              </button>
            </div>
          </form>
        </PageState>
      </div>
    </div>
  )
}
