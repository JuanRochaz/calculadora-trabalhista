/**
 * Horas extras de 50% e 100%, reflexo no DSR e o mês completo com INSS e IRRF.
 *
 * Regras (validadas pelo Juan):
 * - Valor-hora = salário ÷ divisor. Divisor = jornada semanal × 5 (44h → 220), editável.
 * - HE 50% = valor-hora × 1,5 × horas; HE 100% = valor-hora × 2 × horas.
 * - DSR = (total de HE ÷ dias úteis) × (domingos + feriados). Sábado é dia útil:
 *   dias úteis = dias do mês − domingos − feriados (que caem de segunda a sábado).
 * - INSS e IRRF do mês sobre salário + HE + DSR. IRRF com desconto simplificado e redução.
 */
import type { TabelasAno } from '../config/tabelas-2026'
import { calcularInss, calcularIrrf } from './descontos'
import { EntradaInvalidaError } from './erros'
import { montarResultado, referenciaIrrf, type Linha, type Resultado } from './resultado'
import { arredondarCentavos, ultimoDiaDoMes } from './util'

export interface EntradaHoraExtra {
  salarioCentavos: number
  divisor: number
  /** Total de minutos de HE a 50% no mês. */
  minutos50: number
  /** Total de minutos de HE a 100% no mês. */
  minutos100: number
  ano: number
  /** 1 a 12. */
  mes: number
  /** Feriados do mês que caem de segunda a sábado. */
  feriados?: number
  dependentes?: number
  pensaoAlimenticiaCentavos?: number
}

export interface ResultadoHoraExtra extends Resultado {
  valorHoraCentavos: number
  diasUteis: number
  domingos: number
  feriados: number
}

/** Divisor mensal a partir da jornada semanal (44h → 220). */
export function divisorPorJornada(horasSemanais: number): number {
  return horasSemanais * 5
}

/** Domingos de um mês (mes de 1 a 12). */
export function contarDomingos(ano: number, mes: number): number {
  let domingos = 0
  for (let dia = 1; dia <= ultimoDiaDoMes(ano, mes); dia++) {
    if (new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() === 0) domingos++
  }
  return domingos
}

/**
 * Lê horas digitadas como "10:30", "10h30", "10" ou "10,5" e devolve minutos.
 * Devolve `null` se o texto não for um horário válido.
 */
export function lerHoras(texto: string): number | null {
  const limpo = texto.trim().toLowerCase()
  if (limpo === '') return 0
  const hhmm = /^(\d{1,4})\s*[:h]\s*(\d{1,2})?$/.exec(limpo)
  if (hhmm) {
    const minutos = Number(hhmm[2] ?? 0)
    return minutos < 60 ? Number(hhmm[1]) * 60 + minutos : null
  }
  const decimal = /^(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(limpo)
  if (decimal) return Math.round(Number(`${decimal[1]}.${decimal[2] ?? 0}`) * 60)
  return null
}

/** 630 → "10:30" */
export function formatarHoras(minutos: number): string {
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`
}

export function calcularHoraExtra(
  entrada: EntradaHoraExtra,
  tabelas: TabelasAno,
): ResultadoHoraExtra {
  const feriados = entrada.feriados ?? 0
  validar(entrada, feriados, tabelas)

  const domingos = contarDomingos(entrada.ano, entrada.mes)
  const diasUteis = ultimoDiaDoMes(entrada.ano, entrada.mes) - domingos - feriados

  const valorHora = entrada.salarioCentavos / entrada.divisor
  const he50 = (valorHora * 1.5 * entrada.minutos50) / 60
  const he100 = (valorHora * 2 * entrada.minutos100) / 60
  const dsr = ((he50 + he100) / diasUteis) * (domingos + feriados)

  const proventos: Linha[] = [
    {
      descricao: 'Salário',
      referencia: '30 dias',
      tipo: 'provento',
      valorCentavos: entrada.salarioCentavos,
    },
    {
      descricao: 'Horas extras 50%',
      referencia: `${formatarHoras(entrada.minutos50)} h`,
      tipo: 'provento',
      valorCentavos: arredondarCentavos(he50),
    },
    {
      descricao: 'Horas extras 100%',
      referencia: `${formatarHoras(entrada.minutos100)} h`,
      tipo: 'provento',
      valorCentavos: arredondarCentavos(he100),
    },
    {
      descricao: 'DSR sobre horas extras',
      referencia: `${domingos + feriados}/${diasUteis} dias`,
      tipo: 'provento',
      valorCentavos: arredondarCentavos(dsr),
    },
  ]

  const tributavel = proventos.reduce((total, l) => total + l.valorCentavos, 0)
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
    ...proventos,
    { descricao: 'INSS', referencia: 'tabela progressiva', tipo: 'desconto', valorCentavos: inss },
    {
      descricao: 'IRRF',
      referencia: referenciaIrrf(irrf),
      tipo: 'desconto',
      valorCentavos: irrf.impostoCentavos,
      sempreMostrar: true,
    },
  ]

  return {
    ...montarResultado(linhas),
    valorHoraCentavos: arredondarCentavos(valorHora),
    diasUteis,
    domingos,
    feriados,
  }
}

function validar(entrada: EntradaHoraExtra, feriados: number, tabelas: TabelasAno) {
  if (entrada.salarioCentavos <= 0) throw new EntradaInvalidaError('Informe o salário.')
  if (!(entrada.divisor > 0)) throw new EntradaInvalidaError('O divisor deve ser maior que zero.')
  if (entrada.minutos50 < 0 || entrada.minutos100 < 0)
    throw new EntradaInvalidaError('As horas não podem ser negativas.')
  if (entrada.minutos50 + entrada.minutos100 === 0)
    throw new EntradaInvalidaError('Informe as horas extras do mês.')
  if (!Number.isInteger(entrada.mes) || entrada.mes < 1 || entrada.mes > 12)
    throw new EntradaInvalidaError('Mês inválido.')
  if (entrada.ano !== tabelas.ano)
    throw new EntradaInvalidaError(`Por enquanto, só há tabelas de ${tabelas.ano}.`)
  if (!Number.isInteger(feriados) || feriados < 0 || feriados > 10)
    throw new EntradaInvalidaError('Número de feriados inválido.')
  if ((entrada.pensaoAlimenticiaCentavos ?? 0) < 0)
    throw new EntradaInvalidaError('Os valores não podem ser negativos.')
}
