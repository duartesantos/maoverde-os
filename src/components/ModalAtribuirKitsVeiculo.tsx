import { useEffect, useState, type FormEvent } from 'react'
import { atualizarKitsDoVeiculo } from '../data/queries'
import type { KitComItensEVeiculos, VeiculoComKits } from '../types/db'

interface ModalAtribuirKitsVeiculoProps {
  aberto: boolean
  onFechar: () => void
  onGuardado: () => void
  veiculo: VeiculoComKits | null
  todosOsKits: KitComItensEVeiculos[]
}

export function ModalAtribuirKitsVeiculo({
  aberto,
  onFechar,
  onGuardado,
  veiculo,
  todosOsKits,
}: ModalAtribuirKitsVeiculoProps) {
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [aGravar, setAGravar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (veiculo) {
      setSelecionados(veiculo.kits.map((k) => k.id))
    } else {
      setSelecionados([])
    }
    setErro(null)
  }, [veiculo, aberto])

  if (!aberto || !veiculo) return null

  function toggleKit(kitId: string) {
    setSelecionados((atuais) =>
      atuais.includes(kitId)
        ? atuais.filter((id) => id !== kitId)
        : [...atuais, kitId],
    )
  }

  async function submeter(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAGravar(true)

    try {
      await atualizarKitsDoVeiculo(veiculo.id, selecionados)
      onGuardado()
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar kits da carrinha.')
    } finally {
      setAGravar(false)
    }
  }

  const kitsAtivos = todosOsKits.filter((k) => k.ativo !== false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
      <div className="flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
        {/* Topo */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Kits Associados</h2>
            <p className="text-xs text-muted">
              Carrinha: <span className="font-semibold text-ink">{veiculo.nome}</span>
              {veiculo.matricula && (
                <span className="ml-1 font-mono text-xs">({veiculo.matricula})</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1 text-muted hover:bg-page hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Lista de Kits com Checkbox */}
        <form onSubmit={submeter} className="flex flex-col gap-4 overflow-y-auto p-5">
          {erro && (
            <div className="rounded-lg border border-line bg-[#fdf2f2] p-3 text-xs text-[#c53030]">
              {erro}
            </div>
          )}

          <p className="text-xs text-muted leading-relaxed">
            Seleciona quais kits de ferramentas e equipamento estão atualmente associados a esta
            carrinha. Esta informação será visível ao planear serviços e para os jardineiros no
            terreno.
          </p>

          {kitsAtivos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-muted">
              Não existem kits criados no catálogo. Cria kits primeiro no separador de Kits.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {kitsAtivos.map((kit) => {
                const checked = selecionados.includes(kit.id)
                return (
                  <label
                    key={kit.id}
                    className={
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ' +
                      (checked
                        ? 'border-ink bg-page/40'
                        : 'border-line bg-surface hover:bg-page/20')
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKit(kit.id)}
                      className="mt-1 h-4 w-4 rounded border-line text-ink focus:ring-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-medium text-ink">{kit.nome}</span>
                      </div>

                      {kit.itens && kit.itens.length > 0 ? (
                        <p className="mt-1 text-[11.5px] text-muted line-clamp-2 leading-relaxed">
                          {kit.itens.map((it) => `${it.descricao_material}${it.quantidade ? ` (${it.quantidade})` : ''}`).join(', ')}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] italic text-faint">Sem itens detalhados.</p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-xs text-muted">
              {selecionados.length} kit(s) selecionado(s)
            </span>
            <div className="flex gap-2">
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
                {aGravar ? 'A guardar…' : 'Guardar kits associados'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
