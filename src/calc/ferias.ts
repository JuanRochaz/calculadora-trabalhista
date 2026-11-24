/**
 * Férias: gozo (com 1/3 e abono pecuniário) e proporcionais na rescisão.
 *
 * Regras (validadas pelo Juan):
 * - Base = salário + média de variáveis (opcional). Valor do dia = base ÷ 30.
 * - Dias de direito pelas faltas injustificadas no período aquisitivo (art. 130 da CLT).
 * - Gozo: férias + 1/3 sofrem INSS e IRRF. O IRRF é calculado em separado do salário,
 *   com a mesma regra do mês: desconto simplificado (se maior) e redução de 2026.
 * - Abono pecuniário: até 1/3 dos dias de direito (art. 143), + 1/3 sobre o abono.
 *   Abono e o seu 1/3 não têm INSS nem IRRF.
 * - Proporcionais (rescisão): avos do período aquisitivo (util.avosPorPeriodo) × dias de
 *   direito ÷ 12, + 1/3. São indenizadas: sem INSS e sem IRRF.
 */
import type { TabelasAno } from '../config/tabelas-2026'
import { calcularInss, calcularIrrf } from './descontos'
import { EntradaInvalidaError } from './erros'
import { montarResultado, referenciaIrrf, type Linha, type Resultado } from './resultado'
import { arredondarCentavos, avosPorPeriodo, lerData } from './util'

export type TipoFerias = 'gozo' | 'proporcionais'

/** Dias mínimos de um período de gozo (art. 134, § 1º, da CLT). */
export const DIAS_MINIMOS_GOZO = 5

export interface EntradaFerias {
  tipo: TipoFerias
  salarioCentavos: number
  mediaVariaveisCentavos?: number
  /** Faltas injustificadas no período aquisitivo. */
  faltas?: number

  /** Gozo: dias que o empregado vai tirar. Padrão: todos os dias de direito menos o abono. */
  diasGozo?: number
  /** Gozo: dias vendidos (abono pecuniário). */
  diasAbono?: number
  dependentes?: number
  pensaoAlimenticiaCentavos?: number

  /** Proporcionais: início do período aquisitivo em curso, AAAA-MM-DD. */
  inicioPeriodoAquisitivo?: string
  /** Proporcionais: data de saída (com a projeção do aviso indenizado, se houver). */
  dataSaida?: string
}

export interface ResultadoFerias extends Resultado {
  diasDireito: number
  /** Dias pagos: no gozo, os dias de férias; nas proporcionais, dias de direito × avos ÷ 12. */
  diasPagos: number
  diasAbono: number
  avos: number | null
}

/** Dias de férias conforme as faltas injustificadas (art. 130 da CLT). */
export function diasDeDireito(faltas: number): number {
  if (faltas <= 5) return 30
  if (faltas <= 14) return 24
  if (faltas <= 23) return 18
  if (faltas <= 32) return 12
  return 0
}

export function calcularFerias(entrada: EntradaFerias, tabelas: TabelasAno): ResultadoFerias {
  validarComum(entrada)
  const base = entrada.salarioCentavos + (entrada.mediaVariaveisCentavos ?? 0)
  const diasDireito = diasDeDireito(entrada.faltas ?? 0)
  return entrada.tipo === 'gozo'
    ? calcularGozo(entrada, base, diasDireito, tabelas)
    : calcularProporcionais(entrada, base, diasDireito)
}

