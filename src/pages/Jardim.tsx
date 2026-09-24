import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAsync } from '../lib/useAsync'
import {
  getJardim,
  marcarItemFaturado,
  marcarTodosItensFaturados,
  moradaCurta,
} from '../data/queries'
import { Badge, Card, PageState, StatusDot } from '../components/ui'
import { ModalEditarJardim } from '../components/ModalEditarJardim'
import { ModalNovoJardim } from '../components/ModalNovoJardim'
import { dataCurta } from '../lib/format'

export default function Jardim() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { colaborador } = useAuth()
  const [refresh, setRefresh] = useState(0)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [modalNovoJardimAberto, setModalNovoJardimAberto] = useState(false)
  const [abaMateriais, setAbaMateriais] = useState<'pendentes' | 'faturados'>('pendentes')
  const [aMarcar, setAMarcar] = useState(false)
  const { data, loading, error } = useAsync(() => getJardim(id), [id, refresh])

  const itensPendentes = useMemo(
    () => data?.itensFaturaveis?.filter((it) => !it.faturado) ?? [],
    [data?.itensFaturaveis],
  )
  const itensFaturados = useMemo(
    () => data?.itensFaturaveis?.filter((it) => it.faturado) ?? [],
    [data?.itensFaturaveis],
  )

  return (
    <div className="p-5 lg:p-6">
      <Link to="/clientes" className="text-[12.5px] text-muted">
        ‹ Clientes
      </Link>

      <PageState loading={loading} error={error}>
        {data && (
          <>
            <div className="mb-4 mt-2 flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-semibold">
                {data.jardim.cliente?.nome ?? 'Jardim'}
              </h1>
              <StatusDot estado={data.jardim.status} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Card
                  title="Detalhes"
                  action={
                    colaborador?.tipo === 'patrao' ? (
                      <button
                        type="button"
                        onClick={() => setModalEditarAberto(true)}
                        className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink hover:border-[#cfcfc9] hover:bg-page"
                      >
                        Editar jardim
                      </button>
                    ) : null
                  }
                >
                  <dl className="px-4 pb-3 pt-1 text-[13px]">
                    {[
                      ['Morada', moradaCurta(data.jardim)],
                      ['Volta', data.jardim.volta?.nome ?? '—'],
                      [
                        'Frequência',
                        data.jardim.frequencia === 'quinzenal' ? 'Quinzenal' : 'Semanal',
                      ],
                      ['Última manutenção', dataCurta(data.jardim.ultima_manutencao)],
                      ['Próxima manutenção', dataCurta(data.jardim.proxima_manutencao)],
                      ...(data.jardim.notas ? [['Notas', data.jardim.notas]] : []),
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between border-b border-line-soft py-2 last:border-0"
                      >
                        <dt className="text-muted">{k}</dt>
                        <dd className="font-medium text-right max-w-[65%]">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {colaborador?.tipo === 'patrao' && (
                    <div className="border-t border-line-soft bg-[#fcfcfb] px-4 py-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setModalNovoJardimAberto(true)}
                        className="text-[12px] font-medium text-muted hover:text-ink hover:underline"
                      >
                        + Adicionar jardim adicional a este cliente
                      </button>
                    </div>
                  )}
                </Card>

                {data.jardim.tem_plano_rotativo && (
                  <Card title="Plano rotativo">
                    <div className="flex flex-col gap-1 p-3">
                      {data.etapas.map((e) => {
                        const atual = e.id === data.jardim.etapa_atual_id
                        return (
                          <div
                            key={e.id}
                            className={
                              'flex items-center gap-3 rounded-lg border p-2.5 ' +
                              (atual
                                ? 'border-line bg-page'
                                : 'border-transparent')
                            }
                          >
                            <span
                              className={
                                'flex h-6 w-6 items-center justify-center rounded-full border text-[12px] font-semibold ' +
                                (atual
                                  ? 'border-ink bg-ink text-white'
                                  : 'border-line bg-surface text-muted')
                              }
                            >
                              {e.ordem}
                            </span>
                            <span className="text-[13px]">{e.instrucoes}</span>
                            {atual && (
                              <span className="ml-auto">
                                <Badge>Etapa atual</Badge>
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <Card
                  title="Materiais a faturar"
                  action={
                    <div className="flex items-center gap-1 rounded-lg border border-line bg-page p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAbaMateriais('pendentes')}
                        className={
                          'rounded px-2 py-0.5 font-medium transition-all ' +
                          (abaMateriais === 'pendentes'
                            ? 'bg-surface text-ink shadow-2xs'
                            : 'text-muted hover:text-ink')
                        }
                      >
                        Por faturar ({itensPendentes.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbaMateriais('faturados')}
                        className={
                          'rounded px-2 py-0.5 font-medium transition-all ' +
                          (abaMateriais === 'faturados'
                            ? 'bg-surface text-ink shadow-2xs'
                            : 'text-muted hover:text-ink')
                        }
                      >
                        Já faturados ({itensFaturados.length})
                      </button>
                    </div>
                  }
                >
                  {abaMateriais === 'pendentes' ? (
                    <div>
                      {itensPendentes.length === 0 ? (
                        <div className="p-6 text-center text-[12.5px] text-muted">
                          Sem materiais pendentes de faturação.
                        </div>
                      ) : (
                        <div>
                          {colaborador?.tipo === 'patrao' && itensPendentes.length > 1 && (
                            <div className="flex items-center justify-between border-b border-line-soft bg-[#fafaf9] px-4 py-2 text-[11.5px]">
                              <span className="text-muted">
                                {itensPendentes.length} materiais por cobrar
                              </span>
                              <button
                                type="button"
                                disabled={aMarcar}
                                onClick={async () => {
                                  setAMarcar(true)
                                  await marcarTodosItensFaturados(itensPendentes.map((it) => it.id))
                                  setRefresh((r) => r + 1)
                                  setAMarcar(false)
                                }}
                                className="font-medium text-ink hover:underline disabled:opacity-50"
                              >
                                Marcar todos como faturados
                              </button>
                            </div>
                          )}

                          <div className="divide-y divide-line-soft">
                            {itensPendentes.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-center justify-between gap-3 px-4 py-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-[13px] font-medium text-ink">
                                    {it.quantidade ? `${it.quantidade} · ` : ''}
                                    {it.descricao}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted">
                                    <span>Utilizado a {dataCurta(it.data_utilizacao)}</span>
                                    {it.manutencao_id && (
                                      <>
                                        <span>·</span>
                                        <Link
                                          to={`/execucao/${it.manutencao_id}`}
                                          className="hover:text-ink hover:underline"
                                        >
                                          Ver visita
                                        </Link>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {colaborador?.tipo === 'patrao' && (
                                  <button
                                    type="button"
                                    disabled={aMarcar}
                                    onClick={async () => {
                                      setAMarcar(true)
                                      await marcarItemFaturado(it.id, true)
                                      setRefresh((r) => r + 1)
                                      setAMarcar(false)
                                    }}
                                    className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink hover:border-[#cfcfc9] hover:bg-page disabled:opacity-50"
                                  >
                                    Marcar faturado
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {itensFaturados.length === 0 ? (
                        <div className="p-6 text-center text-[12.5px] text-muted">
                          Nenhum material faturado anteriormente.
                        </div>
                      ) : (
                        <div className="divide-y divide-line-soft">
                          {itensFaturados.map((it) => (
                            <div
                              key={it.id}
                              className="flex items-center justify-between gap-3 px-4 py-3 opacity-90"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-medium text-ink">
                                  {it.quantidade ? `${it.quantidade} · ` : ''}
                                  {it.descricao}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted">
                                  <span>Utilizado a {dataCurta(it.data_utilizacao)}</span>
                                  <span>·</span>
                                  <span className="font-medium text-ok">
                                    Faturado a {dataCurta(it.faturado_em)}
                                  </span>
                                  {it.manutencao_id && (
                                    <>
                                      <span>·</span>
                                      <Link
                                        to={`/execucao/${it.manutencao_id}`}
                                        className="hover:text-ink hover:underline"
                                      >
                                        Ver visita
                                      </Link>
                                    </>
                                  )}
                                </div>
                              </div>
                              {colaborador?.tipo === 'patrao' && (
                                <button
                                  type="button"
                                  disabled={aMarcar}
                                  onClick={async () => {
                                    setAMarcar(true)
                                    await marcarItemFaturado(it.id, false)
                                    setRefresh((r) => r + 1)
                                    setAMarcar(false)
                                  }}
                                  className="text-[11.5px] text-muted hover:text-ink hover:underline disabled:opacity-50"
                                >
                                  Desmarcar
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                <Card title="Histórico de manutenções">
                {data.historico.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted">
                    Ainda sem histórico.
                  </div>
                )}
                {data.historico.map((h) => {
                  const equipaNomes = (h.manutencao?.equipa ?? [])
                    .map((eq) => eq.colaborador?.nome)
                    .filter(Boolean) as string[]

                  const trabalhadores =
                    equipaNomes.length > 0
                      ? equipaNomes
                      : h.concluido_por_colaborador?.nome
                        ? [h.concluido_por_colaborador.nome]
                        : []

                  return (
                    <div
                      key={h.id}
                      className="border-b border-line-soft px-4 py-3 last:border-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="font-semibold text-ink">
                            {dataCurta(h.manutencao?.data ?? null)}
                          </b>
                          {trabalhadores.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-0.5 text-[11.5px] font-medium text-ink-soft border border-line-soft">
                              <span className="text-[11px] text-muted">👥</span>
                              <span>{trabalhadores.join(', ')}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted italic">
                              (sem equipa registada)
                            </span>
                          )}
                          {h.manutencao?.veiculo?.nome && (
                            <span className="text-[11px] text-muted font-mono">
                              · 🚚 {h.manutencao.veiculo.nome}
                            </span>
                          )}
                        </div>

                        {h.manutencao?.id && (
                          <Link
                            to={`/execucao/${h.manutencao.id}`}
                            className="text-[11.5px] font-medium text-muted hover:text-ink hover:underline shrink-0"
                          >
                            Ver / Editar execução →
                          </Link>
                        )}
                      </div>

                      {h.observacoes && (
                        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
                          {h.observacoes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </Card>
            </div>
          </div>

          {modalEditarAberto && (
              <ModalEditarJardim
                aberto={modalEditarAberto}
                onFechar={() => setModalEditarAberto(false)}
                onGuardado={() => setRefresh((r) => r + 1)}
                dados={{
                  id: data.jardim.id,
                  clienteNome: data.jardim.cliente?.nome ?? 'Jardim',
                  morada_rua: data.jardim.morada_rua,
                  morada_cidade: data.jardim.morada_cidade,
                  morada_codigo_postal: data.jardim.morada_codigo_postal,
                  volta_id: data.jardim.volta_id,
                  frequencia: data.jardim.frequencia,
                  notas: data.jardim.notas,
                  tem_plano_rotativo: data.jardim.tem_plano_rotativo,
                  etapa_atual_id: data.jardim.etapa_atual_id,
                  etapas: data.etapas,
                }}
              />
            )}

            {modalNovoJardimAberto && (
              <ModalNovoJardim
                aberto={modalNovoJardimAberto}
                onFechar={() => setModalNovoJardimAberto(false)}
                clientePredefinidoId={data.jardim.cliente_id}
                onJardimCriado={(novoId) => {
                  setModalNovoJardimAberto(false)
                  navigate(`/jardim/${novoId}`)
                }}
              />
            )}
          </>
        )}
      </PageState>
    </div>
  )
}
