import { useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAsync } from '../lib/useAsync'
import {
  atualizarDataManutencao,
  atualizarManutencao,
  criarManutencao,
  eliminarManutencao,
  getManutencoes,
  getOpcoesAgendamento,
  type ManutencaoSemana,
  type OpcoesAgendamento,
} from '../data/queries'
import { Badge, PageState } from '../components/ui'
import { AvisoObservacoesAnteriores } from '../components/AvisoObservacoesAnteriores'
import {
  DIAS_SEMANA,
  addDias,
  inicioSemana,
  isoLocal,
  labelSemana,
} from '../lib/format'
import type { EstadoManutencao, MaterialExtraInput } from '../types/db'

const ESTADO_LABEL: Record<string, string> = {
  agendada: 'Agendada',
  em_progresso: 'Em curso',
  concluida: 'Concluída',
  reagendada: 'Agendada',
}

const ESTADOS_DISPONIVEIS: { valor: EstadoManutencao; label: string }[] = [
  { valor: 'agendada', label: 'Agendada' },
  { valor: 'em_progresso', label: 'Em curso' },
  { valor: 'concluida', label: 'Concluída' },
]

function equipaNomes(m: ManutencaoSemana): string {
  return m.equipa.map((e) => e.colaborador?.nome).filter(Boolean).join(', ') || '—'
}

interface SubgrupoVolta {
  chave: string
  voltaNome: string
  itens: ManutencaoSemana[]
}

interface GrupoVeiculoManutencao {
  chave: string
  veiculoId: string | null
  veiculoNome: string
  temVeiculo: boolean
  equipaTexto: string
  itens: ManutencaoSemana[]
  subgruposVolta: SubgrupoVolta[]
}

function agruparPorVeiculo(lista: ManutencaoSemana[]): GrupoVeiculoManutencao[] {
  const grupos: GrupoVeiculoManutencao[] = []
  const map = new Map<string, GrupoVeiculoManutencao>()

  for (const m of lista) {
    const vId = m.veiculo?.id ?? '__sem_veiculo__'
    let g = map.get(vId)
    if (!g) {
      const temVeiculo = Boolean(m.veiculo?.id)
      g = {
        chave: vId,
        veiculoId: m.veiculo?.id ?? null,
        veiculoNome: m.veiculo?.nome?.trim() || 'Sem carrinha',
        temVeiculo,
        equipaTexto: '',
        itens: [],
        subgruposVolta: [],
      }
      map.set(vId, g)
      grupos.push(g)
    }
    g.itens.push(m)
  }

  for (const g of grupos) {
    const nomesEquipa = new Set<string>()
    for (const m of g.itens) {
      for (const eq of m.equipa) {
        if (eq.colaborador?.nome) {
          nomesEquipa.add(eq.colaborador.nome.trim())
        }
      }
    }
    g.equipaTexto = Array.from(nomesEquipa).join(', ')

    // Agrupar e ordenar itens da carrinha por Volta
    const voltasMap = new Map<string, SubgrupoVolta>()
    for (const m of g.itens) {
      const voltaKey = m.jardim?.volta?.id ?? '__sem_volta__'
      const voltaNome = m.jardim?.volta?.nome?.trim() || 'Sem volta definida'
      let sg = voltasMap.get(voltaKey)
      if (!sg) {
        sg = {
          chave: voltaKey,
          voltaNome,
          itens: [],
        }
        voltasMap.set(voltaKey, sg)
      }
      sg.itens.push(m)
    }
    g.subgruposVolta = Array.from(voltasMap.values())
  }

  return grupos
}

