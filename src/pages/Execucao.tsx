import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAsync } from '../lib/useAsync'
import {
  getDadosExecucao,
  salvarExecucao,
  type ItemFaturavelInput,
} from '../data/queries'
import { Badge, Card, PageState } from '../components/ui'
import { dataCurta, dataHora } from '../lib/format'

export default function Execucao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { colaborador } = useAuth()

  const { data, loading, error } = useAsync(
    () => (id ? getDadosExecucao(id) : Promise.reject(new Error('ID em falta'))),
    [id],
  )

  return (
    <PageState loading={loading} error={error}>
      {data && (
        <FormularioExecucao
          key={data.manutencao.id}
          dadosIniciais={data}
          colaboradorId={colaborador?.id ?? null}
          onSucesso={() => navigate(-1)}
        />
      )}
    </PageState>
  )
}

function FormularioExecucao({
  dadosIniciais,
  colaboradorId,
  onSucesso,
}: {
  dadosIniciais: NonNullable<Awaited<ReturnType<typeof getDadosExecucao>>>
  colaboradorId: string | null
  onSucesso: () => void
}) {
  const { manutencao, execucao, itens: itensIniciais } = dadosIniciais

  const [obs, setObs] = useState(execucao?.observacoes ?? '')
  const [itens, setItens] = useState<ItemFaturavelInput[]>(() => {
    if (itensIniciais.length > 0) {
      return itensIniciais.map((it) => ({
        id: it.id,
        descricao: it.descricao,
        quantidade: it.quantidade,
        faturado: it.faturado,
      }))
    }
    return []
  })

  const [aGravar, setAGravar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const eConcluida = manutencao.status === 'concluida'

  function adicionarItem() {
    setItens((prev) => [
      ...prev,
      { descricao: '', quantidade: '', faturado: false },
    ])
  }

  function atualizarItem(index: number, campo: keyof ItemFaturavelInput, valor: unknown) {
    setItens((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [campo]: valor }
      return copy
    })
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index))
  }

  async function submeter(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAGravar(true)

    try {
      await salvarExecucao({
        manutencao_id: manutencao.id,
        concluido_por: colaboradorId,
        observacoes: obs.trim() || null,
        itens,
      })
      setSucesso(true)
      setTimeout(() => {
        onSucesso()
      }, 700)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível guardar a execução.')
      setAGravar(false)
    }
  }

  const morada = [manutencao.jardim?.morada_rua, manutencao.jardim?.morada_cidade]
    .filter(Boolean)
    .join(' · ')

  const nomesEquipa = (manutencao.equipa ?? [])
    .map((e) => e.colaborador?.nome)
    .filter(Boolean) as string[]

  return (
    <div className="mx-auto max-w-2xl p-4 lg:p-6 pb-24">
      {/* Barra de navegação e status */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSucesso}
          className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
        >
          ← Voltar
        </button>
        <div className="flex items-center gap-2">
          {eConcluida ? (
            <Badge dark>Concluída</Badge>
          ) : (
            <Badge>Em progresso</Badge>
          )}
        </div>
      </div>

      {/* Cartão de Contexto do Trabalho */}
      <Card className="mb-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Cliente & Jardim
            </span>
            <h2 className="text-lg font-semibold text-ink leading-tight">
              {manutencao.jardim?.cliente?.nome ?? 'Cliente'}
            </h2>
            {morada && <p className="mt-0.5 text-[12.5px] text-muted">{morada}</p>}
            {manutencao.jardim?.cliente?.contacto && (
              <a
                href={`tel:${manutencao.jardim.cliente.contacto}`}
                className="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-ink-soft hover:underline"
              >
                📞 {manutencao.jardim.cliente.contacto}
              </a>
            )}
          </div>
          <div className="text-right text-[12px] text-muted">
            <span className="font-mono">{dataCurta(manutencao.data)}</span>
            {manutencao.veiculo?.nome && (
              <div className="mt-0.5 text-[11.5px]">{manutencao.veiculo.nome}</div>
            )}
          </div>
        </div>

        {/* Equipa de trabalhadores responsáveis */}
        <div className="mt-4 rounded-lg border border-line-soft bg-page p-3 text-[12.5px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">👥</span>
              <div>
                <span className="font-semibold text-ink">Equipa responsável:</span>
                <span className="ml-1.5 text-ink-soft font-medium">
                  {nomesEquipa.length > 0
                    ? nomesEquipa.join(', ')
                    : 'Sem trabalhadores atribuídos no planeamento'}
                </span>
              </div>
            </div>
            {execucao?.concluido_por_nome && (
              <span className="text-[11.5px] text-muted shrink-0">
                Registo efetuado por:{' '}
                <strong className="font-medium text-ink">{execucao.concluido_por_nome}</strong>
                {execucao.concluido_em && ` (${dataHora(execucao.concluido_em)})`}
              </span>
            )}
          </div>
        </div>

        {/* Etapa do plano rotativo */}
        {manutencao.jardim?.tem_plano_rotativo && manutencao.jardim.etapa_atual && (
          <div className="mt-4 rounded-lg border border-line-soft bg-page p-3 text-[12.5px]">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10.5px] font-bold text-white">
                {manutencao.jardim.etapa_atual.ordem}
              </span>
              <b className="font-medium text-ink">Etapa rotativa em curso:</b>
            </div>
            <p className="mt-1 pl-7 text-ink-soft">
              {manutencao.jardim.etapa_atual.instrucoes || 'Sem instruções específicas.'}
            </p>
          </div>
        )}

        {/* Observações de planeamento (instruções do patrão) */}
        {manutencao.observacoes_planeamento && (
          <div className="mt-3 rounded-lg border border-line-soft bg-[#fbfbf9] p-3 text-[12.5px]">
            <b className="text-ink-soft">Notas do planeamento:</b>
            <p className="mt-0.5 text-muted leading-relaxed">
              {manutencao.observacoes_planeamento}
            </p>
          </div>
        )}

        {/* Materiais extra requisitados para este jardim */}
        {manutencao.materiais_extra && manutencao.materiais_extra.length > 0 && (
          <div className="mt-3 rounded-lg border border-line-soft bg-[#fbfbf9] p-3 text-[12.5px]">
            <b className="text-ink-soft">📦 Materiais extra pedidos para este serviço:</b>
            <ul className="mt-2 flex flex-col gap-1 text-[12px]">
              {manutencao.materiais_extra.map((m, idx) => (
                <li
                  key={m.id ?? idx}
                  className="flex items-center justify-between gap-2 rounded bg-surface border border-line-soft px-2.5 py-1 text-ink"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink/40 shrink-0" />
                    <span className="truncate font-medium">{m.descricao_material}</span>
                  </span>
                  {m.quantidade !== null && m.quantidade !== undefined && (
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {m.quantidade} un.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Formulário de Execução */}
      <form onSubmit={submeter} className="flex flex-col gap-5">
        {/* Observações técnicas */}
        <Card title="Observações da Execução" className="p-4 sm:p-5">
          <label className="mb-2 block text-[12px] text-muted leading-relaxed">
            Regista o trabalho realizado no terreno (corte, aparo, tratamentos, limpeza).
            Ficará gravado no histórico do jardim.
          </label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={4}
            placeholder="Ex.: Relva cortada, sebes aparadas, limpos os canteiros da entrada e verificado o programador de rega…"
            className="w-full resize-y rounded-lg border border-line bg-surface p-3 text-sm focus:border-ink focus:outline-none"
          />
        </Card>

        {/* Materiais e Itens a Faturar */}
        <Card
          title="Materiais Gastos (A Faturar)"
          action={
            <button
              type="button"
              onClick={adicionarItem}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink shadow-xs hover:bg-page transition-colors"
            >
              <span>+</span> Adicionar
            </button>
          }
          className="p-4 sm:p-5"
        >
          <p className="mb-3 text-[12px] text-muted leading-relaxed">
            Materiais aplicados no jardim a cobrar ao cliente (adubo, substrato, peças de rega, plantas).
            Nascem por defeito como <b>pendentes de faturação</b>.
          </p>

          {itens.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-muted">
              Nenhum material gasto registado.
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={adicionarItem}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-ink shadow-xs hover:bg-page transition-colors"
                >
                  <span className="font-bold">+</span> Adicionar material
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {itens.map((it, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-[#fcfcfb] p-2.5 sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      placeholder="Descrição do material…"
                      value={it.descricao}
                      onChange={(e) => atualizarItem(idx, 'descricao', e.target.value)}
                      required
                      className="h-9 w-full rounded border border-line bg-surface px-2.5 text-[13px] focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-28 sm:w-36">
                      <input
                        type="text"
                        placeholder="Qtd (ex: 2 sacos)"
                        value={it.quantidade ?? ''}
                        onChange={(e) =>
                          atualizarItem(
                            idx,
                            'quantidade',
                            e.target.value,
                          )
                        }
                        className="h-9 w-full rounded border border-line bg-surface px-2 text-center text-[13px] focus:border-ink focus:outline-none"
                      />
                    </div>

                    {it.faturado ? (
                      <span className="whitespace-nowrap rounded bg-[#f0f0ee] px-2 py-1 text-[11px] text-muted">
                        Faturado
                      </span>
                    ) : (
                      <span className="whitespace-nowrap rounded border border-line bg-surface px-2 py-1 text-[11px] text-faint">
                        Pendente
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removerItem(idx)}
                      title="Remover material"
                      className="flex h-9 w-8 items-center justify-center rounded text-muted hover:bg-atr/10 hover:text-atr"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={adicionarItem}
                className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-[#fcfcfb] text-[13px] font-medium text-ink-soft transition-colors hover:border-ink hover:bg-page hover:text-ink active:scale-[0.99]"
              >
                <span className="text-base font-bold leading-none text-ink">+</span>
                <span>Adicionar outro material</span>
              </button>
            </div>
          )}
        </Card>

        {erro && <p className="text-[13px] text-atr">{erro}</p>}
        {sucesso && (
          <p className="text-[13px] text-ok font-medium">
            ✓ Trabalho concluído e guardado com sucesso!
          </p>
        )}

        {/* Botão de Concluir Trabalho */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onSucesso}
            className="h-10 rounded-lg border border-line bg-surface px-4 text-[13px] text-ink-soft hover:bg-page"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={aGravar}
            className="h-10 rounded-lg bg-ink px-5 text-[13px] font-medium text-white hover:bg-ink-soft disabled:opacity-60"
          >
            {aGravar
              ? 'A guardar…'
              : eConcluida
                ? 'Guardar alterações'
                : 'Concluir trabalho'}
          </button>
        </div>
      </form>
    </div>
  )
}
