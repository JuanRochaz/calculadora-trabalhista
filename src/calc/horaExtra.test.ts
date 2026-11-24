import { describe, expect, it } from 'vitest'
import { tabelas2026 } from '../config/tabelas-2026'
import { EntradaInvalidaError } from './erros'
import {
  calcularHoraExtra,
  contarDomingos,
  divisorPorJornada,
  formatarHoras,
  lerHoras,
  type EntradaHoraExtra,
} from './horaExtra'

// Casos com valores fictícios, calculados com as tabelas oficiais de 2026.
const calcular = (entrada: Partial<EntradaHoraExtra>) =>
  calcularHoraExtra(
    {
      salarioCentavos: 220_000,
      divisor: 220,
      minutos50: 0,
      minutos100: 0,
      ano: 2026,
      mes: 3,
      ...entrada,
    },
    tabelas2026,
  )
const valor = (r: ReturnType<typeof calcular>, descricao: string) =>
  r.linhas.find((l) => l.descricao === descricao)?.valorCentavos ?? 0

describe('auxiliares', () => {
  it('divisor pela jornada semanal', () => {
    expect(divisorPorJornada(44)).toBe(220)
    expect(divisorPorJornada(42)).toBe(210)
    expect(divisorPorJornada(40)).toBe(200)
  })

  it('conta domingos do mês', () => {
    expect(contarDomingos(2026, 3)).toBe(5) // 1, 8, 15, 22, 29
    expect(contarDomingos(2026, 4)).toBe(4)
    expect(contarDomingos(2026, 2)).toBe(4)
  })

  it('lê horas em vários formatos', () => {
    expect(lerHoras('10:30')).toBe(630)
    expect(lerHoras('10h30')).toBe(630)
    expect(lerHoras('10h')).toBe(600)
    expect(lerHoras('10')).toBe(600)
    expect(lerHoras('10,5')).toBe(630)
    expect(lerHoras('0:45')).toBe(45)
    expect(lerHoras('')).toBe(0)
    expect(lerHoras('10:75')).toBeNull()
    expect(lerHoras('abc')).toBeNull()
    expect(formatarHoras(630)).toBe('10:30')
    expect(formatarHoras(45)).toBe('0:45')
  })
})

describe('horas extras', () => {
  it('salário de R$ 2.200 (hora de R$ 10): 10h a 50% e 5h a 100% em março', () => {
    const r = calcular({ minutos50: 600, minutos100: 300 })
    expect(r.valorHoraCentavos).toBe(1_000)
    expect(valor(r, 'Horas extras 50%')).toBe(15_000)
    expect(valor(r, 'Horas extras 100%')).toBe(10_000)
    // março/2026: 26 dias úteis (seg a sáb) e 5 domingos → 250 ÷ 26 × 5 = 48,0769
    expect(r.diasUteis).toBe(26)
    expect(valor(r, 'DSR sobre horas extras')).toBe(4_808)
    expect(r.totalProventosCentavos).toBe(249_808)
    // INSS: 1.621 × 7,5% + 876,88 × 9% = 200,5122
    expect(valor(r, 'INSS')).toBe(20_051)
    expect(valor(r, 'IRRF')).toBe(0)
    expect(r.liquidoCentavos).toBe(249_808 - 20_051)
  })

  it('feriado em dia útil entra no DSR e sai dos dias úteis', () => {
    // abril/2026: 30 dias, 4 domingos, 1 feriado (21/04) → 25 úteis, 5 de descanso
    const r = calcular({ minutos50: 600, minutos100: 300, mes: 4, feriados: 1 })
    expect(r.diasUteis).toBe(25)
    expect(valor(r, 'DSR sobre horas extras')).toBe(5_000)
  })

  it('divisor 200 (40h semanais) e horas quebradas', () => {
    // hora 15,00 × 1,5 × 2,5h = 56,25
    const r = calcular({ salarioCentavos: 300_000, divisor: 200, minutos50: 150 })
    expect(valor(r, 'Horas extras 50%')).toBe(5_625)
  })

  it('arredonda só cada verba no final', () => {
    // hora 2.500 ÷ 220 = 11,3636… × 1,5 = 17,0454…
    const r = calcular({ salarioCentavos: 250_000, minutos50: 60 })
    expect(valor(r, 'Horas extras 50%')).toBe(1_705)
    expect(r.valorHoraCentavos).toBe(1_136)
  })

  it('salário de R$ 7.000: IRRF sem redução', () => {
    // HE 10h a 50%: 477,2727; DSR 477,2727 ÷ 26 × 5 = 91,7832
    const r = calcular({ salarioCentavos: 700_000, minutos50: 600 })
    expect(valor(r, 'Horas extras 50%')).toBe(47_727)
    expect(valor(r, 'DSR sobre horas extras')).toBe(9_178)
    expect(r.totalProventosCentavos).toBe(756_905)
    expect(valor(r, 'INSS')).toBe(86_118)
    // base 7.569,05 − 861,18 = 6.707,87 → 27,5% − 908,73 = 935,934
    expect(valor(r, 'IRRF')).toBe(93_593)
  })

  it('recusa entradas inválidas', () => {
    expect(() => calcular({})).toThrow(EntradaInvalidaError)
    expect(() => calcular({ minutos50: 60, divisor: 0 })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ minutos50: 60, mes: 13 })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ minutos50: 60, ano: 2025 })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ minutos50: 60, feriados: -1 })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ minutos50: 60, salarioCentavos: 0 })).toThrow(EntradaInvalidaError)
  })
})
