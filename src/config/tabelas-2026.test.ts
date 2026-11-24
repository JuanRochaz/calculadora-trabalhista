import { describe, expect, it } from 'vitest'
import { calcularInss, calcularIrrf } from '../calc/descontos'
import { tabelas2026 } from './tabelas-2026'

const { inss, irrf } = tabelas2026

describe('tabelas 2026: coerência das faixas', () => {
  it('INSS progressivo bate com a tabela de parcela a deduzir', () => {
    const parcelas = [0, 2_432, 11_140, 19_849]
    // Testa em vários salários de cada faixa (fórmula: salário × alíquota − parcela).
    for (const salario of [
      100_000, 162_100, 200_000, 290_284, 350_000, 435_427, 600_000, 847_555,
    ]) {
      const i = inss.faixas.findIndex((f) => salario <= f.ateCentavos)
      const esperado = Math.round(salario * inss.faixas[i].aliquota - parcelas[i])
      expect(Math.abs(calcularInss(salario, inss) - esperado)).toBeLessThanOrEqual(1)
    }
  })

  it('INSS no teto é R$ 988,09 e não passa disso', () => {
    expect(calcularInss(847_555, inss)).toBe(98_809)
    expect(calcularInss(2_000_000, inss)).toBe(98_809)
  })

  it('IRRF não salta nas fronteiras das faixas', () => {
    for (let i = 0; i < irrf.faixas.length - 1; i++) {
      const limite = irrf.faixas[i].ateCentavos!
      const naFaixa = limite * irrf.faixas[i].aliquota - irrf.faixas[i].parcelaDeduzirCentavos
      const proxima =
        limite * irrf.faixas[i + 1].aliquota - irrf.faixas[i + 1].parcelaDeduzirCentavos
      expect(Math.abs(naFaixa - proxima)).toBeLessThanOrEqual(1)
    }
  })

  it('redução é contínua: R$ 312,89 em R$ 5.000 e zero em R$ 7.350', () => {
    const r = irrf.reducao
    // A fórmula dá 312,895 em R$ 5.000; a lei publica 312,89 (truncado). Tolerância de 1 centavo.
    const emIsencao = r.parcelaFixaCentavos! - r.coeficiente! * r.isencaoAteCentavos!
    expect(Math.abs(emIsencao - r.reducaoMaximaCentavos!)).toBeLessThanOrEqual(1)
    const noLimite = r.parcelaFixaCentavos! - r.coeficiente! * r.reducaoParcialAteCentavos!
    expect(Math.abs(noLimite)).toBeLessThanOrEqual(1)
  })
})

describe('tabelas 2026: exemplos com salário fictício', () => {
  function irrfDoSalario(salario: number, dependentes = 0) {
    const inssCentavos = calcularInss(salario, inss)
    return calcularIrrf({ rendimentoTributavelCentavos: salario, inssCentavos, dependentes }, irrf)
  }

  it('salário de R$ 5.000,00 fica isento pela redução', () => {
    const r = irrfDoSalario(500_000)
    expect(r.impostoTabelaCentavos).toBeGreaterThan(0)
    expect(r.impostoCentavos).toBe(0)
  })

  it('salário de R$ 6.000,00: INSS R$ 641,51 e IRRF R$ 385,10', () => {
    expect(calcularInss(600_000, inss)).toBe(64_151)
    const r = irrfDoSalario(600_000)
    expect(r.usouDescontoSimplificado).toBe(false)
    expect(r.baseCalculoCentavos).toBe(535_849)
    expect(r.impostoTabelaCentavos).toBe(56_485)
    expect(r.reducaoCentavos).toBe(17_975)
    expect(r.impostoCentavos).toBe(38_510)
  })

  it('salário de R$ 10.000,00 não tem redução', () => {
    // INSS no teto 988,09 → base 9.011,91 → 27,5% − 908,73 = 1.569,546
    const r = irrfDoSalario(1_000_000)
    expect(r.reducaoCentavos).toBe(0)
    expect(r.impostoCentavos).toBe(156_955)
  })
})
