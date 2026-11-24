import { describe, expect, it } from 'vitest'
import { tabelas2026 } from '../config/tabelas-2026'
import { EntradaInvalidaError } from './erros'
import { calcularRescisao, diasDeAviso, diasDeSaldo, type EntradaRescisao } from './rescisao'

// Casos com nomes e valores fictícios, calculados com as tabelas oficiais de 2026.
// Base comum: salário R$ 3.000, admissão 01/03/2023, comunicação em 10/06/2026,
// saldo do FGTS R$ 10.000.
const base: EntradaRescisao = {
  tipo: 'semJustaCausa',
  salarioCentavos: 300_000,
  admissao: '2023-03-01',
  dataDesligamento: '2026-06-10',
  saldoFgtsCentavos: 1_000_000,
}
const calcular = (entrada: Partial<EntradaRescisao>) =>
  calcularRescisao({ ...base, ...entrada }, tabelas2026)
const valor = (r: ReturnType<typeof calcular>, descricao: string) =>
  r.linhas.find((l) => l.descricao === descricao)?.valorCentavos ?? 0

describe('auxiliares', () => {
  it('aviso: 30 dias + 3 por ano completo, até 90', () => {
    expect(diasDeAviso('2026-01-05', '2026-12-20')).toBe(30)
    expect(diasDeAviso('2023-03-01', '2026-06-10')).toBe(39)
    expect(diasDeAviso('2023-03-01', '2026-02-28')).toBe(36)
    expect(diasDeAviso('1990-01-01', '2026-06-10')).toBe(90)
  })

  it('saldo de salário: dias do mês, mês inteiro = 30', () => {
    expect(diasDeSaldo('2023-03-01', '2026-06-10')).toBe(10)
    expect(diasDeSaldo('2023-03-01', '2026-02-28')).toBe(30)
    expect(diasDeSaldo('2023-03-01', '2026-07-31')).toBe(30)
    expect(diasDeSaldo('2026-06-05', '2026-06-20')).toBe(16)
  })
})

describe('sem justa causa', () => {
  it('aviso indenizado de 39 dias projeta 13º e férias', () => {
    const r = calcular({ aviso: 'indenizado' })
    expect(r.dataFimProjetada).toBe('2026-07-19')
    expect(valor(r, 'Saldo de salário')).toBe(100_000)
    expect(valor(r, 'Aviso prévio indenizado')).toBe(390_000)
    // 13º: 5 avos trabalhados (junho com 10 dias não conta) + 2 projetados (junho e julho)
    expect(r.avos13Trabalhados).toBe(5)
    expect(r.avos13Indenizados).toBe(2)
    expect(valor(r, '13º salário proporcional')).toBe(125_000)
    expect(valor(r, '13º salário indenizado (aviso)')).toBe(50_000)
    // férias: período desde 01/03/2026 até 19/07 projetado = 5 avos
    expect(r.avosFeriasProporcionais).toBe(5)
    expect(valor(r, 'Férias proporcionais')).toBe(125_000)
    expect(valor(r, '1/3 sobre férias proporcionais')).toBe(41_667)
    // descontos: INSS 7,5% sobre saldo e sobre 13º trabalhado
    expect(valor(r, 'INSS sobre saldo de salário')).toBe(7_500)
    expect(valor(r, 'INSS sobre 13º')).toBe(9_375)
    expect(r.totalProventosCentavos).toBe(831_667)
    expect(r.liquidoCentavos).toBe(831_667 - 16_875)
  })

  it('FGTS: 8% da rescisão e multa de 40% sobre saldo + depósitos', () => {
    const r = calcular({ aviso: 'indenizado' })
    // 8% × (1.000 + 3.900 + 1.250 + 500) = 532,00
    expect(r.fgts.depositoRescisaoCentavos).toBe(53_200)
    expect(r.fgts.multaCentavos).toBe(421_280)
    expect(r.fgts.saqueCentavos).toBe(1_000_000 + 53_200 + 421_280)
  })

  it('aviso trabalhado não paga nem projeta', () => {
    const r = calcular({ aviso: 'trabalhado' })
    expect(valor(r, 'Aviso prévio indenizado')).toBe(0)
    expect(r.avos13Indenizados).toBe(0)
    expect(r.avosFeriasProporcionais).toBe(3)
  })

  it('projeção que passa de dezembro e completa o período aquisitivo', () => {
    // admissão 06/01/2020, comunicação 10/12/2026, 48 dias → 27/01/2027
    const r = calcular({
      aviso: 'indenizado',
      admissao: '2020-01-06',
      dataDesligamento: '2026-12-10',
    })
    expect(r.diasAviso).toBe(48)
    expect(r.dataFimProjetada).toBe('2027-01-27')
    // 11 avos trabalhados; dezembro/2026 e janeiro/2027 vêm da projeção
    expect(r.avos13Trabalhados).toBe(11)
    expect(r.avos13Indenizados).toBe(2)
    // período 06/01/2026–05/01/2027 completa (12/12) e o seguinte tem 22 dias (1/12)
    expect(r.avosFeriasProporcionais).toBe(13)
    expect(valor(r, 'Férias proporcionais')).toBe(325_000)
  })

  it('férias vencidas, uma em dobro', () => {
    const r = calcular({ aviso: 'indenizado', periodosVencidos: 2, vencidaEmDobro: true })
    expect(valor(r, 'Férias vencidas')).toBe(900_000)
    expect(valor(r, '1/3 sobre férias vencidas')).toBe(300_000)
  })
})

