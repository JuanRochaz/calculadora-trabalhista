import { describe, expect, it } from 'vitest'
import type { TabelaInss, TabelaIrrf } from '../config/tabelas-2026'
import { calcularInss, calcularIrrf, TabelaNaoPreenchidaError } from './descontos'

// TABELAS FICTÍCIAS, com números redondos, só para testar a mecânica do cálculo.
// Não são as tabelas oficiais.
const inssFicticio: TabelaInss = {
  faixas: [
    { ateCentavos: 100_000, aliquota: 0.1 },
    { ateCentavos: 200_000, aliquota: 0.2 },
    { ateCentavos: 400_000, aliquota: 0.3 },
  ],
}

const irrfFicticio: TabelaIrrf = {
  faixas: [
    { ateCentavos: 200_000, aliquota: 0, parcelaDeduzirCentavos: 0 },
    { ateCentavos: 400_000, aliquota: 0.1, parcelaDeduzirCentavos: 20_000 },
    { ateCentavos: null, aliquota: 0.2, parcelaDeduzirCentavos: 60_000 },
  ],
  deducaoPorDependenteCentavos: 10_000,
  descontoSimplificadoCentavos: 50_000,
  reducao: {
    isencaoAteCentavos: 500_000,
    reducaoMaximaCentavos: 30_000,
    reducaoParcialAteCentavos: 700_000,
    parcelaFixaCentavos: 105_000,
    coeficiente: 0.15,
  },
}

describe('calcularInss', () => {
  it('salário só na primeira faixa', () => {
    expect(calcularInss(80_000, inssFicticio)).toBe(8_000)
  })

  it('soma as faixas de forma progressiva', () => {
    // 1.000 × 10% + 500 × 20%
    expect(calcularInss(150_000, inssFicticio)).toBe(20_000)
  })

  it('para no teto', () => {
    expect(calcularInss(500_000, inssFicticio)).toBe(90_000)
    expect(calcularInss(400_000, inssFicticio)).toBe(90_000)
  })

  it('arredonda só no final', () => {
    // 10.000 + 23.457 × 20% = 14.691,4
    expect(calcularInss(123_457, inssFicticio)).toBe(14_691)
  })

  it('exige a tabela preenchida', () => {
    expect(() => calcularInss(100_000, { faixas: [] })).toThrow(TabelaNaoPreenchidaError)
  })
})

describe('calcularIrrf', () => {
  it('usa o desconto simplificado quando é maior e a redução zera o imposto', () => {
    const r = calcularIrrf(
      { rendimentoTributavelCentavos: 300_000, inssCentavos: 30_000, dependentes: 0 },
      irrfFicticio,
    )
    expect(r.usouDescontoSimplificado).toBe(true)
    expect(r.baseCalculoCentavos).toBe(250_000)
    expect(r.impostoTabelaCentavos).toBe(5_000)
    expect(r.reducaoCentavos).toBe(5_000)
    expect(r.impostoCentavos).toBe(0)
  })

  it('sem a redução, cobra o imposto da tabela', () => {
    const r = calcularIrrf(
      {
        rendimentoTributavelCentavos: 300_000,
        inssCentavos: 30_000,
        dependentes: 0,
        aplicarReducao: false,
      },
      irrfFicticio,
    )
    expect(r.impostoCentavos).toBe(5_000)
  })

  it('usa as deduções legais quando são maiores e aplica a redução parcial', () => {
    const r = calcularIrrf(
      { rendimentoTributavelCentavos: 600_000, inssCentavos: 90_000, dependentes: 2 },
      irrfFicticio,
    )
    expect(r.usouDescontoSimplificado).toBe(false)
    expect(r.deducoesLegaisCentavos).toBe(110_000)
    expect(r.baseCalculoCentavos).toBe(490_000)
    expect(r.aliquota).toBe(0.2)
    expect(r.impostoTabelaCentavos).toBe(38_000)
    // 1.050 - 0,15 × 6.000 = 150
    expect(r.reducaoCentavos).toBe(15_000)
    expect(r.impostoCentavos).toBe(23_000)
  })

  it('acima do limite da redução, imposto cheio', () => {
    const r = calcularIrrf(
      { rendimentoTributavelCentavos: 1_000_000, inssCentavos: 90_000, dependentes: 0 },
      irrfFicticio,
    )
    expect(r.impostoTabelaCentavos).toBe(122_000)
    expect(r.reducaoCentavos).toBe(0)
    expect(r.impostoCentavos).toBe(122_000)
  })

  it('pensão alimentícia entra nas deduções legais', () => {
    const r = calcularIrrf(
      {
        rendimentoTributavelCentavos: 1_000_000,
        inssCentavos: 90_000,
        dependentes: 0,
        pensaoAlimenticiaCentavos: 100_000,
      },
      irrfFicticio,
    )
    expect(r.baseCalculoCentavos).toBe(810_000)
    expect(r.impostoCentavos).toBe(102_000)
  })

  it('exige a tabela preenchida', () => {
    const vazia: TabelaIrrf = { ...irrfFicticio, descontoSimplificadoCentavos: null }
    expect(() =>
      calcularIrrf(
        { rendimentoTributavelCentavos: 300_000, inssCentavos: 0, dependentes: 0 },
        vazia,
      ),
    ).toThrow(TabelaNaoPreenchidaError)
  })
})
