import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../lib/useAsync'
import { getClientes, moradaCurta } from '../data/queries'
import { PageState, StatusDot } from '../components/ui'
import { ModalNovoJardim } from '../components/ModalNovoJardim'
import { dataCurta } from '../lib/format'
import type { ClienteComJardins } from '../types/db'

function JardimLinha({ j }: { j: ClienteComJardins['jardins'][number] }) {
  const porFaturar = j.itensPorFaturarCount ?? 0
  return (
    <Link
      to={`/jardim/${j.id}`}
      className="flex items-center gap-3 py-1.5 text-[13px] hover:opacity-80"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{moradaCurta(j) || 'Jardim'}</span>
          {j.volta?.nome && (
            <span className="rounded bg-[#f0f0ee] px-1.5 py-0.5 text-[10.5px] font-medium text-muted">
              {j.volta.nome}
            </span>
          )}
          {porFaturar > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded bg-[#fef7ee] border border-[#fbd38d]/70 px-1.5 py-0.5 text-[10.5px] font-medium text-[#b7791f]"
              title={`${porFaturar} material(ais) por faturar neste jardim`}
            >
              <span>🧾</span>
              <span>{porFaturar} p/ faturar</span>
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-muted">
          {j.frequencia === 'quinzenal' ? 'Quinzenal' : 'Semanal'}
        </div>
      </div>
      <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[11.5px] text-muted">
        <StatusDot estado={j.status} />
        {dataCurta(j.proxima_manutencao)}
      </span>
    </Link>
  )
}

export default function Clientes() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useAsync(getClientes, [refreshKey])
  const [pesquisa, setPesquisa] = useState('')
  const [filtroVolta, setFiltroVolta] = useState('')
  const [apenasPorFaturar, setApenasPorFaturar] = useState(false)
  const [modalNovoAberto, setModalNovoAberto] = useState(false)

  // Total de jardins com materiais por faturar
  const totalJardinsComPendentes = useMemo(() => {
    if (!data) return 0
    let count = 0
    for (const c of data) {
      for (const j of c.jardins ?? []) {
        if ((j.itensPorFaturarCount ?? 0) > 0) count++
      }
    }
    return count
  }, [data])

  // Lista de voltas disponíveis recolhidas dos jardins dos clientes
  const voltasDisponiveis = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { id: string; nome: string; count: number }>()
    for (const c of data) {
      for (const j of c.jardins ?? []) {
        if (j.volta?.id && j.volta?.nome) {
          const entry = map.get(j.volta.id) ?? { id: j.volta.id, nome: j.volta.nome, count: 0 }
          entry.count++
          map.set(j.volta.id, entry)
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  }, [data])

  const clientesFiltrados = useMemo(() => {
    if (!data) return []
    const termo = pesquisa.trim().toLowerCase()

    return data
      .map((c) => {
        let jardins = c.jardins ?? []
        if (filtroVolta) {
          jardins = jardins.filter((j) => j.volta_id === filtroVolta)
        }
        if (apenasPorFaturar) {
          jardins = jardins.filter((j) => (j.itensPorFaturarCount ?? 0) > 0)
        }
        if (termo) {
          const nomeMatch = c.nome.toLowerCase().includes(termo)
          if (!nomeMatch) {
            jardins = jardins.filter(
              (j) =>
                (j.morada_rua && j.morada_rua.toLowerCase().includes(termo)) ||
                (j.morada_cidade && j.morada_cidade.toLowerCase().includes(termo)) ||
                (j.volta?.nome && j.volta.nome.toLowerCase().includes(termo)),
            )
          }
        }
        return {
          ...c,
          jardinsExibidos: jardins,
        }
      })
      .filter((c) => {
        if (filtroVolta || apenasPorFaturar) {
          return c.jardinsExibidos.length > 0
        }
        if (termo) {
          return c.nome.toLowerCase().includes(termo) || c.jardinsExibidos.length > 0
        }
        return true
      })
  }, [data, pesquisa, filtroVolta, apenasPorFaturar])

  return (
    <div className="p-5 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[260px] max-w-2xl">
          <div className="relative min-w-[180px] flex-1">
            <input
              type="text"
              placeholder="Procurar cliente ou morada…"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] placeholder:text-faint focus:border-ink focus:outline-none"
            />
            {pesquisa && (
              <button
                type="button"
                onClick={() => setPesquisa('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={filtroVolta}
            onChange={(e) => setFiltroVolta(e.target.value)}
            className="h-9 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
          >
            <option value="">Todas as voltas</option>
            {voltasDisponiveis.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome} ({v.count})
              </option>
            ))}
          </select>

          {totalJardinsComPendentes > 0 && (
            <button
              type="button"
              onClick={() => setApenasPorFaturar(!apenasPorFaturar)}
              className={
                'h-9 whitespace-nowrap rounded-lg border px-2.5 text-[12px] font-medium transition-all ' +
                (apenasPorFaturar
                  ? 'border-[#fbd38d] bg-[#fef7ee] text-[#b7791f] shadow-2xs'
                  : 'border-line bg-surface text-muted hover:text-ink')
              }
              title="Filtrar apenas jardins com materiais pendentes de faturação"
            >
              🧾 Por faturar ({totalJardinsComPendentes})
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setModalNovoAberto(true)}
          className="h-9 whitespace-nowrap rounded-lg bg-ink px-3.5 text-[12.5px] font-medium text-white hover:bg-ink-soft"
        >
          + Novo cliente
        </button>
      </div>

      <PageState
        loading={loading}
        error={error}
        empty={clientesFiltrados.length === 0}
        emptyLabel={
          pesquisa || filtroVolta
            ? 'Nenhum cliente ou jardim encontrado para estes filtros.'
            : 'Ainda não há clientes.'
        }
      >
        <div className="flex flex-col gap-2.5">
          {clientesFiltrados.map((c) => {
            const jardins = c.jardinsExibidos ?? []
            return (
              <div
                key={c.id}
                className="rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div className="mb-1.5 flex items-center gap-2 text-[11.5px] text-muted">
                  <span className="font-medium text-ink">{c.nome}</span>
                  {jardins.length > 1 && <span>· {jardins.length} jardins</span>}
                </div>
                <div className="divide-y divide-line-soft">
                  {jardins.length === 0 && (
                    <div className="py-1.5 text-[12.5px] text-faint">
                      Sem jardins nesta volta.
                    </div>
                  )}
                  {jardins.map((j) => (
                    <JardimLinha key={j.id} j={j} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </PageState>

      <ModalNovoJardim
        aberto={modalNovoAberto}
        onFechar={() => setModalNovoAberto(false)}
        onJardimCriado={(_novoId) => {
          setModalNovoAberto(false)
          setRefreshKey((r) => r + 1)
        }}
      />
    </div>
  )
}
