import type { Resultado } from '../calc/resultado'
import { formatarReais } from '../calc/util'
import type { ItemPdf, SecaoPdf } from '../pdf/gerarPdf'
import BotaoPDF from './BotaoPDF'

const formatarDesconto = (centavos: number) =>
  centavos === 0 ? formatarReais(0) : `− ${formatarReais(centavos)}`

interface Props {
  titulo: string
  resultado: Resultado
  /** Informações extras mostradas acima da tabela (ex.: avos considerados). */
  resumo?: { rotulo: string; valor: string }[]
  /** Dados para o PDF: o que o usuário informou e seções extras (ex.: FGTS). */
  pdf?: { calculadora: string; dadosInformados: ItemPdf[]; extras?: SecaoPdf[] }
}

export default function ResultadoDetalhado({ titulo, resultado, resumo, pdf }: Props) {
  return (
    <section aria-live="polite" className="mt-12">
      <p className="font-mono text-xs text-texto-suave">02 / resultado</p>
      <h2 className="mt-2 text-2xl">{titulo}</h2>

      {resumo && resumo.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {resumo.map((r) => (
            <div key={r.rotulo}>
              <dt className="text-texto-suave">{r.rotulo}</dt>
              <dd className="font-mono">{r.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Celular: lista com o valor sempre visível ao lado de cada verba */}
      <div className="mt-6 overflow-hidden rounded-md border border-linha sm:hidden">
        <ul className="divide-y divide-linha text-sm">
          {resultado.linhas.map((l) => (
            <li key={l.descricao} className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p>{l.descricao}</p>
                {l.referencia && (
                  <p className="font-mono text-xs text-texto-suave">{l.referencia}</p>
                )}
              </div>
              <span
                className={`shrink-0 text-right font-mono ${l.tipo === 'desconto' ? 'text-erro' : ''}`}
              >
                {l.tipo === 'desconto'
                  ? formatarDesconto(l.valorCentavos)
                  : formatarReais(l.valorCentavos)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="divide-y divide-linha border-t border-linha bg-superficie text-sm">
          <div className="flex justify-between px-4 py-3">
            <dt className="font-medium">Total de proventos</dt>
            <dd className="font-mono">{formatarReais(resultado.totalProventosCentavos)}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="font-medium">Total de descontos</dt>
            <dd className="font-mono text-erro">
              {formatarDesconto(resultado.totalDescontosCentavos)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Telas maiores: tabela completa */}
      <div className="mt-6 hidden overflow-x-auto rounded-md border border-linha sm:block">
        <table className="w-full text-sm">
          <thead className="bg-superficie text-left text-xs text-texto-suave">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Verba
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Referência
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Proventos
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Descontos
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {resultado.linhas.map((l) => (
              <tr key={l.descricao} className="border-t border-linha">
                <th scope="row" className="px-4 py-3 text-left font-sans font-normal">
                  {l.descricao}
                </th>
                <td className="px-4 py-3 text-texto-suave">{l.referencia}</td>
                <td className="px-4 py-3 text-right">
                  {l.tipo === 'provento' ? formatarReais(l.valorCentavos) : ''}
                </td>
                <td className="px-4 py-3 text-right text-erro">
                  {l.tipo === 'desconto' ? formatarDesconto(l.valorCentavos) : ''}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-mono">
            <tr className="border-t border-linha bg-superficie">
              <th scope="row" colSpan={2} className="px-4 py-3 text-left font-sans font-medium">
                Totais
              </th>
              <td className="px-4 py-3 text-right">
                {formatarReais(resultado.totalProventosCentavos)}
              </td>
              <td className="px-4 py-3 text-right text-erro">
                {formatarDesconto(resultado.totalDescontosCentavos)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex items-baseline justify-between rounded-md border border-menta bg-menta-fundo px-4 py-4">
        <span className="font-medium">Valor líquido</span>
        <span className="font-mono text-2xl font-semibold text-menta">
          {formatarReais(resultado.liquidoCentavos)}
        </span>
      </div>

      {pdf && (
        <BotaoPDF
          calculadora={pdf.calculadora}
          parametros={{
            titulo,
            dadosInformados: pdf.dadosInformados,
            resumo,
            resultado,
            extras: pdf.extras,
          }}
        />
      )}
    </section>
  )
}
