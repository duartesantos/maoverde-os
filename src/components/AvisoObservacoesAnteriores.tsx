import { useEffect, useState } from 'react'
import { getUltimasObservacoesJardim, type ObservacaoAnterior } from '../data/queries'
import { dataCurta } from '../lib/format'

interface AvisoObservacoesAnterioresProps {
  jardimId: string | null
  onCopiarParaObs: (texto: string) => void
}

export function AvisoObservacoesAnteriores({
  jardimId,
  onCopiarParaObs,
}: AvisoObservacoesAnterioresProps) {
  const [notas, setNotas] = useState<ObservacaoAnterior[]>([])
  const [loading, setLoading] = useState(false)
  const [mostrarPenultima, setMostrarPenultima] = useState(false)
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  useEffect(() => {
    if (!jardimId) {
      setNotas([])
      setMostrarPenultima(false)
      return
    }

    let ativo = true
    setLoading(true)

    getUltimasObservacoesJardim(jardimId, 2)
      .then((res) => {
        if (ativo) {
          setNotas(res)
          setMostrarPenultima(false)
        }
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })

    return () => {
      ativo = false
    }
  }, [jardimId])

  if (loading || !jardimId || notas.length === 0) {
    return null
  }

  const primeira = notas[0]
  const segunda = notas.length > 1 ? notas[1] : null

  function copiar(id: string, texto: string) {
    onCopiarParaObs(texto)
    setCopiadoId(id)
    setTimeout(() => {
      setCopiadoId(null)
    }, 2500)
  }

  return (
    <div className="rounded-xl border border-line bg-[#fcfbf9] p-3.5 space-y-2.5 transition-all">
      {/* 1. Primeira (última) observação — aberta por defeito */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <span>💬</span>
            <span>Última observação</span>
            <span className="font-normal text-[11.5px] text-muted">
              ({dataCurta(primeira.data)}
              {primeira.concluidoPorNome ? ` · ${primeira.concluidoPorNome}` : ''})
            </span>
          </div>

          <button
            type="button"
            onClick={() => copiar(primeira.id, primeira.observacoes)}
            title="Copiar texto para as observações da manutenção atual"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink shadow-xs hover:bg-page transition-colors active:scale-95"
          >
            {copiadoId === primeira.id ? (
              <span className="text-ok font-semibold">✓ Copiado para as notas!</span>
            ) : (
              <span>Copiar para notas</span>
            )}
          </button>
        </div>

        <div className="rounded-lg border border-line-soft bg-surface/90 p-2.5 text-[12.5px] text-ink-soft leading-relaxed italic">
          "{primeira.observacoes}"
        </div>
      </div>

      {/* 2. Penúltima observação — opcional / recolhida */}
      {segunda && (
        <div className="border-t border-line/60 pt-2">
          <button
            type="button"
            onClick={() => setMostrarPenultima((prev) => !prev)}
            className="flex items-center gap-1 text-[11.5px] font-medium text-muted hover:text-ink transition-colors"
          >
            <span>{mostrarPenultima ? '▴ Recolher penúltima observação' : '▾ Ver penúltima observação'}</span>
            <span className="text-faint font-normal">({dataCurta(segunda.data)})</span>
          </button>

          {mostrarPenultima && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-line-soft bg-surface/90 p-2.5 animate-fadeIn">
              <div className="flex items-center justify-between text-[11.5px] text-muted">
                <span>
                  {dataCurta(segunda.data)}
                  {segunda.concluidoPorNome ? ` · ${segunda.concluidoPorNome}` : ''}
                </span>

                <button
                  type="button"
                  onClick={() => copiar(segunda.id, segunda.observacoes)}
                  className="text-[11px] font-medium text-ink underline hover:opacity-80"
                >
                  {copiadoId === segunda.id ? (
                    <span className="text-ok font-semibold">✓ Copiado!</span>
                  ) : (
                    'Copiar para notas'
                  )}
                </button>
              </div>

              <p className="text-[12px] text-ink-soft leading-relaxed italic">
                "{segunda.observacoes}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
