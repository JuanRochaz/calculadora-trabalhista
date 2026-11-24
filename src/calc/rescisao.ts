/**
 * Rescisão: sem justa causa, pedido de demissão, acordo (art. 484-A) e justa causa.
 *
 * Regras (validadas pelo Juan):
 * - Saldo de salário: salário ÷ 30 × dias trabalhados no mês (mês inteiro = 30).
 *   INSS e IRRF do mês (com desconto simplificado e redução).
 * - Aviso prévio do empregador: 30 dias + 3 por ano completo, até 90.
 *   Indenizado projeta o tempo de serviço para 13º e férias. No acordo, paga e projeta
 *   só a metade. Aviso indenizado não tem INSS nem IRRF.
 * - Pedido de demissão com aviso não cumprido: desconto de 30 dias de salário.
 * - 13º: avos trabalhados com INSS e IRRF (calc/decimo); avos projetados pelo aviso em
 *   linha separada, sem descontos.
 * - Férias vencidas (períodos informados) + 1/3; uma delas pode ser em dobro (art. 137).
 *   Férias proporcionais + 1/3 (calc/ferias), exceto na justa causa. Sem descontos.
 * - FGTS: depósito de 8% sobre saldo de salário, aviso indenizado e 13º. Multa de 40%
 *   (sem justa causa) ou 20% (acordo) sobre saldo informado + depósitos da rescisão.
 *   A multa vai para a conta do FGTS: aparece no resumo, fora do líquido.
 */
import type { TabelasAno } from '../config/tabelas-2026'
import { calcularDecimo } from './decimo'
import { calcularInss, calcularIrrf } from './descontos'
import { EntradaInvalidaError } from './erros'
import { calcularFerias } from './ferias'
import { montarResultado, referenciaIrrf, type Linha, type Resultado } from './resultado'
import {
  anosCompletos,
  arredondarCentavos,
  avosPorMesCivil,
  diasCorridosInclusive,
  lerData,
  somarDias,
  somarMeses,
  ultimoDiaDoMes,
} from './util'

export type TipoRescisao = 'semJustaCausa' | 'pedidoDemissao' | 'acordo' | 'justaCausa'

/**
 * - indenizado: a empresa paga o aviso sem trabalho (sem justa causa e acordo).
 * - trabalhado: o aviso foi cumprido; os dias entram no saldo de salário.
 * - naoCumprido: pedido de demissão sem cumprir o aviso; a empresa desconta 30 dias.
 * - dispensado: pedido de demissão com o aviso dispensado pela empresa.
 */
export type TipoAviso = 'indenizado' | 'trabalhado' | 'naoCumprido' | 'dispensado'

export const AVISOS_POR_TIPO: Record<TipoRescisao, TipoAviso[]> = {
  semJustaCausa: ['indenizado', 'trabalhado'],
  acordo: ['indenizado', 'trabalhado'],
  pedidoDemissao: ['trabalhado', 'naoCumprido', 'dispensado'],
  justaCausa: [],
}

const PERCENTUAL_MULTA: Record<TipoRescisao, number> = {
  semJustaCausa: 0.4,
  acordo: 0.2,
  pedidoDemissao: 0,
  justaCausa: 0,
}

const ALIQUOTA_FGTS = 0.08
/** No acordo, o empregado saca até 80% do saldo do FGTS (art. 484-A, § 1º). */
const SAQUE_FGTS_ACORDO = 0.8

export interface EntradaRescisao {
  tipo: TipoRescisao
  /** Ignorado na justa causa. */
  aviso?: TipoAviso
  salarioCentavos: number
  mediaVariaveisCentavos?: number
  admissao: string
  /** Último dia trabalhado (com aviso indenizado, o dia da comunicação). */
  dataDesligamento: string
  /** Saldo do FGTS antes da rescisão (extrato). */
  saldoFgtsCentavos?: number
  /** Períodos de férias vencidas e não gozadas (0 a 2). */
  periodosVencidos?: number
  /** Um dos períodos vencidos passou do prazo de concessão: paga em dobro. */
  vencidaEmDobro?: boolean
  /** Faltas injustificadas no período aquisitivo em curso. */
  faltas?: number
  primeiraParcela13PagaCentavos?: number
  dependentes?: number
  pensaoAlimenticiaCentavos?: number
}

