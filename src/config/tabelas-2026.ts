/**
 * Tabelas oficiais usadas nos cálculos de 2026 (vigentes desde 01/01/2026).
 * Valores enviados e conferidos pelo Juan em 24/11/2026. Fontes:
 *  - Salário mínimo: Decreto nº 12.797/2025.
 *  - INSS: Portaria Interministerial MPS/MF nº 13/2026 (teto R$ 8.475,55; contribuição
 *    máxima do empregado R$ 988,09).
 *  - IRRF: tabela progressiva mensal da Receita Federal; desconto simplificado mensal;
 *    redução mensal da Lei nº 15.270/2025, que vale também para o 13º
 *    (art. 3º-A, § 3º, da Lei nº 9.250/1995).
 *
 * Valores monetários em centavos (inteiro). Alíquotas e coeficientes em fração
 * (ex.: 0.075 = 7,5%). Para trocar de ano, crie `tabelas-2027.ts` com o mesmo
 * formato e troque o export em `config/tabelas.ts`; as funções de cálculo não mudam.
 */

export interface FaixaInss {
  /** Limite superior da faixa, em centavos. A última faixa termina no teto. */
  ateCentavos: number
  aliquota: number
}

export interface FaixaIrrf {
  /** Limite superior da base de cálculo, em centavos. `null` na última faixa. */
  ateCentavos: number | null
  aliquota: number
  parcelaDeduzirCentavos: number
}

export interface ReducaoIrrf {
  /**
   * Até este rendimento tributável mensal, a redução zera o imposto
   * (limitada a `reducaoMaximaCentavos`).
   */
  isencaoAteCentavos: number | null
  reducaoMaximaCentavos: number | null
  /**
   * Acima da isenção e até este rendimento, a redução cai de forma linear:
   * redução = parcelaFixaCentavos - coeficiente × rendimento. Acima dele, não há redução.
   */
  reducaoParcialAteCentavos: number | null
  parcelaFixaCentavos: number | null
  coeficiente: number | null
}

export interface TabelaInss {
  faixas: FaixaInss[]
}

export interface TabelaIrrf {
  faixas: FaixaIrrf[]
  deducaoPorDependenteCentavos: number | null
  /** Desconto simplificado mensal: usado no lugar das deduções legais quando for maior. */
  descontoSimplificadoCentavos: number | null
  reducao: ReducaoIrrf
}

export interface TabelasAno {
  ano: number
  conferidaPeloJuan: boolean
  salarioMinimoCentavos: number | null
  inss: TabelaInss
  irrf: TabelaIrrf
}

export const tabelas2026: TabelasAno = {
  ano: 2026,
  conferidaPeloJuan: true,
  salarioMinimoCentavos: 162_100,
  inss: {
    // Progressivo: cada faixa paga a sua alíquota. Equivale à tabela com parcela a deduzir
    // (0 / 24,32 / 111,40 / 198,49).
    faixas: [
      { ateCentavos: 162_100, aliquota: 0.075 },
      { ateCentavos: 290_284, aliquota: 0.09 },
      { ateCentavos: 435_427, aliquota: 0.12 },
      { ateCentavos: 847_555, aliquota: 0.14 },
    ],
  },
  irrf: {
    faixas: [
      { ateCentavos: 242_880, aliquota: 0, parcelaDeduzirCentavos: 0 },
      { ateCentavos: 282_665, aliquota: 0.075, parcelaDeduzirCentavos: 18_216 },
      { ateCentavos: 375_105, aliquota: 0.15, parcelaDeduzirCentavos: 39_416 },
      { ateCentavos: 466_468, aliquota: 0.225, parcelaDeduzirCentavos: 67_549 },
      { ateCentavos: null, aliquota: 0.275, parcelaDeduzirCentavos: 90_873 },
    ],
    deducaoPorDependenteCentavos: 18_959,
    descontoSimplificadoCentavos: 60_720,
    reducao: {
      isencaoAteCentavos: 500_000,
      reducaoMaximaCentavos: 31_289,
      reducaoParcialAteCentavos: 735_000,
      parcelaFixaCentavos: 97_862,
      coeficiente: 0.133145,
    },
  },
}
