import { useEffect, useState, type FormEvent } from 'react'
import { criarVeiculo, atualizarVeiculo, desativarVeiculo } from '../data/queries'
import type { Veiculo } from '../types/db'

interface ModalVeiculoProps {
  aberto: boolean
  onFechar: () => void
  onGuardado: () => void
  veiculoParaEditar?: Veiculo | null
}

export function ModalVeiculo({
  aberto,
  onFechar,
  onGuardado,
  veiculoParaEditar,
}: ModalVeiculoProps) {
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [marca, setMarca] = useState('')
  const [ativo, setAtivo] = useState(true)

  const [aGravar, setAGravar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmarDesativar, setConfirmarDesativar] = useState(false)

  const modoEdicao = Boolean(veiculoParaEditar)

  useEffect(() => {
    if (veiculoParaEditar) {
      setNome(veiculoParaEditar.nome ?? '')
      setMatricula(veiculoParaEditar.matricula ?? '')
      setMarca(veiculoParaEditar.marca ?? '')
      setAtivo(veiculoParaEditar.ativo ?? true)
    } else {
      setNome('')
      setMatricula('')
      setMarca('')
      setAtivo(true)
    }
    setErro(null)
    setConfirmarDesativar(false)
  }, [veiculoParaEditar, aberto])

  if (!aberto) return null

  async function submeter(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!nome.trim()) {
      setErro('O nome do veículo é obrigatório (ex.: Berlingo).')
      return
    }

    setAGravar(true)
    try {
      if (modoEdicao && veiculoParaEditar) {
        await atualizarVeiculo(veiculoParaEditar.id, {
          nome: nome.trim(),
          matricula: matricula.trim() || null,
          marca: marca.trim() || null,
          ativo,
        })
      } else {
        await criarVeiculo({
          nome: nome.trim(),
          matricula: matricula.trim() || null,
          marca: marca.trim() || null,
          ativo,
        })
      }
      onGuardado()
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gravar veículo.')
    } finally {
      setAGravar(false)
    }
  }

  async function handleDesativar() {
    if (!veiculoParaEditar) return
    setAGravar(true)
    try {
      await desativarVeiculo(veiculoParaEditar.id)
      onGuardado()
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao desativar veículo.')
      setAGravar(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
      <div className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
        {/* Topo */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">
            {modoEdicao ? 'Editar Carrinha / Veículo' : 'Nova Carrinha / Veículo'}
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
              Nome de Identificação *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Berlingo, Toyota, Carrinha 1"
              required
              className="w-full rounded-lg border border-line bg-surface p-2.5 text-sm focus:border-ink focus:outline-none"
            />
            <span className="mt-1 block text-[11px] text-muted">
              Nome curto usado no planeamento diário e distribuição de equipas.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Matrícula
              </label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                placeholder="Ex.: 00-AA-00"
                className="w-full rounded-lg border border-line bg-surface p-2.5 font-mono text-sm uppercase focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Marca / Modelo
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ex.: Citroën Berlingo"
                className="w-full rounded-lg border border-line bg-surface p-2.5 text-sm focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="veiculo-ativo"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 rounded border-line text-ink focus:ring-0"
            />
            <label htmlFor="veiculo-ativo" className="text-xs font-medium text-ink cursor-pointer">
              Veículo ativo (disponível para planeamento)
            </label>
          </div>

          {/* Botão de desativar quando em edição */}
          {modoEdicao && (
            <div className="mt-2 border-t border-line-soft pt-3">
              {!confirmarDesativar ? (
                <button
                  type="button"
                  onClick={() => setConfirmarDesativar(true)}
                  className="text-xs text-muted hover:text-[#c53030] underline transition-colors"
                >
                  Desativar esta viatura
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-line bg-[#fbfbf9] p-2.5">
                  <span className="text-xs text-[#c53030]">Tens a certeza?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmarDesativar(false)}
                      className="text-xs text-muted hover:text-ink"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDesativar}
                      disabled={aGravar}
                      className="rounded bg-[#c53030] px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
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
              {aGravar ? 'A guardar…' : modoEdicao ? 'Guardar alterações' : 'Criar carrinha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