export interface ResumoFgts {
  depositoRescisaoCentavos: number
  percentualMulta: number
  multaCentavos: number
  /** Valor estimado para saque: saldo + depósitos (80% no acordo) + multa. */
  saqueCentavos: number
}

export interface ResultadoRescisao extends Resultado {
  diasAviso: number
  diasAvisoPagos: number
  diasProjetados: number
  dataFimProjetada: string
  diasSaldo: number
  avos13Trabalhados: number
  avos13Indenizados: number
  avosFeriasProporcionais: number
  fgts: ResumoFgts
}

/** Dias de aviso prévio pelo tempo de serviço: 30 + 3 por ano completo, até 90. */
export function diasDeAviso(admissao: string, desligamento: string): number {
  return Math.min(90, 30 + 3 * anosCompletos(admissao, desligamento))
}

/** Dias do saldo de salário no mês do desligamento (mês inteiro = 30). */
export function diasDeSaldo(admissao: string, desligamento: string): number {
  const data = lerData(desligamento)
  const ano = data.getUTCFullYear()
  const mes = data.getUTCMonth() + 1
  const primeiro = `${ano}-${String(mes).padStart(2, '0')}-01`
  const inicio = admissao > primeiro ? admissao : primeiro
  const mesInteiro = inicio === primeiro && data.getUTCDate() === ultimoDiaDoMes(ano, mes)
  return mesInteiro ? 30 : Math.min(30, diasCorridosInclusive(inicio, desligamento))
}

/** Avos de 13º até a data projetada, somando o ano seguinte se a projeção passar de dezembro. */
function avos13AteProjecao(admissao: string, desligamento: string, fimProjetado: string): number {
  const fimDoAno = `${lerData(desligamento).getUTCFullYear()}-12-31`
  if (fimProjetado <= fimDoAno) return avosPorMesCivil(admissao, fimProjetado)
  return avosPorMesCivil(admissao, fimDoAno) + avosPorMesCivil(admissao, fimProjetado)
}

