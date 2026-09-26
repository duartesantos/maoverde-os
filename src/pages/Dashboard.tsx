import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAsync } from '../lib/useAsync'
import { getDashboard, type CargaCarrinhaDia } from '../data/queries'
import { Badge, Card, PageState } from '../components/ui'

function Stat({ k, v, sub }: { k: string; v: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-[12px] text-muted">{k}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight">
        {v} {sub && <span className="text-[13px] font-normal text-muted">{sub}</span>}
      </div>
    </div>
  )
}

function PainelCargaEquipamentoDia({
  cargas,
  colaborador,
}: {
  cargas: CargaCarrinhaDia[]
  colaborador: { id: string; nome: string; tipo: string } | null
}) {
  const [expandido, setExpandido] = useState(true)

  // Carrinha selecionada (prioriza a carrinha onde o utilizador logado está escalado hoje)
  const [veiculoSelId, setVeiculoSelId] = useState<string>(() => {
    if (cargas.length === 0) return ''
    if (colaborador) {
      const minha = cargas.find((c) => c.colaboradorIds.includes(colaborador.id))
      if (minha) return minha.veiculoId
    }
    return cargas[0].veiculoId
  })

  // Controla expansão individual dos kits para ver ferramentas
  const [kitsAbertos, setKitsAbertos] = useState<Record<string, boolean>>({})

  function toggleKit(kitId: string) {
    setKitsAbertos((prev) => ({ ...prev, [kitId]: !prev[kitId] }))
  }

  if (cargas.length === 0) {
    return null
  }

  // Carrinha atualmente selecionada
  const carrinha = cargas.find((c) => c.veiculoId === veiculoSelId) ?? cargas[0]

  // Contagem de materiais extra da carrinha ativa
  const totalExtra = carrinha.materiaisExtra.length

  return (
    <div className="mb-5 rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">
      {/* Cabeçalho do Painel */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-page text-base">
            🚚
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">
                Carga & Equipamento de Hoje
              </h2>
              {totalExtra > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[10.5px] font-mono font-medium bg-page text-ink-soft border border-line-soft">
                  {totalExtra} {totalExtra === 1 ? 'material extra' : 'materiais extra'}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-muted">
              Consulta dos kits da carrinha e materiais extra para os serviços de hoje
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpandido((e) => !e)}
          className="rounded-lg border border-line bg-page px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface hover:text-ink transition-colors cursor-pointer"
        >
          {expandido ? '▲ Recolher' : '▼ Expandir verificação'}
        </button>
      </div>

      {expandido && (
        <div className="p-4 sm:p-5">
          {/* Seletor de carrinhas (se houver mais de uma carrinha com trabalhos hoje) */}
          {cargas.length > 1 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-line-soft pb-3.5">
              <span className="text-[12px] text-muted mr-1">Viatura:</span>
              {cargas.map((c) => {
                const ativa = c.veiculoId === carrinha.veiculoId
                const souEu = colaborador && c.colaboradorIds.includes(colaborador.id)
                return (
                  <button
                    type="button"
                    key={c.veiculoId}
                    onClick={() => setVeiculoSelId(c.veiculoId)}
                    className={
                      'rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ' +
                      (ativa
                        ? 'border-ink bg-ink text-white'
                        : 'border-line bg-page text-ink-soft hover:bg-surface')
                    }
                  >
                    <span>{c.veiculoNome}</span>
                    {souEu && (
                      <span className={'text-[10px] px-1 rounded ' + (ativa ? 'bg-white/20' : 'bg-line')}>
                        Tua
                      </span>
                    )}
                    {c.materiaisExtra.length > 0 && (
                      <span className={'text-[10.5px] font-mono ' + (ativa ? 'text-white/80' : 'text-muted')}>
                        · 📦 {c.materiaisExtra.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Identificação da Equipa da carrinha */}
          {carrinha.equipaNomes.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-muted">
              <span className="font-medium text-ink">Equipa responsável:</span>
              <span>{carrinha.equipaNomes.join(', ')}</span>
              <span className="text-line">·</span>
              <span>
                {carrinha.trabalhosCount} {carrinha.trabalhosCount === 1 ? 'jardim hoje' : 'jardins hoje'}
              </span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Bloco 1: Materiais Extra para Hoje */}
            <div className="rounded-xl border border-line bg-[#fcfcfb] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <b className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                  📦 Materiais Extra para Hoje
                </b>
                <span className="text-[11px] font-mono text-muted">
                  {totalExtra} {totalExtra === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-[11.5px] text-muted mb-3 leading-relaxed">
                Itens adicionais requisitados pelo planeamento para os jardins de hoje nesta carrinha:
              </p>

              {totalExtra === 0 ? (
                <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-line p-5 text-center text-[12px] text-muted">
                  ✓ Nenhum material extra requisitado para hoje. Apenas o kit habitual da carrinha.
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {carrinha.materiaisExtra.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-line bg-surface text-[12.5px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-ink/40 shrink-0" />
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {m.descricao_material}
                          </span>
                          <span className="block text-[11px] text-muted">
                            Para: {m.jardimNome}
                          </span>
                        </div>
                      </div>
                      {m.quantidade !== null && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-page border border-line-soft whitespace-nowrap text-muted font-medium">
                          Qtd: {m.quantidade}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Bloco 2: Kits Padrão a bordo da carrinha */}
            <div className="rounded-xl border border-line bg-[#fcfcfb] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <b className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                  🛠️ Kits por Defeito ({carrinha.veiculoNome})
                </b>
                {carrinha.kits.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const todosAbertos = carrinha.kits.every((k) => kitsAbertos[k.id])
                        const novo: Record<string, boolean> = {}
                        carrinha.kits.forEach((k) => {
                          novo[k.id] = !todosAbertos
                        })
                        setKitsAbertos(novo)
                      }}
                      className="text-[11px] text-muted hover:text-ink font-medium cursor-pointer"
                    >
                      {carrinha.kits.every((k) => kitsAbertos[k.id])
                        ? 'Recolher todos'
                        : 'Expandir todos'}
                    </button>
                    <span className="text-line text-xs">·</span>
                    <span className="text-[11px] text-muted font-mono">
                      {carrinha.kits.length} {carrinha.kits.length === 1 ? 'kit' : 'kits'}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[11.5px] text-muted mb-3 leading-relaxed">
                Conjuntos de ferramentas que devem estar permanentemente a bordo desta carrinha:
              </p>

              {carrinha.kits.length === 0 ? (
                <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-line p-5 text-center text-[12px] text-muted">
                  Sem kits associados a esta viatura.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {carrinha.kits.map((k) => {
                    const aberto = Boolean(kitsAbertos[k.id])
                    return (
                      <div
                        key={k.id}
                        className="rounded-lg border border-line bg-surface p-2.5 text-[12px] transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => toggleKit(k.id)}
                          className="w-full flex items-center justify-between text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <b className="font-medium text-ink group-hover:underline truncate">
                              {k.nome}
                            </b>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10.5px] text-muted font-mono">
                              {k.itens.length} {k.itens.length === 1 ? 'ferramenta' : 'ferramentas'}
                            </span>
                            {k.itens.length > 0 && (
                              <span className="text-[10.5px] font-medium text-ink border border-line-soft bg-page px-2 py-0.5 rounded flex items-center gap-1 group-hover:border-ink/40">
                                {aberto ? 'Fechar ▲' : 'Ver ▼'}
                              </span>
                            )}
                          </div>
                        </button>

                        {aberto && (
                          <div className="mt-2.5 border-t border-line-soft pt-2">
                            {k.itens.length === 0 ? (
                              <p className="text-[11px] text-muted italic">
                                Sem ferramentas listadas neste kit.
                              </p>
                            ) : (
                              <ul className="flex flex-col gap-1.5">
                                {k.itens.map((it, idx) => (
                                  <li
                                    key={it.id ?? idx}
                                    className="flex items-center justify-between gap-2 rounded bg-page/70 px-2 py-1 text-[11.5px] text-ink"
                                  >
                                    <span className="flex items-center gap-2 min-w-0">
                                      <span className="h-1.5 w-1.5 rounded-full bg-ink/35 shrink-0" />
                                      <span className="truncate font-medium">
                                        {it.descricao_material}
                                      </span>
                                    </span>
                                    {it.quantidade !== null && it.quantidade !== undefined && (
                                      <span className="shrink-0 font-mono text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-surface border border-line-soft text-muted">
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
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { colaborador } = useAuth()
  const { data, loading, error } = useAsync(getDashboard, [])

  return (
    <div className="p-5 lg:p-6">
      <p className="mb-4 text-sm text-muted">
        Olá{colaborador?.nome ? `, ${colaborador.nome.split(' ')[0]}` : ''}.
      </p>

      <PageState loading={loading} error={error}>
        {data && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat k="Jardins ativos" v={data.jardinsAtivos} />
              <Stat k="Atrasadas" v={data.atrasadas} />
              <Stat k="Por faturar" v={data.materiaisPorFaturar} sub="itens" />
              <Stat k="Trabalhos hoje" v={data.trabalhosHoje.length} />
            </div>

            {/* Painel de Carga & Equipamento de Hoje (Verificação Matinal) */}
            <PainelCargaEquipamentoDia
              cargas={data.cargasDoDia}
              colaborador={colaborador}
            />

            <Card
              title="Trabalhos de hoje"
              action={
                <Link to="/planeamento" className="text-[12px] text-muted hover:text-ink">
                  Ver planeamento completo →
                </Link>
              }
            >
              {data.trabalhosHoje.length === 0 && (
                <div className="p-6 text-center text-sm text-muted">
                  Nada agendado para hoje.
                </div>
              )}
              {data.trabalhosHoje.map((m) => (
                <Link
                  key={m.id}
                  to={`/execucao/${m.id}`}
                  className="flex items-center justify-between border-b border-line-soft px-4 py-3 text-[13px] last:border-0 hover:bg-page/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink">
                      {m.jardim?.cliente?.nome ?? 'Jardim'}
                    </div>
                    <div className="text-[11.5px] text-muted">
                      {m.status === 'concluida'
                        ? '✓ Concluído'
                        : 'Toca para registar execução'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>
                      {m.status === 'concluida' ? 'Concluída' : 'Agendada'}
                    </Badge>
                    <span className="text-xs text-muted">›</span>
                  </div>
                </Link>
              ))}
            </Card>
          </>
        )}
      </PageState>
    </div>
  )
}