function calcularGozo(
  entrada: EntradaFerias,
  base: number,
  diasDireito: number,
  tabelas: TabelasAno,
): ResultadoFerias {
  if (diasDireito === 0)
    throw new EntradaInvalidaError('Com mais de 32 faltas injustificadas não há direito a férias.')

  const diasAbono = entrada.diasAbono ?? 0
  const maximoAbono = Math.floor(diasDireito / 3)
  if (!Number.isInteger(diasAbono) || diasAbono < 0 || diasAbono > maximoAbono)
    throw new EntradaInvalidaError(`O abono pode ser de 0 a ${maximoAbono} dias.`)

  const diasGozo = entrada.diasGozo ?? diasDireito - diasAbono
  if (!Number.isInteger(diasGozo) || diasGozo < DIAS_MINIMOS_GOZO)
    throw new EntradaInvalidaError(`As férias devem ter pelo menos ${DIAS_MINIMOS_GOZO} dias.`)
  if (diasGozo + diasAbono > diasDireito)
    throw new EntradaInvalidaError(
      `Férias (${diasGozo}) + abono (${diasAbono}) passam dos ${diasDireito} dias de direito.`,
    )

  const valorDia = base / 30
  const ferias = arredondarCentavos(valorDia * diasGozo)
  const tercoFerias = arredondarCentavos((valorDia * diasGozo) / 3)
  const abono = arredondarCentavos(valorDia * diasAbono)
  const tercoAbono = arredondarCentavos((valorDia * diasAbono) / 3)

  const tributavel = ferias + tercoFerias
  const inss = calcularInss(tributavel, tabelas.inss)
  const irrf = calcularIrrf(
    {
      rendimentoTributavelCentavos: tributavel,
      inssCentavos: inss,
      dependentes: entrada.dependentes ?? 0,
      pensaoAlimenticiaCentavos: entrada.pensaoAlimenticiaCentavos,
    },
    tabelas.irrf,
  )

  const linhas: Linha[] = [
    {
      descricao: 'Férias',
      referencia: `${diasGozo} dias`,
      tipo: 'provento',
      valorCentavos: ferias,
    },
    {
      descricao: '1/3 constitucional sobre férias',
      referencia: '1/3',
      tipo: 'provento',
      valorCentavos: tercoFerias,
    },
    {
      descricao: 'Abono pecuniário',
      referencia: `${diasAbono} dias`,
      tipo: 'provento',
      valorCentavos: abono,
    },
    {
      descricao: '1/3 sobre abono pecuniário',
      referencia: '1/3',
      tipo: 'provento',
      valorCentavos: tercoAbono,
    },
    {
      descricao: 'INSS sobre férias',
      referencia: 'tabela progressiva',
      tipo: 'desconto',
      valorCentavos: inss,
    },
    {
      descricao: 'IRRF sobre férias',
      referencia: referenciaIrrf(irrf),
      tipo: 'desconto',
      valorCentavos: irrf.impostoCentavos,
      sempreMostrar: true,
    },
  ]

  return { ...montarResultado(linhas), diasDireito, diasPagos: diasGozo, diasAbono, avos: null }
}

function calcularProporcionais(
  entrada: EntradaFerias,
  base: number,
  diasDireito: number,
): ResultadoFerias {
  if (!entrada.inicioPeriodoAquisitivo)
    throw new EntradaInvalidaError('Informe o início do período aquisitivo.')
  if (!entrada.dataSaida) throw new EntradaInvalidaError('Informe a data de saída.')
  if (lerData(entrada.dataSaida) < lerData(entrada.inicioPeriodoAquisitivo))
    throw new EntradaInvalidaError('A saída não pode ser antes do início do período aquisitivo.')

  const avos = avosPorPeriodo(entrada.inicioPeriodoAquisitivo, entrada.dataSaida)
  const diasPagos = (diasDireito * avos) / 12
  const bruto = (base / 30) * diasPagos

  const linhas: Linha[] = [
    {
      descricao: avos === 12 ? 'Férias indenizadas' : 'Férias proporcionais',
      referencia: `${avos}/12 avos`,
      tipo: 'provento',
      valorCentavos: arredondarCentavos(bruto),
    },
    {
      descricao: '1/3 constitucional sobre férias',
      referencia: '1/3',
      tipo: 'provento',
      valorCentavos: arredondarCentavos(bruto / 3),
    },
  ]

  return { ...montarResultado(linhas), diasDireito, diasPagos, diasAbono: 0, avos }
}

function validarComum(entrada: EntradaFerias) {
  if (entrada.salarioCentavos <= 0) throw new EntradaInvalidaError('Informe o salário.')
  if ((entrada.mediaVariaveisCentavos ?? 0) < 0 || (entrada.pensaoAlimenticiaCentavos ?? 0) < 0)
    throw new EntradaInvalidaError('Os valores não podem ser negativos.')
  for (const [campo, valor] of [
    ['faltas', entrada.faltas],
    ['dependentes', entrada.dependentes],
  ] as const) {
    if (valor !== undefined && (!Number.isInteger(valor) || valor < 0))
      throw new EntradaInvalidaError(`Número de ${campo} inválido.`)
  }
}