export function calcularRescisao(entrada: EntradaRescisao, tabelas: TabelasAno): ResultadoRescisao {
  const aviso = validar(entrada, tabelas)
  const { tipo, admissao, dataDesligamento: desligamento, salarioCentavos: salario } = entrada
  const base = salario + (entrada.mediaVariaveisCentavos ?? 0)
  const valorDia = base / 30

  // Aviso prévio e projeção
  const diasAviso = diasDeAviso(admissao, desligamento)
  const indenizado = aviso === 'indenizado'
  const diasAvisoPagos = indenizado ? (tipo === 'acordo' ? diasAviso / 2 : diasAviso) : 0
  const diasProjetados = Math.floor(diasAvisoPagos)
  const fimProjetado = somarDias(desligamento, diasProjetados)

  // Saldo de salário (INSS e IRRF do mês)
  const diasSaldo = diasDeSaldo(admissao, desligamento)
  const saldo = arredondarCentavos((salario / 30) * diasSaldo)
  const inssSaldo = calcularInss(saldo, tabelas.inss)
  const irrfSaldo = calcularIrrf(
    {
      rendimentoTributavelCentavos: saldo,
      inssCentavos: inssSaldo,
      dependentes: entrada.dependentes ?? 0,
      pensaoAlimenticiaCentavos: entrada.pensaoAlimenticiaCentavos,
    },
    tabelas.irrf,
  )
  const valorAviso = arredondarCentavos(valorDia * diasAvisoPagos)

  const linhas: Linha[] = [
    {
      descricao: 'Saldo de salário',
      referencia: `${diasSaldo} dias`,
      tipo: 'provento',
      valorCentavos: saldo,
    },
    {
      descricao: tipo === 'acordo' ? 'Aviso prévio indenizado (metade)' : 'Aviso prévio indenizado',
      referencia: `${formatarDias(diasAvisoPagos)} dias`,
      tipo: 'provento',
      valorCentavos: valorAviso,
    },
  ]
  const descontos: Linha[] = [
    {
      descricao: 'INSS sobre saldo de salário',
      referencia: 'tabela progressiva',
      tipo: 'desconto',
      valorCentavos: inssSaldo,
    },
    {
      descricao: 'IRRF sobre saldo de salário',
      referencia: referenciaIrrf(irrfSaldo),
      tipo: 'desconto',
      valorCentavos: irrfSaldo.impostoCentavos,
      sempreMostrar: irrfSaldo.impostoTabelaCentavos > 0,
    },
  ]

  // 13º: trabalhado (com descontos) e indenizado pelo aviso (sem descontos)
  let avos13Trabalhados = 0
  let avos13Indenizados = 0
  let decimoTributavel = 0
  if (tipo !== 'justaCausa') {
    const decimo = calcularDecimo(
      {
        tipo: 'proporcional',
        salarioCentavos: salario,
        mediaVariaveisCentavos: entrada.mediaVariaveisCentavos,
        admissao,
        dataDesligamento: desligamento,
        dependentes: entrada.dependentes,
        pensaoAlimenticiaCentavos: entrada.pensaoAlimenticiaCentavos,
        primeiraParcelaPagaCentavos: entrada.primeiraParcela13PagaCentavos ?? 0,
      },
      tabelas,
    )
    avos13Trabalhados = decimo.avos
    avos13Indenizados = avos13AteProjecao(admissao, desligamento, fimProjetado) - decimo.avos
    decimoTributavel = decimo.valorDecimoCentavos
    for (const l of decimo.linhas) {
      if (l.tipo === 'provento') linhas.push(l)
      else descontos.push({ ...l, sempreMostrar: l.sempreMostrar && decimoTributavel > 0 })
    }
  } else if (entrada.primeiraParcela13PagaCentavos) {
    descontos.push({
      descricao: 'Adiantamento do 13º (1ª parcela)',
      referencia: '',
      tipo: 'desconto',
      valorCentavos: entrada.primeiraParcela13PagaCentavos,
    })
  }
  const decimoIndenizado = arredondarCentavos((base * avos13Indenizados) / 12)
  linhas.push({
    descricao: '13º salário indenizado (aviso)',
    referencia: `${avos13Indenizados}/12 avos`,
    tipo: 'provento',
    valorCentavos: decimoIndenizado,
  })

  // Férias vencidas (+ dobra) e proporcionais, todas indenizadas
  const periodos = entrada.periodosVencidos ?? 0
  const periodosPagos = periodos + (entrada.vencidaEmDobro ? 1 : 0)
  const vencidas = base * periodosPagos
  linhas.push(
    {
      descricao: 'Férias vencidas',
      referencia: entrada.vencidaEmDobro
        ? `${periodos} período(s), 1 em dobro`
        : `${periodos} período(s)`,
      tipo: 'provento',
      valorCentavos: arredondarCentavos(vencidas),
    },
    {
      descricao: '1/3 sobre férias vencidas',
      referencia: '1/3',
      tipo: 'provento',
      valorCentavos: arredondarCentavos(vencidas / 3),
    },
  )

  let avosFeriasProporcionais = 0
  if (tipo !== 'justaCausa') {
    // Período aquisitivo em curso no desligamento. Se a projeção do aviso completar esse
    // período, ele é pago inteiro (12/12) e o seguinte entra como proporcional.
    const inicioAtual = somarMeses(admissao, 12 * anosCompletos(admissao, desligamento))
    const inicioSeguinte = somarMeses(inicioAtual, 12)
    const periodos: [string, string][] = [
      [inicioAtual, fimProjetado < inicioSeguinte ? fimProjetado : somarDias(inicioSeguinte, -1)],
    ]
    if (fimProjetado >= inicioSeguinte) periodos.push([inicioSeguinte, fimProjetado])

    const avosPorPeriodo: number[] = []
    let feriasProp = 0
    let tercoProp = 0
    for (const [inicio, fim] of periodos) {
      const ferias = calcularFerias(
        {
          tipo: 'proporcionais',
          salarioCentavos: salario,
          mediaVariaveisCentavos: entrada.mediaVariaveisCentavos,
          faltas: entrada.faltas,
          inicioPeriodoAquisitivo: inicio,
          dataSaida: fim,
        },
        tabelas,
      )
      avosPorPeriodo.push(ferias.avos ?? 0)
      feriasProp += ferias.linhas[0]?.valorCentavos ?? 0
      tercoProp += ferias.linhas[1]?.valorCentavos ?? 0
    }
    avosFeriasProporcionais = avosPorPeriodo.reduce((a, b) => a + b, 0)
    linhas.push(
      {
        descricao: 'Férias proporcionais',
        referencia: avosPorPeriodo.map((a) => `${a}/12`).join(' + ') + ' avos',
        tipo: 'provento',
        valorCentavos: feriasProp,
      },
      {
        descricao: '1/3 sobre férias proporcionais',
        referencia: '1/3',
        tipo: 'provento',
        valorCentavos: tercoProp,
      },
    )
  }

  if (aviso === 'naoCumprido') {
    descontos.push({
      descricao: 'Aviso prévio não cumprido',
      referencia: '30 dias',
      tipo: 'desconto',
      valorCentavos: salario,
    })
  }

  // FGTS
  const depositoRescisao = arredondarCentavos(
    ALIQUOTA_FGTS * (saldo + valorAviso + decimoTributavel + decimoIndenizado),
  )
  const saldoFgts = entrada.saldoFgtsCentavos ?? 0
  const percentualMulta = PERCENTUAL_MULTA[tipo]
  const multa = arredondarCentavos((saldoFgts + depositoRescisao) * percentualMulta)
  const saque =
    tipo === 'semJustaCausa'
      ? saldoFgts + depositoRescisao + multa
      : tipo === 'acordo'
        ? arredondarCentavos((saldoFgts + depositoRescisao) * SAQUE_FGTS_ACORDO) + multa
        : 0

  return {
    ...montarResultado([...linhas, ...descontos]),
    diasAviso,
    diasAvisoPagos,
    diasProjetados,
    dataFimProjetada: fimProjetado,
    diasSaldo,
    avos13Trabalhados,
    avos13Indenizados,
    avosFeriasProporcionais,
    fgts: {
      depositoRescisaoCentavos: depositoRescisao,
      percentualMulta,
      multaCentavos: multa,
      saqueCentavos: saque,
    },
  }
}

