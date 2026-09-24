import { useEffect, useState, type FormEvent } from 'react'
import { criarKit, atualizarKit, desativarKit, apagarKit } from '../data/queries'
import type { KitComItensEVeiculos, KitItemInput } from '../types/db'

interface ModalKitProps {
  aberto: boolean
  onFechar: () => void
  onGuardado: () => void
  kitParaEditar?: KitComItensEVeiculos | null
}

export function ModalKit({
  aberto,
  onFechar,
  onGuardado,
  kitParaEditar,
}: ModalKitProps) {
  const [nome, setNome] = useState('')
  const [itens, setItens] = useState<KitItemInput[]>([])

  const [aGravar, setAGravar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmarDesativar, setConfirmarDesativar] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const modoEdicao = Boolean(kitParaEditar)

  useEffect(() => {
    if (kitParaEditar) {
      setNome(kitParaEditar.nome ?? '')
      setItens(
        kitParaEditar.itens && kitParaEditar.itens.length > 0
          ? kitParaEditar.itens.map((it) => ({
              id: it.id,
              descricao_material: it.descricao_material,
              quantidade: it.quantidade,
            }))
          : [{ descricao_material: '', quantidade: null }],
      )
    } else {
      setNome('')
      setItens([
        { descricao_material: '', quantidade: null },
        { descricao_material: '', quantidade: null },
      ])
    }
    setErro(null)
    setConfirmarDesativar(false)
    setConfirmarEliminar(false)
  }, [kitParaEditar, aberto])

  if (!aberto) return null

  function adicionarLinhaItem() {
    setItens((prev) => [...prev, { descricao_material: '', quantidade: null }])
  }

  function atualizarItem(index: number, campo: keyof KitItemInput, valor: unknown) {
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

    if (!nome.trim()) {
      setErro('O nome do kit é obrigatório (ex.: Kit Podas).')
      return
    }

    const itensFiltrados = itens.filter(
      (it) => it.descricao_material && it.descricao_material.trim().length > 0,
    )

    setAGravar(true)
    try {
      if (modoEdicao && kitParaEditar) {
        await atualizarKit(
          kitParaEditar.id,
          {
            nome: nome.trim(),
            ativo: kitParaEditar.ativo ?? true,
            itens: itensFiltrados,
          },
        )
      } else {
        await criarKit({
          nome: nome.trim(),
          ativo: true,
          itens: itensFiltrados,
        })
      }
      onGuardado()
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gravar kit.')
    } finally {
      setAGravar(false)
    }
  }

  async function handleDesativar() {
    if (!kitParaEditar) return
    setAGravar(true)
    try {
      await desativarKit(kitParaEditar.id)
      onGuardado()
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao desativar kit.')
      setAGravar(false)
    }
  }

  async function handleEliminar() {
    if (!kitParaEditar) return
    setAGravar(true)
    try {
      await apagarKit(kitParaEditar.id)
      onGuardado()
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao eliminar kit.')
      setAGravar(false)
    }
  }

  async function handleReativar() {
    if (!kitParaEditar) return
    setAGravar(true)
    const itensFiltrados = itens
      .map((it) => ({
        descricao_material: it.descricao_material.trim(),
        quantidade: it.quantidade && it.quantidade > 0 ? it.quantidade : null,
      }))
      .filter((it) => it.descricao_material.length > 0)

    try {
      await atualizarKit(kitParaEditar.id, {
        nome: nome.trim(),
        ativo: true,
        itens: itensFiltrados,
      })
      onGuardado()
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao reativar kit.')
      setAGravar(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
      <div className="flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
        {/* Topo */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">
            {modoEdicao ? 'Editar Kit de Ferramentas' : 'Novo Kit de Ferramentas'}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1 text-muted hover:bg-page hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={submeter} className="flex flex-col gap-4 overflow-y-auto p-5">
          {erro && (
            <div className="rounded-lg border border-line bg-[#fdf2f2] p-3 text-xs text-[#c53030]">
              {erro}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Nome do Kit *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Kit Corte de Relva, Kit Podas de Altura"
              required
              className="w-full rounded-lg border border-line bg-surface p-2.5 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          {/* Lista de Ferramentas / Itens */}
          <div className="rounded-xl border border-line bg-[#fafaf8] p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-ink">
                  Ferramentas & Itens Incluídos
                </span>
                <p className="text-[11px] text-muted">
                  Ferramentas que compõem este kit.
                </p>
              </div>
              <button
                type="button"
                onClick={adicionarLinhaItem}
                className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink hover:bg-page transition-colors"
              >
                + Adicionar item
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {itens.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={it.descricao_material}
                    onChange={(e) =>
                      atualizarItem(idx, 'descricao_material', e.target.value)
                    }
                    placeholder="Descrição da ferramenta ou item (ex.: Cortador)"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-surface p-2 text-xs focus:border-ink focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={it.quantidade ?? ''}
                    onChange={(e) =>
                      atualizarItem(
                        idx,
                        'quantidade',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    placeholder="Qtd (opcional)"
                    className="w-24 rounded-lg border border-line bg-surface p-2 text-xs focus:border-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removerItem(idx)}
                    className="p-1 text-muted hover:text-[#c53030] transition-colors"
                    title="Remover ferramenta"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>


          {/* Ações destrutivas / reativação quando em edição */}
          {modoEdicao && kitParaEditar && (
            <div className="mt-2 flex flex-col gap-2 border-t border-line-soft pt-3">
              {/* Confirmação de Eliminar Definitivamente */}
              {confirmarEliminar ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[#f5c6cb] bg-[#fdf2f2] p-2.5">
                  <span className="text-xs font-medium text-[#c53030]">
                    Eliminar kit e todas as suas ferramentas definitivamente?
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmarEliminar(false)}
                      className="rounded border border-line bg-surface px-2.5 py-1 text-xs text-muted hover:text-ink transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleEliminar}
                      disabled={aGravar}
                      className="rounded bg-[#c53030] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      Sim, eliminar
                    </button>
                  </div>
                </div>
              ) : confirmarDesativar ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-[#fbfbf9] p-2.5">
                  <span className="text-xs text-ink-soft">
                    Desativar este kit do catálogo de ferramentas?
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmarDesativar(false)}
                      className="rounded border border-line bg-surface px-2.5 py-1 text-xs text-muted hover:text-ink transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleDesativar}
                      disabled={aGravar}
                      className="rounded bg-ink px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      Sim, desativar
                    </button>
                  </div>
                </div>
              ) : kitParaEditar.ativo !== false ? (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmarEliminar(true)
                      setConfirmarDesativar(false)
                    }}
                    className="text-xs text-[#c53030] hover:underline transition-colors"
                  >
                    Eliminar kit definitivamente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmarDesativar(true)
                      setConfirmarEliminar(false)
                    }}
                    className="text-xs text-muted hover:text-ink underline transition-colors"
                  >
                    Desativar kit
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleReativar}
                  disabled={aGravar}
                  className="text-xs font-medium text-[#2b6cb0] hover:underline transition-colors text-left"
                >
                  ✓ Reativar este kit no catálogo
                </button>
              )}
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onFechar}
              disabled={aGravar}
              className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-page transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={aGravar}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {aGravar ? 'A guardar…' : modoEdicao ? 'Guardar alterações' : 'Criar kit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
