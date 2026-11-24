/** Formato comum do resultado de todas as calculadoras (tela e PDF). */

export type TipoLinha = 'provento' | 'desconto'

export interface Linha {
  descricao: string
  /** Referência mostrada ao lado (ex.: "10/12 avos", "14%"). */
  referencia: string
  tipo: TipoLinha
  valorCentavos: number
  /** Mostra a linha mesmo com valor zero (ex.: IRRF zerado pela redução). */
  sempreMostrar?: boolean
}

export interface Resultado {
  linhas: Linha[]
  totalProventosCentavos: number
  totalDescontosCentavos: number
  liquidoCentavos: number
}

/** Monta o resultado somando as linhas. Linhas com valor zero são omitidas, salvo `sempreMostrar`. */
export function montarResultado(linhas: Linha[]): Resultado {
  const visiveis = linhas.filter((l) => l.valorCentavos !== 0 || l.sempreMostrar)
  const soma = (tipo: TipoLinha) =>
    visiveis.filter((l) => l.tipo === tipo).reduce((total, l) => total + l.valorCentavos, 0)
  const totalProventosCentavos = soma('provento')
  const totalDescontosCentavos = soma('desconto')
  return {
    linhas: visiveis,
    totalProventosCentavos,
    totalDescontosCentavos,
    liquidoCentavos: totalProventosCentavos - totalDescontosCentavos,
  }
}

const formatoPercentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** 0.075 → "7,5%" */
export function formatarPercentual(fracao: number): string {
  return `${formatoPercentual.format(fracao * 100)}%`
}

/** Referência da linha de IRRF: deixa claro quando a redução de 2026 entrou. */
export function referenciaIrrf(irrf: {
  aliquota: number
  impostoTabelaCentavos: number
  reducaoCentavos: number
  impostoCentavos: number
}): string {
  if (irrf.impostoTabelaCentavos === 0) return 'isento'
  if (irrf.impostoCentavos === 0) return 'zerado pela redução'
  if (irrf.reducaoCentavos > 0) return `${formatarPercentual(irrf.aliquota)} − redução`
  return formatarPercentual(irrf.aliquota)
}
