import { useState } from 'react'
import type { ParametrosPdf } from '../pdf/gerarPdf'

interface Props {
  /** Nome curto da calculadora, usado no nome do arquivo (ex.: "rescisao"). */
  calculadora: string
  parametros: ParametrosPdf
}

/** Gera o PDF no próprio navegador. O jsPDF só é baixado no primeiro clique. */
export default function BotaoPDF({ calculadora, parametros }: Props) {
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(false)

  async function baixar() {
    setGerando(true)
    setErro(false)
    try {
      const { gerarPdfResultado, nomeArquivoPdf } = await import('../pdf/gerarPdf')
      gerarPdfResultado(parametros).save(nomeArquivoPdf(calculadora))
    } catch {
      setErro(true)
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={baixar}
        disabled={gerando}
        className="rounded-md border border-menta px-5 py-2.5 font-medium text-menta hover:bg-menta-fundo focus:ring-2 focus:ring-menta/40 focus:outline-none disabled:opacity-60"
      >
        {gerando ? 'Gerando PDF…' : 'Baixar PDF'}
      </button>
      {erro && (
        <p role="alert" className="text-sm text-erro">
          Não foi possível gerar o PDF. Tente de novo.
        </p>
      )}
    </div>
  )
}