function Cartao({
  m,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  equipaGrupo,
}: {
  m: ManutencaoSemana
  onClick: () => void
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  isDragging?: boolean
  equipaGrupo?: string
}) {
  const equipaCard = equipaNomes(m)
  // Só mostra a equipa no cartão se for diferente da equipa indicada no cabeçalho do grupo
  const mostrarEquipaNoCard = equipaCard !== '—' && equipaCard !== equipaGrupo
  const isConcluida = m.status === 'concluida'
  const nomeVolta = m.jardim?.volta?.nome?.trim()

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={
        isConcluida
          ? 'Manutenção concluída (clica para ver detalhes)'
          : 'Clica para ver/editar ou arrasta para mudar de dia'
      }
      className={
        'group cursor-pointer rounded-lg border p-2 text-left transition-all active:cursor-grabbing ' +
        (isConcluida
          ? 'border-[#bcd7c0] bg-[#f0f7f1] hover:border-[#96c19c] hover:shadow-xs'
          : 'border-line bg-surface hover:border-[#cfcfc9] hover:shadow-xs') +
        (isDragging ? ' opacity-30 border-dashed border-ink' : '')
      }
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-medium leading-tight text-ink truncate">
            {m.jardim?.cliente?.nome ?? 'Jardim'}
          </div>
          {/* Indicação da Volta no lugar da morada */}
          {nomeVolta && (
            <div className="mt-1 flex items-center">
              <span
                className={
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-medium border truncate max-w-full ' +
                  (isConcluida
                    ? 'bg-[#e2ede4] text-[#2f5e37] border-[#bad6bf]'
                    : 'bg-[#f4f4f1] text-[#4a4a45] border-line/60')
                }
                title={`Volta: ${nomeVolta}`}
              >
                <span
                  className={
                    'h-1.5 w-1.5 rounded-full shrink-0 ' +
                    (isConcluida ? 'bg-[#3c6b44]' : 'bg-[#7a7a72]')
                  }
                />
                <span className="truncate">{nomeVolta}</span>
              </span>
            </div>
          )}
        </div>
        {isConcluida && (
          <span
            className="shrink-0 text-[11px] font-bold text-[#3c6b44]"
            title="Concluída"
          >
            ✓
          </span>
        )}
      </div>

      {mostrarEquipaNoCard && (
        <div className="mt-1 flex items-center gap-1 text-[9.5px] text-muted truncate">
          <span>👥</span>
          <span className="truncate">{equipaCard}</span>
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        {isConcluida ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#bad6bf] bg-[#e1efe3] px-2 py-0.5 text-[10px] font-medium text-[#2f5e37]">
            Concluída
          </span>
        ) : (
          <Badge dark={m.status === 'em_progresso'}>
            {ESTADO_LABEL[m.status] ?? m.status}
          </Badge>
        )}
        <div className="flex items-center gap-1.5">
          {m.materiais_extra && m.materiais_extra.length > 0 && (
            <span
              className={
                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] ' +
                (isConcluida
                  ? 'bg-[#e2ede4] text-[#2f5e37]'
                  : 'bg-[#f0f0ee] text-ink')
              }
              title={`Materiais extra a levar: ${m.materiais_extra.map((x) => (x.quantidade ? `${x.quantidade}× ${x.descricao_material}` : x.descricao_material)).join(', ')}`}
            >
              📦 {m.materiais_extra.length}
            </span>
          )}
          {m.observacoes_planeamento && (
            <span
              className="text-[10px] text-muted"
              title={m.observacoes_planeamento}
            >
              💬
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Planeamento() {
  const hoje = new Date()
  const [semana, setSemana] = useState(() => inicioSemana(hoje))
  const [refresh, setRefresh] = useState(0)
  const [modalNovo, setModalNovo] = useState(false)
  const [manutencaoAEditar, setManutencaoAEditar] = useState<ManutencaoSemana | null>(null)

  // Estado para arrastar e soltar
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [dragOverDia, setDragOverDia] = useState<string | null>(null)

  const inicioISO = isoLocal(semana)
  const fimISO = isoLocal(addDias(semana, 6))
  const { data, loading, error } = useAsync(
    () => getManutencoes(inicioISO, fimISO),
    [inicioISO, fimISO, refresh],
  )

  const dias = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((i) => addDias(semana, i)), [semana])
  const porDia = useMemo(() => {
    const m = new Map<string, ManutencaoSemana[]>()
    for (const mm of data ?? []) {
      const arr = m.get(mm.data) ?? []
      arr.push(mm)
      m.set(mm.data, arr)
    }

    // Ordenar as manutenções de cada dia por veículo para agrupar o trabalho de cada equipa
    for (const lista of m.values()) {
      lista.sort((a, b) => {
        const vA = a.veiculo?.nome?.trim() ?? ''
        const vB = b.veiculo?.nome?.trim() ?? ''

        // 1. Manutenções com veículo atribuído surgem primeiro, agrupadas por nome do veículo
        if (vA && !vB) return -1
        if (!vA && vB) return 1
        if (vA && vB) {
          const compVeiculo = vA.localeCompare(vB, 'pt', { numeric: true, sensitivity: 'base' })
          if (compVeiculo !== 0) return compVeiculo
        }

        // 2. Agrupamento por Volta dentro da carrinha
        const voltA = a.jardim?.volta?.nome?.trim() ?? ''
        const voltB = b.jardim?.volta?.nome?.trim() ?? ''
        if (voltA && !voltB) return -1
        if (!voltA && voltB) return 1
        if (voltA && voltB) {
          const compVolta = voltA.localeCompare(voltB, 'pt', { sensitivity: 'base' })
          if (compVolta !== 0) return compVolta
        }

        // 3. Dentro da mesma volta, ordena por nome do cliente/jardim
        const cliA = a.jardim?.cliente?.nome?.trim() ?? ''
        const cliB = b.jardim?.cliente?.nome?.trim() ?? ''
        return cliA.localeCompare(cliB, 'pt', { sensitivity: 'base' })
      })
    }

    return m
  }, [data])

  const hojeISO = isoLocal(hoje)
  const [diaSelIdx, setDiaSelIdx] = useState(() => {
    const idx = dias.findIndex((d) => isoLocal(d) === hojeISO)
    return idx >= 0 ? idx : 0
  })

  async function handleMudarData(id: string, novaData: string) {
    const atual = (data ?? []).find((m) => m.id === id)
    if (atual && atual.data === novaData) {
      return
    }

    try {
      await atualizarDataManutencao(id, novaData)
      setRefresh((r) => r + 1)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível remarcar a manutenção.')
    }
  }

  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      {/* Barra de topo */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSemana(addDias(semana, -7))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft hover:bg-[#f9f9f8]"
            title="Semana anterior"
          >
            ‹
          </button>
          <b className="text-[15px] font-semibold">{labelSemana(semana)}</b>
          <button
            onClick={() => setSemana(addDias(semana, 7))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft hover:bg-[#f9f9f8]"
            title="Semana seguinte"
          >
            ›
          </button>
          <button
            onClick={() => setSemana(inicioSemana(new Date()))}
            className="ml-1 h-8 rounded-lg border border-line bg-surface px-3 text-[12.5px] text-ink-soft hover:bg-[#f9f9f8]"
          >
            Hoje
          </button>
        </div>
        <button
          onClick={() => setModalNovo(true)}
          className="h-9 rounded-lg bg-ink px-3.5 text-[12.5px] font-medium text-white hover:bg-ink-soft"
        >
          + Nova manutenção
        </button>
      </div>

      <PageState loading={loading} error={error}>
        {/* Grelha semanal — computador */}
        <div className="hidden min-h-0 flex-1 grid-cols-7 gap-2 lg:grid">
          {dias.map((d, i) => {
            const iso = isoLocal(d)
            const lista = porDia.get(iso) ?? []
            const eHoje = iso === hojeISO
            const isDragTarget = dragOverDia === iso

            return (
              <div
                key={iso}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDragEnter={() => setDragOverDia(iso)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverDia((curr) => (curr === iso ? null : curr))
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  setDragOverDia(null)
                  const id = e.dataTransfer.getData('text/plain')
                  if (id) {
                    await handleMudarData(id, iso)
                  }
                }}
                className={
                  'flex min-h-0 flex-col rounded-lg border bg-surface transition-all ' +
                  (isDragTarget
                    ? 'border-ink bg-[#f6f6f4] ring-2 ring-ink/20'
                    : eHoje
                      ? 'border-[#c9c9c4] ring-1 ring-[#c9c9c4]'
                      : 'border-line')
                }
              >
                <div className="flex items-baseline justify-between border-b border-line-soft px-2.5 py-2">
                  <b className="text-[12px] font-semibold">{DIAS_SEMANA[i]}</b>
                  <span className="font-mono text-[11px] text-faint">{d.getDate()}</span>
                </div>
                <div className="flex flex-col gap-2 overflow-auto p-1.5">
                  {agruparPorVeiculo(lista).map((grupo) => (
                    <div
                      key={grupo.chave}
                      className="flex flex-col gap-2 rounded-lg border border-line/90 bg-[#f7f7f5] p-2 shadow-2xs"
                    >
                      {/* Cabeçalho da carrinha na caixa */}
                      <div className="flex items-center justify-between border-b border-line/70 pb-1.5">
                        <div className="min-w-0 pr-1">
                          <div className="flex items-center gap-1.5 font-semibold text-ink text-[11px] leading-tight">
                            <span>{grupo.temVeiculo ? '🚚' : '⚪'}</span>
                            <span className="truncate">{grupo.veiculoNome}</span>
                          </div>
                          {grupo.equipaTexto && (
                            <div
                              className="mt-0.5 text-[9.5px] text-muted truncate"
                              title={`Equipa: ${grupo.equipaTexto}`}
                            >
                              👥 {grupo.equipaTexto}
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[9px] font-mono text-muted">
                          {grupo.itens.length} {grupo.itens.length === 1 ? 'jardim' : 'jardins'}
                        </span>
                      </div>

                      {/* Lista de manutenções dentro da caixa da carrinha (organizada por volta) */}
                      <div className="flex flex-col gap-2">
                        {grupo.subgruposVolta.map((sub) => (
                          <div key={sub.chave} className="flex flex-col gap-1.5">
                            {grupo.subgruposVolta.length > 1 && (
                              <div className="flex items-center justify-between px-0.5 pt-0.5 text-[9.5px] font-semibold text-muted">
                                <span className="uppercase tracking-wider truncate">📍 {sub.voltaNome}</span>
                                <span className="font-mono text-[9px] text-faint shrink-0">({sub.itens.length})</span>
                              </div>
                            )}
                            {sub.itens.map((m) => (
                              <Cartao
                                key={m.id}
                                m={m}
                                equipaGrupo={grupo.equipaTexto}
                                onClick={() => setManutencaoAEditar(m)}
                                isDragging={arrastandoId === m.id}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', m.id)
                                  e.dataTransfer.effectAllowed = 'move'
                                  setArrastandoId(m.id)
                                }}
                                onDragEnd={() => {
                                  setArrastandoId(null)
                                  setDragOverDia(null)
                                }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {lista.length === 0 && (
                    <div className="py-4 text-center text-[11px] text-faint">
                      {isDragTarget ? 'Larga aqui' : ''}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Vista por dia — telemóvel */}
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">
          <div className="mb-3 flex gap-1.5">
            {dias.map((d, i) => {
              const iso = isoLocal(d)
              const ativo = i === diaSelIdx
              const n = (porDia.get(iso) ?? []).length
              return (
                <button
                  key={iso}
                  onClick={() => setDiaSelIdx(i)}
                  className={
                    'flex-1 rounded-lg border py-2 text-center ' +
                    (ativo ? 'border-ink bg-ink text-white' : 'border-line bg-surface')
                  }
                >
                  <span className={'block text-[10px] ' + (ativo ? 'text-[#9a9a92]' : 'text-faint')}>
                    {DIAS_SEMANA[i]}
                  </span>
                  <b className="block text-[15px] font-semibold">{d.getDate()}</b>
                  <span
                    className={
                      'mx-auto mt-1 block h-1 w-1 rounded-full ' +
                      (n > 0 ? (ativo ? 'bg-[#9a9a92]' : 'bg-[#c4c4bd]') : 'bg-transparent')
                    }
                  />
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-3 overflow-auto pb-4">
            {agruparPorVeiculo(porDia.get(isoLocal(dias[diaSelIdx])) ?? []).map((grupo) => (
              <div
                key={grupo.chave}
                className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-2.5"
              >
                <div className="flex items-center justify-between border-b border-line-soft pb-1.5">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      <span>{grupo.temVeiculo ? '🚚' : '⚪'}</span>
                      <span className="truncate">{grupo.veiculoNome}</span>
                    </div>
                    {grupo.equipaTexto && (
                      <div className="mt-0.5 text-[11px] text-muted truncate">
                        👥 {grupo.equipaTexto}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-line bg-[#f8f8f7] px-2 py-0.5 text-[10.5px] font-mono text-muted">
                    {grupo.itens.length} {grupo.itens.length === 1 ? 'jardim' : 'jardins'}
                  </span>
                </div>
                {/* Lista de manutenções da carrinha (organizada por volta) */}
                <div className="flex flex-col gap-2.5">
                  {grupo.subgruposVolta.map((sub) => (
                    <div key={sub.chave} className="flex flex-col gap-1.5">
                      {grupo.subgruposVolta.length > 1 && (
                        <div className="flex items-center justify-between px-0.5 pt-0.5 text-[10.5px] font-semibold text-muted">
                          <span className="uppercase tracking-wider truncate">📍 {sub.voltaNome}</span>
                          <span className="font-mono text-[10px] text-faint shrink-0">({sub.itens.length})</span>
                        </div>
                      )}
                      {sub.itens.map((m) => (
                        <Cartao
                          key={m.id}
                          m={m}
                          equipaGrupo={grupo.equipaTexto}
                          onClick={() => setManutencaoAEditar(m)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(porDia.get(isoLocal(dias[diaSelIdx])) ?? []).length === 0 && (
              <div className="py-8 text-center text-sm text-muted">Nada agendado.</div>
            )}
          </div>
        </div>
      </PageState>

      {/* Modal Nova Manutenção */}
      {modalNovo && (
        <ModalNovaManutencao
          dataInicial={isoLocal(dias[diaSelIdx] ?? hoje)}
          onFechar={() => setModalNovo(false)}
          onCriado={() => {
            setModalNovo(false)
            setRefresh((r) => r + 1)
          }}
        />
      )}

      {/* Modal Editar Manutenção */}
      {manutencaoAEditar && (
        <ModalEditarManutencao
          manutencao={manutencaoAEditar}
          onFechar={() => setManutencaoAEditar(null)}
          onAtualizado={() => {
            setManutencaoAEditar(null)
            setRefresh((r) => r + 1)
          }}
        />
      )}
    </div>
  )
}

function PainelKitsVeiculo({ veiculo }: { veiculo: OpcoesAgendamento['veiculos'][0] | undefined }) {
  const [kitsAbertos, setKitsAbertos] = useState<Record<string, boolean>>({})
  if (!veiculo) return null

  const todosAbertos = veiculo.kits.length > 0 && veiculo.kits.every((k) => kitsAbertos[k.id])

  function alternarTodos() {
    const novo: Record<string, boolean> = {}
    veiculo?.kits.forEach((k) => {
      novo[k.id] = !todosAbertos
    })
    setKitsAbertos(novo)
  }

  function alternarKit(id: string) {
    setKitsAbertos((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="rounded-lg border border-line-soft bg-page p-3 text-[12px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink flex items-center gap-1.5">
          🚚 Kits a bordo ({veiculo.nome}):
        </span>
        {veiculo.kits.length > 0 && (
          <button
            type="button"
            onClick={alternarTodos}
            className="text-[11px] text-ink font-medium hover:underline cursor-pointer"
          >
            {todosAbertos ? 'Ocultar ferramentas' : 'Ver ferramentas'}
          </button>
        )}
      </div>

      {veiculo.kits.length === 0 ? (
        <p className="mt-1 text-[11.5px] text-muted italic">
          Esta carrinha ainda não tem kits atribuídos (pode associar no ecrã de Veículos & Kits).
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {veiculo.kits.map((k) => {
            const aberto = Boolean(kitsAbertos[k.id])
            return (
              <div
                key={k.id}
                className="rounded border border-line bg-surface p-2 text-[11.5px] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => alternarKit(k.id)}
                  className="w-full flex items-center justify-between text-left cursor-pointer group"
                >
                  <b className="font-medium text-ink group-hover:underline truncate">{k.nome}</b>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10.5px] text-muted font-mono">
                      {k.itens.length} {k.itens.length === 1 ? 'ferramenta' : 'ferramentas'}
                    </span>
                    {k.itens.length > 0 && (
                      <span className="text-[10px] font-medium text-ink border border-line-soft bg-page px-1.5 py-0.5 rounded group-hover:border-ink/40">
                        {aberto ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </button>

                {aberto && (
                  <div className="mt-2 border-t border-line-soft pt-1.5">
                    {k.itens.length === 0 ? (
                      <p className="text-[11px] text-muted italic">
                        Sem ferramentas listadas neste kit.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1 text-[11px]">
                        {k.itens.map((it, idx) => (
                          <li
                            key={it.id ?? idx}
                            className="flex items-center justify-between gap-2 py-0.5"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-ink/35 shrink-0" />
                              <span className="truncate text-ink font-medium">
                                {it.descricao_material}
                              </span>
                            </span>
                            {it.quantidade !== null && it.quantidade !== undefined && (
                              <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded bg-page border border-line-soft text-muted font-medium">
                                {it.quantidade} un.
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SecaoMateriaisExtra({
  materiais,
  onChange,
}: {
  materiais: MaterialExtraInput[]
  onChange: (novos: MaterialExtraInput[]) => void
}) {
  function adicionarLinha() {
    onChange([...materiais, { descricao_material: '', quantidade: null }])
  }

  function atualizar(idx: number, campo: keyof MaterialExtraInput, valor: any) {
    const copy = [...materiais]
    copy[idx] = { ...copy[idx], [campo]: valor }
    onChange(copy)
  }

  function remover(idx: number) {
    onChange(materiais.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[12px] font-medium text-ink-soft">
          Materiais Extra a Levar (opcional)
        </label>
        <button
          type="button"
          onClick={adicionarLinha}
          className="text-[11.5px] font-medium text-ink hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>+</span> Adicionar material
        </button>
      </div>
      <p className="text-[11px] text-muted mb-2 leading-relaxed">
        Ferramentas ou insumos adicionais necessários para este trabalho além do kit habitual da carrinha (ex: Escadote 5m, Motosserra, Adubo azul).
      </p>

      {materiais.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-3 text-center text-[11.5px] text-muted">
          Nenhum material extra adicionado.{' '}
          <button
            type="button"
            onClick={adicionarLinha}
            className="font-medium text-ink hover:underline cursor-pointer"
          >
            + Adicionar um
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {materiais.map((me, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={me.descricao_material}
                onChange={(e) => atualizar(idx, 'descricao_material', e.target.value)}
                placeholder="Descrição do material (ex: Escadote 5m)"
                className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] focus:border-ink focus:outline-none"
              />
              <input
                type="number"
                min="0"
                step="any"
                value={me.quantidade ?? ''}
                onChange={(e) => {
                  const val = e.target.value.trim()
                  atualizar(idx, 'quantidade', val === '' ? null : Number(val))
                }}
                placeholder="Qtd (opc.)"
                className="h-9 w-24 rounded-lg border border-line bg-surface px-2 text-center text-[12.5px] focus:border-ink focus:outline-none"
              />
              <button
                type="button"
                onClick={() => remover(idx)}
                title="Remover material extra"
                className="flex h-9 w-8 items-center justify-center rounded text-muted hover:text-atr hover:bg-atr/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModalNovaManutencao({
  dataInicial,
  onFechar,
  onCriado,
}: {
  dataInicial: string
  onFechar: () => void
  onCriado: () => void
}) {
  const { colaborador } = useAuth()
  const { data: opts, loading, error } = useAsync(getOpcoesAgendamento, [])
  const [jardimId, setJardimId] = useState('')
  const [voltaFiltro, setVoltaFiltro] = useState('')
  const [buscaJardim, setBuscaJardim] = useState('')
  const [dataM, setDataM] = useState(dataInicial)
  const [veiculoId, setVeiculoId] = useState('')
  const [equipa, setEquipa] = useState<string[]>([])
  const [materiaisExtra, setMateriaisExtra] = useState<MaterialExtraInput[]>([])
  const [obs, setObs] = useState('')
  const [aGravar, setAGravar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Jardins filtrados pela volta selecionada e texto de pesquisa
  const jardinsFiltrados = useMemo(() => {
    if (!opts) return []
    return opts.jardins.filter((j) => {
      if (voltaFiltro && j.volta_id !== voltaFiltro) return false
      if (buscaJardim.trim()) {
        const termo = buscaJardim.toLowerCase()
        return (
          j.nome.toLowerCase().includes(termo) ||
          (j.morada_rua && j.morada_rua.toLowerCase().includes(termo))
        )
      }
      return true
    })
  }, [opts, voltaFiltro, buscaJardim])

  // Agrupamento de jardins por volta (para quando não há filtro de volta ativa)
  const gruposPorVolta = useMemo(() => {
    if (!opts) return []
    const mapa = new Map<string, { id: string; nome: string; jardins: typeof opts.jardins }>()
    for (const v of opts.voltas) {
      mapa.set(v.id, { id: v.id, nome: v.nome, jardins: [] })
    }
    const semVolta: typeof opts.jardins = []

    for (const j of jardinsFiltrados) {
      if (j.volta_id && mapa.has(j.volta_id)) {
        mapa.get(j.volta_id)!.jardins.push(j)
      } else {
        semVolta.push(j)
      }
    }

    const resultado = Array.from(mapa.values()).filter((g) => g.jardins.length > 0)
    if (semVolta.length > 0) {
      resultado.push({ id: '__sem_volta', nome: 'Sem volta associada', jardins: semVolta })
    }
    return resultado
  }, [opts, jardinsFiltrados])

  const jardimSelecionado = useMemo(() => {
    return opts?.jardins.find((j) => j.id === jardimId)
  }, [opts, jardimId])

  const veiculoSelecionado = useMemo(() => {
    return opts?.veiculos.find((v) => v.id === veiculoId)
  }, [opts, veiculoId])

  function toggle(id: string) {
    setEquipa((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))
  }

  async function submeter(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!jardimId) {
      setErro('Escolhe um jardim.')
      return
    }
    setAGravar(true)
    try {
      await criarManutencao({
        jardim_id: jardimId,
        data: dataM,
        veiculo_id: veiculoId || null,
        criado_por: colaborador?.id ?? null,
        observacoes_planeamento: obs || null,
        colaboradorIds: equipa,
        materiaisExtra: materiaisExtra.filter((m) => m.descricao_material.trim().length > 0),
      })
      onCriado()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar.')
      setAGravar(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">Nova manutenção</h2>
          <button onClick={onFechar} className="text-muted">
            ✕
          </button>
        </div>
        <PageState loading={loading} error={error}>
          {opts && (
            <form onSubmit={submeter} className="flex flex-col gap-4 overflow-auto p-5">
              {/* Seleção de Jardim com filtro por Volta e busca rápida */}
              <div className="rounded-xl border border-line bg-[#fcfcfb] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                    Seleção do Jardim
                  </span>
                  {(voltaFiltro || buscaJardim) && (
                    <button
                      type="button"
                      onClick={() => {
                        setVoltaFiltro('')
                        setBuscaJardim('')
                      }}
                      className="text-[11px] text-muted hover:text-ink underline"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {/* 1. Filtrar por Volta */}
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                      1. Filtrar por Volta
                    </label>
                    <select
                      value={voltaFiltro}
                      onChange={(e) => {
                        const novaVolta = e.target.value
                        setVoltaFiltro(novaVolta)
                        if (novaVolta && jardimId) {
                          const j = opts.jardins.find((x) => x.id === jardimId)
                          if (j && j.volta_id !== novaVolta) {
                            setJardimId('')
                          }
                        }
                      }}
                      className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-[13px] focus:border-ink focus:outline-none"
                    >
                      <option value="">Todas as voltas ({opts.jardins.length})</option>
                      {opts.voltas.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nome} ({v.totalJardins})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Pesquisa rápida opcional */}
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                      Pesquisa rápida
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Cliente ou rua…"
                        value={buscaJardim}
                        onChange={(e) => setBuscaJardim(e.target.value)}
                        className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-[13px] focus:border-ink focus:outline-none"
                      />
                      {buscaJardim && (
                        <button
                          type="button"
                          onClick={() => setBuscaJardim('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted hover:text-ink"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Escolher Jardim */}
                <div>
                  <label className="mb-1 block text-[11.5px] font-medium text-ink-soft">
                    2. Escolher Jardim <span className="text-atr">*</span>
                  </label>
                  <select
                    value={jardimId}
                    onChange={(e) => {
                      const id = e.target.value
                      setJardimId(id)
                      const j = opts.jardins.find((x) => x.id === id)
                      if (j?.volta_id && !voltaFiltro) {
                        setVoltaFiltro(j.volta_id)
                      }
                    }}
                    required
                    className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[13px] font-medium focus:border-ink focus:outline-none"
                  >
                    <option value="">
                      {jardinsFiltrados.length === 0
                        ? 'Nenhum jardim encontrado'
                        : `Escolher jardim (${jardinsFiltrados.length} disponíveis)…`}
                    </option>
                    {voltaFiltro || buscaJardim ? (
                      jardinsFiltrados.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nome}
                        </option>
                      ))
                    ) : (
                      gruposPorVolta.map((g) => (
                        <optgroup key={g.id} label={`${g.nome} (${g.jardins.length})`}>
                          {g.jardins.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.nome}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>

                  {/* Indicador visual do jardim selecionado */}
                  {jardimSelecionado && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                      <span className="inline-flex items-center gap-1 rounded bg-[#f0f0ee] px-2 py-0.5 font-medium text-ink">
                        📍 Volta: {jardimSelecionado.volta_nome || 'Sem volta associada'}
                      </span>
                      {jardimSelecionado.morada_rua && (
                        <span className="truncate text-ink-soft">
                          {jardimSelecionado.morada_rua}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Aviso de observação anterior do jardim */}
              {jardimId && (
                <AvisoObservacoesAnteriores
                  jardimId={jardimId}
                  onCopiarParaObs={(texto) => {
                    setObs((prev) => (prev.trim() ? `${prev}\n\n[Nota anterior]: ${texto}` : texto))
                  }}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                    Data
                  </label>
                  <input
                    type="date"
                    value={dataM}
                    onChange={(e) => setDataM(e.target.value)}
                    className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                    Veículo
                  </label>
                  <select
                    value={veiculoId}
                    onChange={(e) => setVeiculoId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
                  >
                    <option value="">—</option>
                    {opts.veiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kits a bordo do veículo selecionado */}
              <PainelKitsVeiculo veiculo={veiculoSelecionado} />

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                  Equipa
                </label>
                <div className="flex flex-wrap gap-2">
                  {opts.trabalhadores
                    .filter((c) => c.tipo === 'trabalhador')
                    .map((c) => {
                      const on = equipa.includes(c.id)
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => toggle(c.id)}
                          className={
                            'rounded-full border px-3 py-1.5 text-[12.5px] ' +
                            (on
                              ? 'border-ink bg-ink text-white'
                              : 'border-line bg-surface text-ink-soft')
                          }
                        >
                          {c.nome}
                        </button>
                      )
                    })}
                </div>
              </div>

              {/* Materiais Extra a Levar */}
              <SecaoMateriaisExtra materiais={materiaisExtra} onChange={setMateriaisExtra} />

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                  Observações de planeamento (opcional)
                </label>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  rows={4}
                  placeholder="Instruções para a equipa, materiais extra, tarefas prioritárias…"
                  className="min-h-24 sm:min-h-28 w-full rounded-lg border border-line bg-surface p-3 text-[13px] leading-relaxed focus:border-ink focus:outline-none"
                />
              </div>

              {erro && <p className="text-[12.5px] text-atr">{erro}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onFechar}
                  className="h-10 rounded-lg border border-line bg-surface px-4 text-[13px] text-ink-soft"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={aGravar}
                  className="h-10 rounded-lg bg-ink px-4 text-[13px] font-medium text-white disabled:opacity-60"
                >
                  {aGravar ? 'A criar…' : 'Criar manutenção'}
                </button>
              </div>
            </form>
          )}
        </PageState>
      </div>
    </div>
  )
}

function ModalEditarManutencao({
  manutencao,
  onFechar,
  onAtualizado,
}: {
  manutencao: ManutencaoSemana
  onFechar: () => void
  onAtualizado: () => void
}) {
  const { colaborador } = useAuth()
  const { data: opts, loading, error } = useAsync(getOpcoesAgendamento, [])

  const [dataM, setDataM] = useState(manutencao.data)
  const [veiculoId, setVeiculoId] = useState(manutencao.veiculo?.id ?? manutencao.veiculo_id ?? '')
  const [equipa, setEquipa] = useState<string[]>(() =>
    manutencao.equipa.map((e) => e.colaborador_id).filter(Boolean),
  )
  const [materiaisExtra, setMateriaisExtra] = useState<MaterialExtraInput[]>(() => {
    if (manutencao.materiais_extra && manutencao.materiais_extra.length > 0) {
      return manutencao.materiais_extra.map((m) => ({
        id: m.id,
        descricao_material: m.descricao_material,
        quantidade: m.quantidade,
      }))
    }
    return []
  })
  const [status, setStatus] = useState<EstadoManutencao>(
    manutencao.status === 'reagendada' ? 'agendada' : manutencao.status,
  )
  const [obs, setObs] = useState(manutencao.observacoes_planeamento ?? '')
  const [aGravar, setAGravar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const veiculoSelecionado = useMemo(() => {
    return opts?.veiculos.find((v) => v.id === veiculoId)
  }, [opts, veiculoId])

  function toggle(id: string) {
    setEquipa((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))
  }

  async function submeter(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAGravar(true)
    try {
      await atualizarManutencao(manutencao.id, {
        data: dataM,
        veiculo_id: veiculoId || null,
        status,
        observacoes_planeamento: obs || null,
        colaboradorIds: equipa,
        materiaisExtra: materiaisExtra.filter((m) => m.descricao_material.trim().length > 0),
      })
      onAtualizado()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível guardar as alterações.')
      setAGravar(false)
    }
  }

  async function handleEliminarManutencao() {
    if (
      !window.confirm(
        'Esta ação é irreversível. Tens a certeza que queres eliminar este agendamento permanentemente?',
      )
    )
      return
    setErro(null)
    setAGravar(true)
    try {
      await eliminarManutencao(manutencao.id)
      onAtualizado()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível eliminar a manutenção.')
      setAGravar(false)
    }
  }

  const morada = [manutencao.jardim?.morada_rua, manutencao.jardim?.morada_cidade]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
        {/* Cabeçalho com identificação do cliente/jardim */}
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Editar Manutenção
              </span>
              <h2 className="text-base font-semibold leading-tight">
                {manutencao.jardim?.cliente?.nome ?? 'Jardim'}
              </h2>
              {morada && <p className="mt-0.5 text-[12px] text-muted">{morada}</p>}
            </div>
            <button
              onClick={onFechar}
              className="text-muted hover:text-ink text-lg leading-none p-1"
            >
              ✕
            </button>
          </div>
        </div>

        <PageState loading={loading} error={error}>
          {opts && (
            <form onSubmit={submeter} className="flex flex-col gap-4 overflow-auto p-5">
              {/* Linha de Data e Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                    Data da manutenção
                  </label>
                  <input
                    type="date"
                    value={dataM}
                    onChange={(e) => setDataM(e.target.value)}
                    className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-ink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                    Estado
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EstadoManutencao)}
                    className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-ink focus:outline-none"
                  >
                    {ESTADOS_DISPONIVEIS.map((s) => (
                      <option key={s.valor} value={s.valor}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Veículo */}
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                  Veículo atribuído
                </label>
                <select
                  value={veiculoId}
                  onChange={(e) => setVeiculoId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-ink focus:outline-none"
                >
                  <option value="">Sem veículo atribuído</option>
                  {opts.veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kits a bordo do veículo selecionado */}
              <PainelKitsVeiculo veiculo={veiculoSelecionado} />

              {/* Equipa */}
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                  Equipa
                </label>
                <div className="flex flex-wrap gap-2">
                  {opts.trabalhadores
                    .filter((c) => c.tipo === 'trabalhador')
                    .map((c) => {
                      const on = equipa.includes(c.id)
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => toggle(c.id)}
                          className={
                            'rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ' +
                            (on
                              ? 'border-ink bg-ink text-white'
                              : 'border-line bg-surface text-ink-soft hover:border-muted')
                          }
                        >
                          {c.nome}
                        </button>
                      )
                    })}
                </div>
              </div>

              {/* Aviso de observação anterior do jardim */}
              {manutencao.jardim_id && (
                <AvisoObservacoesAnteriores
                  jardimId={manutencao.jardim_id}
                  ignorarManutencaoId={manutencao.id}
                  onCopiarParaObs={(texto) => {
                    setObs((prev) => (prev.trim() ? `${prev}\n\n[Nota anterior]: ${texto}` : texto))
                  }}
                />
              )}

              {/* Materiais Extra a Levar */}
              <SecaoMateriaisExtra materiais={materiaisExtra} onChange={setMateriaisExtra} />

              {/* Observações */}
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                  Observações de planeamento
                </label>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  rows={4}
                  placeholder="Instruções para a equipa, materiais extra, etc…"
                  className="min-h-24 sm:min-h-28 w-full rounded-lg border border-line bg-surface p-3 text-[13px] leading-relaxed focus:border-ink focus:outline-none"
                />
              </div>

              {erro && <p className="text-[12.5px] text-atr">{erro}</p>}

              {/* Ações do rodapé */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/execucao/${manutencao.id}`}
                    className="h-9 inline-flex items-center rounded-lg border border-line bg-[#f8f8f7] px-3 text-[12.5px] font-medium text-ink hover:bg-line-soft transition-colors"
                  >
                    Ver execução
                  </Link>
                  {colaborador?.tipo === 'patrao' && (
                    <button
                      type="button"
                      disabled={aGravar}
                      onClick={handleEliminarManutencao}
                      className="h-9 rounded-lg px-2 text-[12.5px] text-atr hover:bg-atr/10 disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onFechar}
                    className="h-9 rounded-lg border border-line bg-surface px-3.5 text-[12.5px] text-ink-soft hover:bg-page"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={aGravar}
                    className="h-9 rounded-lg bg-ink px-4 text-[12.5px] font-medium text-white hover:bg-ink-soft disabled:opacity-60"
                  >
                    {aGravar ? 'A guardar…' : 'Guardar alterações'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </PageState>
      </div>
    </div>
  )
}

