import { describe, expect, it } from 'vitest'
import {
  anosCompletos,
  arredondarCentavos,
  avosPorMesCivil,
  avosPorPeriodo,
  diasCorridosInclusive,
  diasEntreDatas,
  formatarReais,
  lerData,
  somarMeses,
} from './util'

describe('datas', () => {
  it('rejeita data inválida ou inexistente', () => {
    expect(() => lerData('2026-13-01')).toThrow()
    expect(() => lerData('2026-02-30')).toThrow()
    expect(() => lerData('01/02/2026')).toThrow()
  })

  it('conta dias entre datas', () => {
    expect(diasEntreDatas('2026-01-01', '2026-01-31')).toBe(30)
    expect(diasCorridosInclusive('2026-01-01', '2026-01-31')).toBe(31)
    expect(diasCorridosInclusive('2026-03-10', '2026-03-10')).toBe(1)
    expect(() => diasCorridosInclusive('2026-03-10', '2026-03-09')).toThrow()
  })

  it('atravessa o horário de verão e anos bissextos', () => {
    expect(diasCorridosInclusive('2028-02-01', '2028-02-29')).toBe(29)
    expect(diasEntreDatas('2026-01-01', '2027-01-01')).toBe(365)
  })

  it('soma meses ajustando para o último dia do mês', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2028-01-31', 1)).toBe('2028-02-29')
    expect(somarMeses('2026-11-15', 3)).toBe('2027-02-15')
  })

  it('conta anos completos', () => {
    expect(anosCompletos('2020-05-10', '2026-05-09')).toBe(5)
    expect(anosCompletos('2020-05-10', '2026-05-10')).toBe(6)
  })
})

describe('avosPorMesCivil (13º)', () => {
  it('ano inteiro dá 12 avos', () => {
    expect(avosPorMesCivil('2020-03-01', '2026-12-31')).toBe(12)
  })

  it('mês da admissão conta se admitido até o dia 15', () => {
    expect(avosPorMesCivil('2026-03-01', '2026-12-31')).toBe(10)
    expect(avosPorMesCivil('2026-03-15', '2026-12-31')).toBe(10)
    // admitido dia 16 ou 17 não conta, mesmo com 15+ dias trabalhados em março
    expect(avosPorMesCivil('2026-03-16', '2026-12-31')).toBe(9)
    expect(avosPorMesCivil('2026-03-17', '2026-12-31')).toBe(9)
  })

  it('admissão em ano anterior não afeta o mesmo mês do ano atual', () => {
    expect(avosPorMesCivil('2025-03-20', '2026-12-31')).toBe(12)
  })

  it('desligamento no meio do mês', () => {
    expect(avosPorMesCivil('2025-01-01', '2026-07-15')).toBe(7)
    expect(avosPorMesCivil('2025-01-01', '2026-07-14')).toBe(6)
  })

  it('admitido e desligado no mesmo mês usa a regra dos 15 dias trabalhados', () => {
    expect(avosPorMesCivil('2026-04-10', '2026-04-24')).toBe(1)
    expect(avosPorMesCivil('2026-04-10', '2026-04-23')).toBe(0)
  })
})

describe('avosPorPeriodo (férias)', () => {
  it('período aquisitivo completo dá 12 avos', () => {
    expect(avosPorPeriodo('2025-03-10', '2026-03-09')).toBe(12)
    expect(avosPorPeriodo('2025-03-10', '2026-08-20')).toBe(12)
  })

  it('conta meses a partir da data de início, não do mês civil', () => {
    // 10/03 a 09/05 = 2 meses completos
    expect(avosPorPeriodo('2026-03-10', '2026-05-09')).toBe(2)
  })

  it('sobra de 15 dias ou mais conta mais 1 avo', () => {
    // 10/03 a 09/05 + 15 dias (10/05 a 24/05)
    expect(avosPorPeriodo('2026-03-10', '2026-05-24')).toBe(3)
    // só 14 dias de sobra
    expect(avosPorPeriodo('2026-03-10', '2026-05-23')).toBe(2)
  })

  it('menos de 15 dias no total dá zero', () => {
    expect(avosPorPeriodo('2026-03-10', '2026-03-23')).toBe(0)
  })
})

describe('arredondamento e formato', () => {
  it('arredonda centavos com metade para longe do zero', () => {
    expect(arredondarCentavos(1234.5)).toBe(1235)
    expect(arredondarCentavos(1234.49)).toBe(1234)
    expect(arredondarCentavos(-1234.5)).toBe(-1235)
    expect(arredondarCentavos((300000 / 30) * 7)).toBe(70000)
  })

  it('formata em reais', () => {
    expect(formatarReais(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56')
  })
})
