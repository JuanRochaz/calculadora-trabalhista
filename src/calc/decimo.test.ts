import { describe, expect, it } from 'vitest'
import { tabelas2026 } from '../config/tabelas-2026'
import { calcularDecimo, EntradaInvalidaError, type EntradaDecimo } from './decimo'

// Casos com valores fictícios, calculados com as tabelas oficiais de 2026.
const calcular = (entrada: EntradaDecimo) => calcularDecimo(entrada, tabelas2026)
const valor = (r: ReturnType<typeof calcular>, descricao: string) =>
  r.linhas.find((l) => l.descricao.startsWith(descricao))?.valorCentavos ?? 0

describe('13º – 1ª parcela', () => {
  it('ano completo: metade do salário, sem descontos', () => {
    const r = calcular({ tipo: 'primeira', salarioCentavos: 300_000, admissao: '2020-05-04' })
    expect(r.avos).toBe(12)
    expect(r.liquidoCentavos).toBe(150_000)
    expect(r.totalDescontosCentavos).toBe(0)
  })

  it('admitido até o dia 15 conta o mês; avos até dezembro', () => {
    const r = calcular({ tipo: 'primeira', salarioCentavos: 300_000, admissao: '2026-03-15' })
    expect(r.avos).toBe(10)
    expect(r.liquidoCentavos).toBe(125_000)
  })

  it('admitido no dia 16 não conta o mês', () => {
    const r = calcular({ tipo: 'primeira', salarioCentavos: 300_000, admissao: '2026-03-16' })
    expect(r.avos).toBe(9)
    expect(r.liquidoCentavos).toBe(112_500)
  })

  it('soma a média de variáveis à base', () => {
    const r = calcular({
      tipo: 'primeira',
      salarioCentavos: 250_000,
      mediaVariaveisCentavos: 50_000,
      admissao: '2020-05-04',
    })
    expect(r.liquidoCentavos).toBe(150_000)
  })
})

describe('13º – 2ª parcela', () => {
  it('salário de R$ 3.000: INSS R$ 248,60 e IRRF zerado pela redução', () => {
    const r = calcular({ tipo: 'segunda', salarioCentavos: 300_000, admissao: '2020-05-04' })
    expect(valor(r, '13º salário')).toBe(300_000)
    expect(valor(r, 'INSS')).toBe(24_860)
    expect(valor(r, 'IRRF')).toBe(0)
    expect(valor(r, 'Adiantamento')).toBe(150_000)
    expect(r.liquidoCentavos).toBe(125_140)
  })

  it('salário de R$ 6.000: INSS R$ 641,51 e IRRF R$ 385,10', () => {
    const r = calcular({ tipo: 'segunda', salarioCentavos: 600_000, admissao: '2020-05-04' })
    expect(valor(r, 'INSS')).toBe(64_151)
    expect(valor(r, 'IRRF')).toBe(38_510)
    expect(r.liquidoCentavos).toBe(600_000 - 64_151 - 38_510 - 300_000)
  })

  it('dependente reduz a base do IRRF', () => {
    const r = calcular({
      tipo: 'segunda',
      salarioCentavos: 600_000,
      admissao: '2020-05-04',
      dependentes: 1,
    })
    // base 5.358,49 − 189,59 = 5.168,90 → 27,5% − 908,73 = 512,7175 → 512,72 − redução 179,75
    expect(valor(r, 'IRRF')).toBe(33_297)
  })

  it('não usa o desconto simplificado no 13º', () => {
    // 13º de R$ 5.100: INSS 515,51 é menor que o simplificado (607,20), mas não pode trocar.
    // base 4.584,49 → 22,5% − 675,49 = 356,02 − redução 299,58 = 56,44
    const r = calcular({ tipo: 'segunda', salarioCentavos: 510_000, admissao: '2020-05-04' })
    expect(valor(r, 'INSS')).toBe(51_551)
    expect(valor(r, 'IRRF')).toBe(5_644)
  })

  it('usa a 1ª parcela informada quando foi paga sobre outro salário', () => {
    const r = calcular({
      tipo: 'segunda',
      salarioCentavos: 300_000,
      admissao: '2020-05-04',
      primeiraParcelaPagaCentavos: 140_000,
    })
    expect(valor(r, 'Adiantamento')).toBe(140_000)
    expect(r.liquidoCentavos).toBe(300_000 - 24_860 - 140_000)
  })
})

describe('13º – proporcional no desligamento', () => {
  it('desligado em 15/07 conta julho (7 avos)', () => {
    const r = calcular({
      tipo: 'proporcional',
      salarioCentavos: 300_000,
      admissao: '2024-02-01',
      dataDesligamento: '2026-07-15',
    })
    expect(r.avos).toBe(7)
    expect(valor(r, '13º salário proporcional')).toBe(175_000)
    // 1.621 × 7,5% + 129 × 9% = 133,185
    expect(valor(r, 'INSS')).toBe(13_319)
    expect(r.liquidoCentavos).toBe(175_000 - 13_319)
  })

  it('desligado em 14/07 não conta julho (6 avos)', () => {
    const r = calcular({
      tipo: 'proporcional',
      salarioCentavos: 300_000,
      admissao: '2024-02-01',
      dataDesligamento: '2026-07-14',
    })
    expect(r.avos).toBe(6)
    expect(valor(r, '13º salário proporcional')).toBe(150_000)
  })

  it('desconta a 1ª parcela já paga', () => {
    const r = calcular({
      tipo: 'proporcional',
      salarioCentavos: 300_000,
      admissao: '2024-02-01',
      dataDesligamento: '2026-12-10',
      primeiraParcelaPagaCentavos: 150_000,
    })
    expect(r.avos).toBe(11)
    expect(valor(r, 'Adiantamento')).toBe(150_000)
  })
})

describe('13º – validação', () => {
  it('recusa entradas inválidas', () => {
    const base = { salarioCentavos: 300_000, admissao: '2024-02-01' }
    expect(() => calcular({ ...base, tipo: 'proporcional' })).toThrow(EntradaInvalidaError)
    expect(() =>
      calcular({ ...base, tipo: 'proporcional', dataDesligamento: '2024-01-10' }),
    ).toThrow(EntradaInvalidaError)
    expect(() =>
      calcular({ ...base, tipo: 'proporcional', dataDesligamento: '2025-06-10' }),
    ).toThrow(EntradaInvalidaError)
    expect(() => calcular({ ...base, tipo: 'segunda', salarioCentavos: 0 })).toThrow(
      EntradaInvalidaError,
    )
    expect(() => calcular({ ...base, tipo: 'segunda', dependentes: -1 })).toThrow(
      EntradaInvalidaError,
    )
  })
})

describe('13º – linha do IRRF', () => {
  it('aparece com zero e explica quando a redução zera o imposto', () => {
    const r = calcular({ tipo: 'segunda', salarioCentavos: 300_000, admissao: '2020-05-04' })
    const irrf = r.linhas.find((l) => l.descricao.startsWith('IRRF'))
    expect(irrf?.valorCentavos).toBe(0)
    expect(irrf?.referencia).toBe('zerado pela redução')
  })

  it('mostra a alíquota com a redução parcial', () => {
    const r = calcular({ tipo: 'segunda', salarioCentavos: 600_000, admissao: '2020-05-04' })
    expect(r.linhas.find((l) => l.descricao.startsWith('IRRF'))?.referencia).toBe('27,5% − redução')
  })
})
