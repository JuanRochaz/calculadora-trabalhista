/**
 * 13º salário: 1ª parcela (adiantamento), 2ª parcela e proporcional no desligamento.
 *
 * Regras (validadas pelo Juan):
 * - Base = salário + média de variáveis (horas extras, comissões etc., opcional).
 * - Avos por mês civil (util.avosPorMesCivil): mês da admissão conta se admitido até o dia 15;
 *   demais meses incompletos contam com 15 dias ou mais trabalhados.
 * - 1ª parcela: base ÷ 12 × avos até 31/12 ÷ 2, sem descontos.
 * - 2ª parcela: 13º do ano − INSS − IRRF − 1ª parcela. INSS e IRRF incidem sobre o 13º
 *   inteiro. IRRF exclusivo na fonte: só deduções legais (sem desconto simplificado) e
 *   com a redução de 2026.
 * - Proporcional: avos até a data de desligamento, com INSS e IRRF, menos a 1ª parcela
 *   se já tiver sido paga.
 */
import type { TabelasAno } from '../config/tabelas-2026'
import { calcularInss, calcularIrrf } from './descontos'
import { montarResultado, referenciaIrrf, type Linha, type Resultado } from './resultado'
import { arredondarCentavos, avosPorMesCivil, lerData } from './util'

export type TipoDecimo = 'primeira' | 'segunda' | 'proporcional'

export interface EntradaDecimo {
  tipo: TipoDecimo
  salarioCentavos: number
  mediaVariaveisCentavos?: number
  /** Data de admissão, AAAA-MM-DD. */
  admissao: string
  /** Obrigatória no proporcional: data de desligamento (com a projeção do aviso, se houver). */
  dataDesligamento?: string
  dependentes?: number
  pensaoAlimenticiaCentavos?: number
  /**
   * 1ª parcela já paga, a descontar. Na 2ª parcela, se não informada, usa a 1ª calculada.
   * No proporcional, se não informada, considera que não foi paga.
   */
  primeiraParcelaPagaCentavos?: number
}

export interface ResultadoDecimo extends Resultado {
  avos: number
  valorDecimoCentavos: number
}

export class EntradaInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'EntradaInvalidaError'
  }
}

export function calcularDecimo(entrada: EntradaDecimo, tabelas: TabelasAno): ResultadoDecimo {
  validar(entrada, tabelas)

  const base = entrada.salarioCentavos + (entrada.mediaVariaveisCentavos ?? 0)
  const fim = entrada.tipo === 'proporcional' ? entrada.dataDesligamento! : `${tabelas.ano}-12-31`
  const avos = avosPorMesCivil(entrada.admissao, fim)
  const referenciaAvos = `${avos}/12 avos`
  const valorDecimo = arredondarCentavos((base * avos) / 12)

  if (entrada.tipo === 'primeira') {
    const primeira = arredondarCentavos((base * avos) / 12 / 2)
    return {
      ...montarResultado([
        {
          descricao: '13º salário – 1ª parcela (adiantamento)',
          referencia: `${referenciaAvos} ÷ 2`,
          tipo: 'provento',
          valorCentavos: primeira,
        },
      ]),
      avos,
      valorDecimoCentavos: valorDecimo,
    }
  }

  const inss = calcularInss(valorDecimo, tabelas.inss)
  const irrf = calcularIrrf(
    {
      rendimentoTributavelCentavos: valorDecimo,
      inssCentavos: inss,
      dependentes: entrada.dependentes ?? 0,
      pensaoAlimenticiaCentavos: entrada.pensaoAlimenticiaCentavos,
      permitirDescontoSimplificado: false,
    },
    tabelas.irrf,
  )

  const adiantamento =
    entrada.primeiraParcelaPagaCentavos ??
    (entrada.tipo === 'segunda' ? arredondarCentavos((base * avos) / 12 / 2) : 0)

  const linhas: Linha[] = [
    {
      descricao: entrada.tipo === 'segunda' ? '13º salário' : '13º salário proporcional',
      referencia: referenciaAvos,
      tipo: 'provento',
      valorCentavos: valorDecimo,
    },
    {
      descricao: 'INSS sobre 13º',
      referencia: 'tabela progressiva',
      tipo: 'desconto',
      valorCentavos: inss,
    },
    {
      descricao: 'IRRF sobre 13º',
      referencia: referenciaIrrf(irrf),
      tipo: 'desconto',
      valorCentavos: irrf.impostoCentavos,
      sempreMostrar: true,
    },
    {
      descricao: 'Adiantamento do 13º (1ª parcela)',
      referencia: '',
      tipo: 'desconto',
      valorCentavos: adiantamento,
    },
  ]

  return { ...montarResultado(linhas), avos, valorDecimoCentavos: valorDecimo }
}

function validar(entrada: EntradaDecimo, tabelas: TabelasAno) {
  if (entrada.salarioCentavos <= 0) throw new EntradaInvalidaError('Informe o salário.')
  if ((entrada.mediaVariaveisCentavos ?? 0) < 0 || (entrada.primeiraParcelaPagaCentavos ?? 0) < 0)
    throw new EntradaInvalidaError('Os valores não podem ser negativos.')
  if ((entrada.dependentes ?? 0) < 0 || !Number.isInteger(entrada.dependentes ?? 0))
    throw new EntradaInvalidaError('Número de dependentes inválido.')

  const admissao = lerData(entrada.admissao)
  if (entrada.tipo === 'proporcional') {
    if (!entrada.dataDesligamento) throw new EntradaInvalidaError('Informe a data de desligamento.')
    const desligamento = lerData(entrada.dataDesligamento)
    if (desligamento < admissao)
      throw new EntradaInvalidaError('O desligamento não pode ser antes da admissão.')
    if (desligamento.getUTCFullYear() !== tabelas.ano)
      throw new EntradaInvalidaError(`Por enquanto, só há tabelas de ${tabelas.ano}.`)
  } else if (admissao.getUTCFullYear() > tabelas.ano) {
    throw new EntradaInvalidaError(`A admissão não pode ser depois de ${tabelas.ano}.`)
  }
}
