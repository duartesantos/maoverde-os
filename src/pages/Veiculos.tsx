import { useMemo, useState } from 'react'
import { useAsync } from '../lib/useAsync'
import { getVeiculosEKits } from '../data/queries'
import { Card, PageState } from '../components/ui'
import { ModalVeiculo } from '../components/ModalVeiculo'
import { ModalAtribuirKitsVeiculo } from '../components/ModalAtribuirKitsVeiculo'
import { ModalKit } from '../components/ModalKit'
import type { KitComItensEVeiculos, VeiculoComKits } from '../types/db'

export default function Veiculos() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useAsync(getVeiculosEKits, [refreshKey])

  const [abaAtiva, setAbaAtiva] = useState<'veiculos' | 'kits'>('veiculos')
  const [pesquisa, setPesquisa] = useState('')

  // Modais
  const [modalVeiculoAberto, setModalVeiculoAberto] = useState(false)
  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState<VeiculoComKits | null>(null)

  const [modalAtribuirKitsAberto, setModalAtribuirKitsAberto] = useState(false)
  const [veiculoParaAtribuir, setVeiculoParaAtribuir] = useState<VeiculoComKits | null>(null)

  const [modalKitAberto, setModalKitAberto] = useState(false)
  const [kitEmEdicao, setKitEmEdicao] = useState<KitComItensEVeiculos | null>(null)

  function recarregar() {
    setRefreshKey((k) => k + 1)
  }

  const [mostrarInativos, setMostrarInativos] = useState(false)

  // Estatísticas
  const veiculos = data?.veiculos ?? []
  const kits = data?.kits ?? []

  const veiculosAtivos = useMemo(() => veiculos.filter((v) => v.ativo !== false), [veiculos])
  const veiculosInativos = useMemo(() => veiculos.filter((v) => v.ativo === false), [veiculos])
  const veiculosExibidos = useMemo(
    () => (mostrarInativos ? veiculos : veiculosAtivos),
    [mostrarInativos, veiculos, veiculosAtivos],
  )

  const kitsAtivos = useMemo(() => kits.filter((k) => k.ativo !== false), [kits])
  const kitsInativos = useMemo(() => kits.filter((k) => k.ativo === false), [kits])
  const kitsBase = useMemo(
    () => (mostrarInativos ? kits : kitsAtivos),
    [mostrarInativos, kits, kitsAtivos],
  )

  // Filtragem de Kits por texto (nome do kit ou ferramenta)
  const kitsFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()
    return kitsBase.filter((k) => {
      if (termo) {
        const nomeMatch = k.nome.toLowerCase().includes(termo)
        const itemMatch = (k.itens ?? []).some((it) =>
          it.descricao_material.toLowerCase().includes(termo),
        )
        return nomeMatch || itemMatch
      }
      return true
    })
  }, [kitsBase, pesquisa])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Veículos e Kits
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Gestão da frota de carrinhas, kits de ferramentas e kits associados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setVeiculoEmEdicao(null)
              setModalVeiculoAberto(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink shadow-xs hover:bg-page transition-colors"
          >
            <span>+</span> Nova Carrinha
          </button>
          <button
            type="button"
            onClick={() => {
              setKitEmEdicao(null)
              setModalKitAberto(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-white shadow-xs hover:opacity-90 transition-opacity"
          >
            <span>+</span> Novo Kit
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-px">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAbaAtiva('veiculos')}
            className={
              'relative pb-3 text-sm font-medium transition-colors ' +
              (abaAtiva === 'veiculos'
                ? 'text-ink font-semibold'
                : 'text-muted hover:text-ink')
            }
          >
            Carrinhas & Frotas ({veiculosAtivos.length})
            {abaAtiva === 'veiculos' && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('kits')}
            className={
              'relative pb-3 text-sm font-medium transition-colors ml-4 ' +
              (abaAtiva === 'kits'
                ? 'text-ink font-semibold'
                : 'text-muted hover:text-ink')
            }
          >
            Catálogo de Kits & Ferramentas ({kitsAtivos.length})
            {abaAtiva === 'kits' && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" />
            )}
          </button>
        </div>

        {((abaAtiva === 'veiculos' && veiculosInativos.length > 0) ||
          (abaAtiva === 'kits' && kitsInativos.length > 0)) && (
          <label className="flex items-center gap-1.5 pb-2 text-xs text-muted hover:text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-line text-ink focus:ring-0"
            />
            <span>
              Mostrar inativos ({abaAtiva === 'veiculos' ? veiculosInativos.length : kitsInativos.length})
            </span>
          </label>
        )}
      </div>

      <PageState loading={loading} error={error}>
        {/* ================= ABA 1: CARRINHAS ================= */}
        {abaAtiva === 'veiculos' && (
          <div className="flex flex-col gap-5">
            {veiculosAtivos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-10 text-center">
                <p className="text-sm font-medium text-ink">Nenhuma carrinha registada</p>
                <p className="mt-1 text-xs text-muted">
                  Adiciona viaturas para distribuir os serviços no planeamento.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVeiculoEmEdicao(null)
                    setModalVeiculoAberto(true)
                  }}
                  className="mt-4 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  + Criar primeira carrinha
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {veiculosExibidos.map((v) => {
                  const totalItens = v.kits.reduce(
                    (acc, kit) => acc + (kit.itens?.length ?? 0),
                    0,
                  )

                  return (
                    <div
                      key={v.id}
                      className={
                        'flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm ' +
                        (v.ativo === false ? 'opacity-70 bg-page/30' : '')
                      }
                    >
                      <div>
                        {/* Topo do Cartão */}
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h2 className="truncate text-base font-semibold text-ink">
                                {v.nome}
                              </h2>
                              {v.ativo !== false ? (
                                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#38a169]" title="Ativa" />
                              ) : (
                                <span className="rounded bg-page px-1.5 py-0.2 font-mono text-[10.5px] font-medium text-muted border border-line-soft">
                                  Inativa
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {v.matricula && (
                                <span className="rounded bg-page px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted border border-line-soft">
                                  {v.matricula}
                                </span>
                              )}
                              {v.marca && (
                                <span className="text-xs text-muted">{v.marca}</span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setVeiculoEmEdicao(v)
                              setModalVeiculoAberto(true)
                            }}
                            className="rounded-lg p-1.5 text-muted hover:bg-page hover:text-ink transition-colors"
                            title="Editar viatura"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.75}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                        </div>

                        {/* Bloco de Kits Associados */}
                        <div className="mt-4 rounded-lg border border-line-soft bg-[#fcfcfb] p-3">
                          <div className="flex items-center justify-between text-[11.5px] font-semibold text-ink-soft">
                            <span className="uppercase tracking-wider">Kits Associados</span>
                            <span className="font-mono text-muted">
                              {v.kits.length} kit{v.kits.length !== 1 ? 's' : ''} ({totalItens} itens)
                            </span>
                          </div>

                          {v.kits.length === 0 ? (
                            <p className="mt-2 text-xs italic text-muted">
                              Sem kits associados a esta carrinha.
                            </p>
                          ) : (
                            <div className="mt-2 flex flex-col gap-2">
                              {v.kits.map((kit) => (
                                <KitCarrinhaItem key={kit.id} kit={kit} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botão de atribuição no fundo */}
                      <div className="mt-4 border-t border-line-soft pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setVeiculoParaAtribuir(v)
                            setModalAtribuirKitsAberto(true)
                          }}
                          className="w-full rounded-lg border border-line bg-surface py-2 text-xs font-medium text-ink hover:bg-page transition-colors flex items-center justify-center gap-1.5"
                        >
                          <svg
                            className="h-3.5 w-3.5 text-muted"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          Gerir kits associados
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= ABA 2: KITS & FERRAMENTAS ================= */}
        {abaAtiva === 'kits' && (
          <div className="flex flex-col gap-4">
            {/* Barra de Pesquisa */}
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder="Pesquisar por nome ou ferramenta…"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs focus:border-ink focus:outline-none"
                />
                {pesquisa && (
                  <button
                    type="button"
                    onClick={() => setPesquisa('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {kitsFiltrados.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-10 text-center">
                <p className="text-sm font-medium text-ink">Nenhum kit encontrado</p>
                <p className="mt-1 text-xs text-muted">
                  {pesquisa
                    ? 'Tenta ajustar os termos de pesquisa.'
                    : 'Cria kits de ferramentas para associar às carrinhas.'}
                </p>
                {!pesquisa && (
                  <button
                    type="button"
                    onClick={() => {
                      setKitEmEdicao(null)
                      setModalKitAberto(true)
                    }}
                    className="mt-4 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  >
                    + Criar primeiro kit
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {kitsFiltrados.map((k) => (
                  <Card
                    key={k.id}
                    className={
                      'p-4 sm:p-5 flex flex-col justify-between ' +
                      (k.ativo === false ? 'opacity-70 bg-page/30' : '')
                    }
                  >
                    <div>
                      {/* Topo do Kit */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-ink">{k.nome}</h2>
                            {k.ativo === false && (
                              <span className="rounded bg-page px-1.5 py-0.2 font-mono text-[10.5px] font-medium text-muted border border-line-soft">
                                Inativo
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setKitEmEdicao(k)
                            setModalKitAberto(true)
                          }}
                          className="rounded-lg p-1.5 text-muted hover:bg-page hover:text-ink transition-colors"
                          title="Editar kit e ferramentas"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.75}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Lista de Ferramentas / Itens */}
                      <div className="mt-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Ferramentas Incluídas ({k.itens.length})
                        </span>

                        {k.itens.length === 0 ? (
                          <p className="mt-1 text-xs italic text-muted">Sem ferramentas listadas.</p>
                        ) : (
                          <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                            {k.itens.map((it) => (
                              <li
                                key={it.id}
                                className="flex items-center justify-between rounded bg-page/40 px-2 py-1 text-ink"
                              >
                                <span className="truncate">{it.descricao_material}</span>
                                {it.quantidade !== null && it.quantidade !== undefined && (
                                  <span className="ml-2 font-mono text-[11px] text-muted">
                                    x{it.quantidade}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Rodapé: Viatura onde está associado */}
                    <div className="mt-4 border-t border-line-soft pt-3">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-muted">Associado a:</span>
                        {k.veiculos && k.veiculos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {k.veiculos.map((v) => (
                              <span
                                key={v.id}
                                className="rounded bg-surface border border-line px-1.5 py-0.2 font-medium text-ink"
                              >
                                {v.nome}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-muted">Nenhuma carrinha</span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </PageState>

      {/* Modais */}
      <ModalVeiculo
        aberto={modalVeiculoAberto}
        onFechar={() => setModalVeiculoAberto(false)}
        onGuardado={recarregar}
        veiculoParaEditar={veiculoEmEdicao}
      />

      <ModalAtribuirKitsVeiculo
        aberto={modalAtribuirKitsAberto}
        onFechar={() => setModalAtribuirKitsAberto(false)}
        onGuardado={recarregar}
        veiculo={veiculoParaAtribuir}
        todosOsKits={kitsAtivos}
      />

      <ModalKit
        aberto={modalKitAberto}
        onFechar={() => setModalKitAberto(false)}
        onGuardado={recarregar}
        kitParaEditar={kitEmEdicao}
      />
    </div>
  )
}

function KitCarrinhaItem({ kit }: { kit: VeiculoComKits['kits'][0] }) {
  const [aberto, setAberto] = useState(false)
  const totalItens = kit.itens?.length ?? 0

  return (
    <div className="rounded border border-line bg-surface p-2.5 text-xs transition-colors">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="w-full flex items-center justify-between text-left cursor-pointer group"
      >
        <span className="font-medium text-ink group-hover:underline truncate">{kit.nome}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10.5px] text-muted font-mono">
            {totalItens} {totalItens === 1 ? 'ferramenta' : 'ferramentas'}
          </span>
          {totalItens > 0 && (
            <span className="text-[10px] font-medium text-ink border border-line-soft bg-page px-1.5 py-0.5 rounded group-hover:border-ink/40">
              {aberto ? '▲' : '▼'}
            </span>
          )}
        </div>
      </button>

      {aberto && (
        <div className="mt-2 border-t border-line-soft pt-1.5">
          {totalItens === 0 ? (
            <p className="text-[11px] text-muted italic">Sem ferramentas associadas.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-[11.5px]">
              {kit.itens.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-2 py-0.5 rounded px-1.5 bg-page/50 text-ink"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink/35 shrink-0" />
                    <span className="truncate">{it.descricao_material}</span>
                  </span>
                  {it.quantidade !== null && it.quantidade !== undefined && (
                    <span className="shrink-0 font-mono text-[10.5px] text-muted px-1.5 py-0.5 rounded bg-surface border border-line-soft font-medium">
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
}
