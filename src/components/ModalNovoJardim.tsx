import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  criarJardim,
  getClientesOpcoes,
  getVoltas,
  type CriarJardimInput,
} from '../data/queries'
import { PageState } from './ui'
import { SeletorVoltaInline } from './SeletorVoltaInline'
import type { Frequencia, Volta } from '../types/db'

interface ModalNovoJardimProps {
  aberto: boolean
  onFechar: () => void
  onJardimCriado: (novoJardimId: string) => void
  clientePredefinidoId?: string
}

export function ModalNovoJardim({
  aberto,
  onFechar,
  onJardimCriado,
  clientePredefinidoId,
}: ModalNovoJardimProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aGravar, setAGravar] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  // Dados remotos
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [voltas, setVoltas] = useState<Volta[]>([])

  // Formulário: Cliente
  const [modoCliente, setModoCliente] = useState<'existente' | 'novo'>('existente')
  const [clienteId, setClienteId] = useState<string>('')
  const [pesquisaCliente, setPesquisaCliente] = useState<string>('')
  const [novoClienteNome, setNovoClienteNome] = useState<string>('')
  const [novoClienteContacto, setNovoClienteContacto] = useState<string>('')

  // Formulário: Jardim
  const [voltaId, setVoltaId] = useState<string | null>(null)
  const [moradaRua, setMoradaRua] = useState<string>('')
  const [moradaCidade, setMoradaCidade] = useState<string>('')
  const [moradaCodigoPostal, setMoradaCodigoPostal] = useState<string>('')
  const [frequencia, setFrequencia] = useState<Frequencia>('semanal')
  const [notas, setNotas] = useState<string>('')

  // Formulário: Plano Rotativo
  const [temPlanoRotativo, setTemPlanoRotativo] = useState<boolean>(false)
  const [etapas, setEtapas] = useState<{ ordem: number; instrucoes: string }[]>([
    { ordem: 1, instrucoes: '' },
    { ordem: 2, instrucoes: '' },
  ])

  // Carregar listas ao abrir
  useEffect(() => {
    if (!aberto) return

    let ativo = true
    setLoading(true)
    setError(null)
    setErroForm(null)

    Promise.all([getClientesOpcoes(), getVoltas()])
      .then(([cliList, voltaList]) => {
        if (!ativo) return
        setClientes(cliList)
        setVoltas(voltaList)

        if (clientePredefinidoId) {
          setClienteId(clientePredefinidoId)
          setModoCliente('existente')
        } else if (cliList.length > 0) {
          setClienteId(cliList[0].id)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (!ativo) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
        setLoading(false)
      })

    return () => {
      ativo = false
    }
  }, [aberto, clientePredefinidoId])

  // Lista de clientes filtrada para o select ou autocomplete
  const clientesFiltrados = useMemo(() => {
    if (!pesquisaCliente.trim()) return clientes
    const termo = pesquisaCliente.toLowerCase()
    return clientes.filter((c) => c.nome.toLowerCase().includes(termo))
  }, [clientes, pesquisaCliente])

  // Adicionar / remover etapas
  function adicionarEtapa() {
    setEtapas((prev) => [...prev, { ordem: prev.length + 1, instrucoes: '' }])
  }

  function removerEtapa(index: number) {
    if (etapas.length <= 1) return
    setEtapas((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index)
      return filtered.map((e, idx) => ({ ...e, ordem: idx + 1 }))
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

    if (modoCliente === 'novo') {
      if (!novoClienteNome.trim()) {
        setErroForm('O nome do novo cliente é obrigatório.')
        return
      }
    } else {
      if (!clienteId) {
        setErroForm('Seleciona um cliente existente.')
        return
      }
    }

    if (temPlanoRotativo) {
      const etapasPreenchidas = etapas.filter((et) => et.instrucoes.trim().length > 0)
      if (etapasPreenchidas.length === 0) {
        setErroForm('Adiciona pelo menos uma instrução para o plano rotativo ou desativa o plano.')
        return
      }
    }

    setAGravar(true)
    try {
      const input: CriarJardimInput = {
        clienteModo: modoCliente,
        clienteId: modoCliente === 'existente' ? clienteId : undefined,
        novoClienteNome: modoCliente === 'novo' ? novoClienteNome.trim() : undefined,
        novoClienteContacto: modoCliente === 'novo' ? novoClienteContacto.trim() : undefined,
        voltaId,
        morada_rua: moradaRua.trim() || null,
        morada_cidade: moradaCidade.trim() || null,
        morada_codigo_postal: moradaCodigoPostal.trim() || null,
        frequencia,
        notas: notas.trim() || null,
        tem_plano_rotativo: temPlanoRotativo,
        etapas: temPlanoRotativo
          ? etapas.filter((et) => et.instrucoes.trim().length > 0)
          : undefined,
      }

      const novoId = await criarJardim(input)
      onJardimCriado(novoId)
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao criar jardim.')
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
            <h2 className="text-base font-semibold text-ink">Novo jardim</h2>
            <p className="text-[12px] text-muted">
              {clientePredefinidoId
                ? 'Adicionar novo jardim ao cliente'
                : 'Regista um novo cliente ou associa a um já existente'}
            </p>
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
            {/* Bloco 1: Seleção / Criação de Cliente */}
            <div className="rounded-xl border border-line bg-[#fcfcfb] p-3.5 space-y-3">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                1. Cliente
              </span>

              {!clientePredefinidoId ? (
                <div className="flex rounded-lg border border-line bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setModoCliente('existente')}
                    className={
                      'flex-1 rounded-md py-1 text-[12.5px] font-medium transition-all ' +
                      (modoCliente === 'existente'
                        ? 'bg-ink text-white shadow-xs'
                        : 'text-muted hover:text-ink')
                    }
                  >
                    Cliente existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCliente('novo')}
                    className={
                      'flex-1 rounded-md py-1 text-[12.5px] font-medium transition-all ' +
                      (modoCliente === 'novo'
                        ? 'bg-ink text-white shadow-xs'
                        : 'text-muted hover:text-ink')
                    }
                  >
                    + Novo cliente
                  </button>
                </div>
              ) : (
                <div className="text-[13px] font-medium text-ink">
                  {clientes.find((c) => c.id === clientePredefinidoId)?.nome ?? 'Cliente selecionado'}
                </div>
              )}

              {modoCliente === 'existente' && !clientePredefinidoId && (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquisar cliente…"
                      value={pesquisaCliente}
                      onChange={(e) => setPesquisaCliente(e.target.value)}
                      className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] placeholder:text-faint focus:border-ink focus:outline-none"
                    />
                    {pesquisaCliente && (
                      <button
                        type="button"
                        onClick={() => setPesquisaCliente('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted hover:text-ink"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
                  >
                    {clientesFiltrados.length === 0 ? (
                      <option value="">Nenhum cliente encontrado</option>
                    ) : (
                      clientesFiltrados.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {modoCliente === 'novo' && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                      Nome do cliente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex.: António Ferreira"
                      value={novoClienteNome}
                      onChange={(e) => setNovoClienteNome(e.target.value)}
                      className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-ink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                      Contacto telefónico (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: 912 345 678"
                      value={novoClienteContacto}
                      onChange={(e) => setNovoClienteContacto(e.target.value)}
                      className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bloco 2: Localização e Volta */}
            <div className="rounded-xl border border-line bg-[#fcfcfb] p-3.5 space-y-3">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                2. Localização e Volta
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

            {/* Bloco 3: Frequência e Notas */}
            <div className="rounded-xl border border-line bg-[#fcfcfb] p-3.5 space-y-3">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                3. Serviço e Notas
              </span>

              <div>
                <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                  Frequência de manutenção
                </label>
                <div className="flex gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                    <input
                      type="radio"
                      name="frequencia"
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
                      name="frequencia"
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

            {/* Bloco 4: Plano Rotativo */}
            <div className="rounded-xl border border-line bg-[#fcfcfb] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                    4. Plano Rotativo
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
                <div className="space-y-2.5 pt-1">
                  {etapas.map((etapa, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-semibold text-ink">
                        {etapa.ordem}
                      </span>
                      <input
                        type="text"
                        placeholder={`Instruções da Etapa ${etapa.ordem} (ex.: Corte de relva)`}
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
                    className="mt-1 text-[11.5px] font-medium text-ink-soft hover:text-ink underline"
                  >
                    + Adicionar etapa
                  </button>
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
                {aGravar ? 'A criar jardim…' : 'Criar jardim'}
              </button>
            </div>
          </form>
        </PageState>
      </div>
    </div>
  )
}
