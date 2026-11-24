import { describe, expect, it } from 'vitest'
import { tabelas2026 } from '../config/tabelas-2026'
import { EntradaInvalidaError } from './erros'
import { calcularFerias, diasDeDireito, type EntradaFerias } from './ferias'

// Casos com valores fictícios, calculados com as tabelas oficiais de 2026.
const calcular = (entrada: EntradaFerias) => calcularFerias(entrada, tabelas2026)
const valor = (r: ReturnType<typeof calcular>, descricao: string) =>
  r.linhas.find((l) => l.descricao === descricao)?.valorCentavos ?? 0

describe('dias de direito (art. 130)', () => {
  it('reduz os dias conforme as faltas', () => {
    const casos: [number, number][] = [
      [0, 30],
      [5, 30],
      [6, 24],
      [14, 24],
      [15, 18],
      [23, 18],
      [24, 12],
      [32, 12],
      [33, 0],
    ]
    for (const [faltas, dias] of casos) expect(diasDeDireito(faltas)).toBe(dias)
  })
})

describe('férias – gozo', () => {
  it('30 dias com salário de R$ 3.000: IRRF zerado pela redução', () => {
    const r = calcular({ tipo: 'gozo', salarioCentavos: 300_000 })
    expect(valor(r, 'Férias')).toBe(300_000)
    expect(valor(r, '1/3 constitucional sobre férias')).toBe(100_000)
    // INSS sobre 4.000: 4.000 × 12% − 111,40 = 368,60
    expect(valor(r, 'INSS sobre férias')).toBe(36_860)
    expect(valor(r, 'IRRF sobre férias')).toBe(0)
    expect(r.liquidoCentavos).toBe(400_000 - 36_860)
  })

  it('20 dias + 10 de abono: abono e 1/3 sem INSS e IRRF', () => {
    const r = calcular({ tipo: 'gozo', salarioCentavos: 300_000, diasAbono: 10 })
    expect(r.diasPagos).toBe(20)
    expect(valor(r, 'Férias')).toBe(200_000)
    expect(valor(r, '1/3 constitucional sobre férias')).toBe(66_667)
    expect(valor(r, 'Abono pecuniário')).toBe(100_000)
    expect(valor(r, '1/3 sobre abono pecuniário')).toBe(33_333)
    // INSS só sobre 2.666,67: 1.621 × 7,5% + 1.045,67 × 9% = 215,6853
    expect(valor(r, 'INSS sobre férias')).toBe(21_569)
    expect(r.totalProventosCentavos).toBe(400_000)
  })

  it('usa o desconto simplificado quando é maior que as deduções legais', () => {
    // 30 dias de R$ 4.000: férias + 1/3 = 5.333,33; INSS 548,18 < 607,20
    const r = calcular({ tipo: 'gozo', salarioCentavos: 400_000 })
    expect(valor(r, 'INSS sobre férias')).toBe(54_818)
    // base 5.333,33 − 607,20 = 4.726,13 → 27,5% − 908,73 = 390,9558
    // redução 978,62 − 0,133145 × 5.333,33 = 268,5068
    expect(valor(r, 'IRRF sobre férias')).toBe(39_096 - 26_851)
  })

  it('salário alto: INSS no teto e IRRF sem redução', () => {
    const r = calcular({ tipo: 'gozo', salarioCentavos: 900_000, dependentes: 1 })
    expect(valor(r, 'INSS sobre férias')).toBe(98_809)
    // base 12.000 − 988,09 − 189,59 = 10.822,32 → 27,5% − 908,73 = 2.067,408
    expect(valor(r, 'IRRF sobre férias')).toBe(206_741)
  })

  it('faltas reduzem os dias de direito e o abono máximo', () => {
    const r = calcular({ tipo: 'gozo', salarioCentavos: 300_000, faltas: 10 })
    expect(r.diasDireito).toBe(24)
    expect(valor(r, 'Férias')).toBe(240_000)
    expect(() =>
      calcular({ tipo: 'gozo', salarioCentavos: 300_000, faltas: 10, diasAbono: 9 }),
    ).toThrow(EntradaInvalidaError)
  })

  it('soma a média de variáveis à base', () => {
    const r = calcular({ tipo: 'gozo', salarioCentavos: 250_000, mediaVariaveisCentavos: 50_000 })
    expect(valor(r, 'Férias')).toBe(300_000)
  })

  it('recusa combinações inválidas', () => {
    const base = { tipo: 'gozo' as const, salarioCentavos: 300_000 }
    expect(() => calcular({ ...base, diasAbono: 11 })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ ...base, diasGozo: 4 })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ ...base, diasGozo: 25, diasAbono: 10 })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ ...base, faltas: 33 })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ ...base, salarioCentavos: 0 })).toThrow(EntradaInvalidaError)
  })
})

describe('férias – proporcionais', () => {
  it('6 avos com sobra de 15 dias, sem descontos', () => {
    const r = calcular({
      tipo: 'proporcionais',
      salarioCentavos: 300_000,
      inicioPeriodoAquisitivo: '2026-03-10',
      dataSaida: '2026-08-24',
    })
    expect(r.avos).toBe(6)
    expect(valor(r, 'Férias proporcionais')).toBe(150_000)
    expect(valor(r, '1/3 constitucional sobre férias')).toBe(50_000)
    expect(r.totalDescontosCentavos).toBe(0)
    expect(r.liquidoCentavos).toBe(200_000)
  })

  it('faltas reduzem as proporcionais', () => {
    const r = calcular({
      tipo: 'proporcionais',
      salarioCentavos: 300_000,
      faltas: 10,
      inicioPeriodoAquisitivo: '2026-03-10',
      dataSaida: '2026-08-24',
    })
    expect(r.diasPagos).toBe(12)
    expect(valor(r, 'Férias proporcionais')).toBe(120_000)
    expect(valor(r, '1/3 constitucional sobre férias')).toBe(40_000)
  })

  it('período completo vira férias indenizadas de 12/12', () => {
    const r = calcular({
      tipo: 'proporcionais',
      salarioCentavos: 300_000,
      inicioPeriodoAquisitivo: '2025-03-10',
      dataSaida: '2026-03-09',
    })
    expect(r.avos).toBe(12)
    expect(valor(r, 'Férias indenizadas')).toBe(300_000)
  })

  it('exige as datas e na ordem certa', () => {
    const base = { tipo: 'proporcionais' as const, salarioCentavos: 300_000 }
    expect(() => calcular(base)).toThrow(EntradaInvalidaError)
    expect(() =>
      calcular({ ...base, inicioPeriodoAquisitivo: '2026-03-10', dataSaida: '2026-03-01' }),
    ).toThrow(EntradaInvalidaError)
  })
})