describe('pedido de demissão', () => {
  it('aviso não cumprido: desconta 30 dias e não tem multa do FGTS', () => {
    const r = calcular({ tipo: 'pedidoDemissao', aviso: 'naoCumprido' })
    expect(valor(r, 'Aviso prévio indenizado')).toBe(0)
    expect(valor(r, 'Aviso prévio não cumprido')).toBe(300_000)
    expect(valor(r, 'Férias proporcionais')).toBe(75_000)
    expect(r.totalProventosCentavos).toBe(325_000)
    expect(r.liquidoCentavos).toBe(325_000 - 7_500 - 9_375 - 300_000)
    expect(r.fgts.multaCentavos).toBe(0)
    expect(r.fgts.saqueCentavos).toBe(0)
  })

  it('aviso indenizado não se aplica', () => {
    expect(() => calcular({ tipo: 'pedidoDemissao', aviso: 'indenizado' })).toThrow(
      EntradaInvalidaError,
    )
  })
})

describe('acordo (art. 484-A)', () => {
  it('metade do aviso, projeção da metade, multa de 20% e saque de 80%', () => {
    const r = calcular({ tipo: 'acordo', aviso: 'indenizado' })
    expect(r.diasAvisoPagos).toBe(19.5)
    expect(r.diasProjetados).toBe(19)
    expect(valor(r, 'Aviso prévio indenizado (metade)')).toBe(195_000)
    expect(r.avos13Indenizados).toBe(1)
    expect(r.avosFeriasProporcionais).toBe(4)
    // 8% × (1.000 + 1.950 + 1.250 + 250) = 356,00
    expect(r.fgts.depositoRescisaoCentavos).toBe(35_600)
    expect(r.fgts.multaCentavos).toBe(207_120)
    expect(r.fgts.saqueCentavos).toBe(828_480 + 207_120)
  })
})

describe('justa causa', () => {
  it('só saldo de salário e férias vencidas + 1/3', () => {
    const r = calcular({ tipo: 'justaCausa', periodosVencidos: 1 })
    expect(r.linhas.filter((l) => l.tipo === 'provento').map((l) => l.descricao)).toEqual([
      'Saldo de salário',
      'Férias vencidas',
      '1/3 sobre férias vencidas',
    ])
    expect(r.totalProventosCentavos).toBe(100_000 + 300_000 + 100_000)
    expect(r.fgts.multaCentavos).toBe(0)
  })

  it('desconta a 1ª parcela do 13º já paga', () => {
    const r = calcular({
      tipo: 'justaCausa',
      dataDesligamento: '2026-12-05',
      primeiraParcela13PagaCentavos: 150_000,
    })
    expect(valor(r, 'Adiantamento do 13º (1ª parcela)')).toBe(150_000)
  })
})

describe('validação', () => {
  it('recusa entradas inválidas', () => {
    expect(() => calcular({ dataDesligamento: '2023-01-01' })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ dataDesligamento: '2025-12-01' })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ periodosVencidos: 3 })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ vencidaEmDobro: true })).toThrow(EntradaInvalidaError)
    expect(() => calcular({ salarioCentavos: 0 })).toThrow(EntradaInvalidaError)
  })
})
