/**
 * Tabelas oficiais usadas nos cálculos de 2026.
 *
 * ATENÇÃO: os valores abaixo ainda NÃO foram preenchidos. Eles devem ser copiados
 * das fontes oficiais e conferidos pelo Juan antes de publicar:
 *  - INSS: gov.br/inss (Portaria Interministerial MPS/MF vigente) — data: ____
 *  - IRRF: gov.br/receitafederal (tabela progressiva mensal, desconto simplificado
 *    e redução mensal da lei de 2025 que vale a partir de 01/2026) — data: ____
 *  - Salário mínimo: decreto federal vigente — data: ____
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
  conferidaPeloJuan: false,
  salarioMinimoCentavos: null,
  inss: {
    faixas: [],
  },
  irrf: {
    faixas: [],
    deducaoPorDependenteCentavos: null,
    descontoSimplificadoCentavos: null,
    reducao: {
      isencaoAteCentavos: null,
      reducaoMaximaCentavos: null,
      reducaoParcialAteCentavos: null,
      parcelaFixaCentavos: null,
      coeficiente: null,
    },
  },
}