const formatoDias = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
function formatarDias(dias: number): string {
  return formatoDias.format(dias)
}

function validar(entrada: EntradaRescisao, tabelas: TabelasAno): TipoAviso | null {
  if (entrada.salarioCentavos <= 0) throw new EntradaInvalidaError('Informe o salário.')
  for (const v of [
    entrada.mediaVariaveisCentavos,
    entrada.saldoFgtsCentavos,
    entrada.primeiraParcela13PagaCentavos,
    entrada.pensaoAlimenticiaCentavos,
  ]) {
    if ((v ?? 0) < 0) throw new EntradaInvalidaError('Os valores não podem ser negativos.')
  }
  const periodos = entrada.periodosVencidos ?? 0
  if (!Number.isInteger(periodos) || periodos < 0 || periodos > 2)
    throw new EntradaInvalidaError('Períodos de férias vencidas: de 0 a 2.')
  if (entrada.vencidaEmDobro && periodos === 0)
    throw new EntradaInvalidaError('Férias em dobro exigem pelo menos 1 período vencido.')

  const admissao = lerData(entrada.admissao)
  const desligamento = lerData(entrada.dataDesligamento)
  if (desligamento < admissao)
    throw new EntradaInvalidaError('O desligamento não pode ser antes da admissão.')
  if (desligamento.getUTCFullYear() !== tabelas.ano)
    throw new EntradaInvalidaError(`Por enquanto, só há tabelas de ${tabelas.ano}.`)

  const permitidos = AVISOS_POR_TIPO[entrada.tipo]
  if (permitidos.length === 0) return null
  const aviso = entrada.aviso ?? permitidos[0]
  if (!permitidos.includes(aviso))
    throw new EntradaInvalidaError('Tipo de aviso prévio não se aplica a esta rescisão.')
  return aviso
}
