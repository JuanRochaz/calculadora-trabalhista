import { describe, expect, it } from 'vitest'
import { calcularRescisao } from '../calc/rescisao'
import { tabelas2026 } from '../config/tabelas-2026'
import { gerarPdfResultado, nomeArquivoPdf, textoPdf, type ParametrosPdf } from './gerarPdf'

// Dados fictícios.
function exemploRescisao(): ParametrosPdf {
  const resultado = calcularRescisao(
    {
      tipo: 'semJustaCausa',
      aviso: 'indenizado',
      salarioCentavos: 300_000,
      admissao: '2023-03-01',
      dataDesligamento: '2026-06-10',
      saldoFgtsCentavos: 1_000_000,
    },
    tabelas2026,
  )
  return {
    titulo: 'Rescisão – sem justa causa',
    dadosInformados: [
      { rotulo: 'Salário mensal', valor: 'R$ 3.000,00' },
      { rotulo: 'Admissão', valor: '01/03/2023' },
      { rotulo: 'Comunicação do aviso', valor: '10/06/2026' },
      { rotulo: 'Aviso prévio', valor: 'Indenizado' },
    ],
    resumo: [
      { rotulo: 'Aviso prévio', valor: '39 dias' },
      { rotulo: 'Projeção até', valor: '19/07/2026' },
    ],
    resultado,
    extras: [
      {
        titulo: 'FGTS',
        itens: [{ rotulo: 'Multa de 40%', valor: 'R$ 4.212,80' }],
        nota: 'A multa é depositada na conta do FGTS.',
      },
    ],
    geradoEm: new Date(2026, 10, 24, 15, 30),
  }
}

describe('PDF do resultado', () => {
  it('troca caracteres que as fontes padrão do PDF não têm', () => {
    const c = String.fromCharCode
    expect(textoPdf(`${c(0x2212)} R$${c(0xa0)}1,00 ${c(0x2013)} a${c(0x2026)}`)).toBe(
      '- R$ 1,00 - a...',
    )
    expect(textoPdf('Férias 1/3 ÷ 13º × ção')).toBe('Férias 1/3 ÷ 13º × ção')
  })

  it('gera um A4 com as linhas, o aviso legal e o contato', () => {
    const doc = gerarPdfResultado(exemploRescisao())
    expect(doc.getNumberOfPages()).toBe(1)
    const conteudo = doc.output()
    expect(conteudo.startsWith('%PDF-')).toBe(true)
    for (const trecho of [
      'Aviso pr',
      'Saldo de sal',
      'Valor l',
      'R$ 8.147,92',
      'contato@jrdevtecnologia.com.br',
      'substitui o contador',
    ]) {
      expect(conteudo).toContain(trecho)
    }
  })

  it('quebra a página quando o resultado é longo', () => {
    const p = exemploRescisao()
    const linhas = Array.from({ length: 40 }, (_, i) => ({
      ...p.resultado.linhas[0],
      descricao: `Verba ${i}`,
    }))
    const doc = gerarPdfResultado({ ...p, resultado: { ...p.resultado, linhas } })
    expect(doc.getNumberOfPages()).toBeGreaterThan(1)
  })

  it('nome do arquivo com a data', () => {
    expect(nomeArquivoPdf('rescisao', new Date(2026, 10, 4))).toBe('rescisao-jrdev-2026-11-04.pdf')
  })
})
