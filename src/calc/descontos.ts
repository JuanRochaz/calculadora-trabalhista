/**
 * Descontos de INSS (progressivo por faixas) e IRRF (tabela progressiva mensal,
 * desconto simplificado e redução de 2026).
 *
 * As funções recebem a tabela como parâmetro: os valores oficiais ficam só em
 * `config/tabelas-AAAA.ts`. Valores em centavos; arredonda só o resultado final.
 */
import type { TabelaInss, TabelaIrrf } from '../config/tabelas-2026'
import { arredondarCentavos } from './util'

export class TabelaNaoPreenchidaError extends Error {
  constructor(campo: string) {
    super(`Tabela incompleta: preencha "${campo}" em config/tabelas-AAAA.ts.`)
    this.name = 'TabelaNaoPreenchidaError'
  }
}

function exigir(valor: number | null, campo: string): number {
  if (valor === null) throw new TabelaNaoPreenchidaError(campo)
  return valor
}

/** INSS do empregado: cada faixa do salário paga a sua alíquota, até o teto. */
export function calcularInss(baseCentavos: number, tabela: TabelaInss): number {
  if (tabela.faixas.length === 0) throw new TabelaNaoPreenchidaError('inss.faixas')

  let total = 0
  let limiteAnterior = 0
  for (const faixa of tabela.faixas) {
    if (baseCentavos <= limiteAnterior) break
    const parteNaFaixa = Math.min(baseCentavos, faixa.ateCentavos) - limiteAnterior
    total += parteNaFaixa * faixa.aliquota
    limiteAnterior = faixa.ateCentavos
  }
  return arredondarCentavos(total)
}

export interface EntradaIrrf {
  /** Rendimento tributável bruto do mês (salário, horas extras etc.). */
  rendimentoTributavelCentavos: number
  /** INSS já calculado sobre esse rendimento. */
  inssCentavos: number
  dependentes: number
  pensaoAlimenticiaCentavos?: number
  /** Aplica a redução mensal de 2026 (vale também para o 13º). Padrão: sim. */
  aplicarReducao?: boolean
}

export interface ResultadoIrrf {
  deducoesLegaisCentavos: number
  usouDescontoSimplificado: boolean
  baseCalculoCentavos: number
  aliquota: number
  impostoTabelaCentavos: number
  reducaoCentavos: number
  impostoCentavos: number
}

export function calcularIrrf(entrada: EntradaIrrf, tabela: TabelaIrrf): ResultadoIrrf {
  if (tabela.faixas.length === 0) throw new TabelaNaoPreenchidaError('irrf.faixas')
  const deducaoDependente = exigir(
    tabela.deducaoPorDependenteCentavos,
    'irrf.deducaoPorDependenteCentavos',
  )
  const descontoSimplificado = exigir(
    tabela.descontoSimplificadoCentavos,
    'irrf.descontoSimplificadoCentavos',
  )

  const rendimento = entrada.rendimentoTributavelCentavos
  const deducoesLegais =
    entrada.inssCentavos +
    entrada.dependentes * deducaoDependente +
    (entrada.pensaoAlimenticiaCentavos ?? 0)

  // Usa o que for melhor para o empregado.
  const usouDescontoSimplificado = descontoSimplificado > deducoesLegais
  const deducao = usouDescontoSimplificado ? descontoSimplificado : deducoesLegais
  const base = Math.max(0, rendimento - deducao)

  const faixa = tabela.faixas.find((f) => f.ateCentavos === null || base <= f.ateCentavos)!
  const impostoTabela = arredondarCentavos(
    Math.max(0, base * faixa.aliquota - faixa.parcelaDeduzirCentavos),
  )

  const reducao =
    entrada.aplicarReducao === false
      ? 0
      : Math.min(impostoTabela, calcularReducao(rendimento, tabela))

  return {
    deducoesLegaisCentavos: deducoesLegais,
    usouDescontoSimplificado,
    baseCalculoCentavos: base,
    aliquota: faixa.aliquota,
    impostoTabelaCentavos: impostoTabela,
    reducaoCentavos: reducao,
    impostoCentavos: impostoTabela - reducao,
  }
}

/** Redução mensal de 2026, calculada sobre o rendimento tributável bruto. */
function calcularReducao(rendimentoCentavos: number, tabela: TabelaIrrf): number {
  const r = tabela.reducao
  const isencaoAte = exigir(r.isencaoAteCentavos, 'irrf.reducao.isencaoAteCentavos')
  const parcialAte = exigir(r.reducaoParcialAteCentavos, 'irrf.reducao.reducaoParcialAteCentavos')

  if (rendimentoCentavos <= isencaoAte) {
    return exigir(r.reducaoMaximaCentavos, 'irrf.reducao.reducaoMaximaCentavos')
  }
  if (rendimentoCentavos <= parcialAte) {
    const parcelaFixa = exigir(r.parcelaFixaCentavos, 'irrf.reducao.parcelaFixaCentavos')
    const coeficiente = exigir(r.coeficiente, 'irrf.reducao.coeficiente')
    return Math.max(0, arredondarCentavos(parcelaFixa - coeficiente * rendimentoCentavos))
  }
  return 0
}
