/**
 * PDF do resultado, na versão clara da marca JR Dev (a "planilha" do manual).
 * Função pura: recebe os dados prontos e devolve o documento; quem chama decide salvar.
 */
import { jsPDF } from 'jspdf'
import type { Resultado } from '../calc/resultado'
import { formatarReais } from '../calc/util'

export interface ItemPdf {
  rotulo: string
  valor: string
}

export interface SecaoPdf {
  titulo: string
  itens: ItemPdf[]
  nota?: string
}

export interface ParametrosPdf {
  titulo: string
  dadosInformados: ItemPdf[]
  resumo?: ItemPdf[]
  resultado: Resultado
  extras?: SecaoPdf[]
  geradoEm?: Date
}

type Cor = [number, number, number]
// Tokens do tema claro (manual da marca, nov/2026).
const COR = {
  texto: [23, 32, 38] as Cor, // #172026
  textoSuave: [85, 98, 108] as Cor, // #55626C
  menta: [14, 124, 90] as Cor, // #0E7C5A
  mentaFundo: [227, 244, 236] as Cor, // #E3F4EC
  superficie: [244, 246, 247] as Cor, // #F4F6F7
  linha: [211, 217, 222] as Cor, // #D3D9DE
  erro: [179, 54, 42] as Cor, // #B3362A
}

const AVISO_LEGAL =
  'Cálculo estimativo. Não considera convenção coletiva específica e não substitui o contador.'
const CTA = 'Precisa automatizar o RH da sua empresa? Fale com a JR Dev'
const CONTATO = 'jrdevtecnologia.com.br · contato@jrdevtecnologia.com.br'

const MARGEM = 16
const LARGURA = 210
const ALTURA = 297
const UTIL = LARGURA - 2 * MARGEM
const RODAPE = 26

/** As fontes padrão do PDF só têm o alfabeto latino básico: troca o que não existe nelas. */
const ESPACOS_ESPECIAIS = new RegExp(`[${String.fromCharCode(0xa0, 0x202f)}]`, 'g')
const TRACOS = new RegExp(`[${String.fromCharCode(0x2212, 0x2013, 0x2014)}]`, 'g')
const RETICENCIAS = new RegExp(String.fromCharCode(0x2026), 'g')

export function textoPdf(texto: string): string {
  return texto.replace(ESPACOS_ESPECIAIS, ' ').replace(TRACOS, '-').replace(RETICENCIAS, '...')
}

function formatarDesconto(centavos: number): string {
  return centavos === 0 ? formatarReais(0) : `- ${formatarReais(centavos)}`
}

export function gerarPdfResultado(p: ParametrosPdf): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const geradoEm = p.geradoEm ?? new Date()
  let y = MARGEM

  const cor = (c: Cor) => doc.setTextColor(...c)
  const fonte = (estilo: 'normal' | 'bold', tamanho: number, familia = 'helvetica') => {
    doc.setFont(familia, estilo)
    doc.setFontSize(tamanho)
  }
  const escrever = (texto: string, x: number, yy: number, opcoes?: { align?: 'right' }) =>
    doc.text(textoPdf(texto), x, yy, opcoes)
  const garantirEspaco = (altura: number) => {
    if (y + altura > ALTURA - RODAPE) {
      doc.addPage()
      y = MARGEM
    }
  }

  // Cabeçalho: logo {jr}.dev em texto mono e data
  fonte('bold', 18, 'courier')
  let x = MARGEM
  for (const [parte, c] of [
    ['{', COR.menta],
    ['jr', COR.texto],
    ['}', COR.menta],
    ['.dev', COR.textoSuave],
  ] as [string, Cor][]) {
    cor(c)
    doc.text(parte, x, y + 6)
    x += doc.getTextWidth(parte)
  }
  fonte('normal', 9)
  cor(COR.textoSuave)
  escrever('// calculadoras trabalhistas', LARGURA - MARGEM, y + 2, { align: 'right' })
  escrever(
    `Gerado em ${geradoEm.toLocaleDateString('pt-BR')} às ${geradoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    LARGURA - MARGEM,
    y + 7,
    { align: 'right' },
  )
  y += 12
  doc.setDrawColor(...COR.linha)
  doc.setLineWidth(0.3)
  doc.line(MARGEM, y, LARGURA - MARGEM, y)
  y += 10

  // Título
  fonte('bold', 18)
  cor(COR.texto)
  escrever(p.titulo, MARGEM, y)
  y += 8

  // Blocos de chave/valor em duas colunas
  const blocoItens = (rotuloBloco: string, itens: ItemPdf[]) => {
    if (itens.length === 0) return
    garantirEspaco(10)
    fonte('bold', 8, 'courier')
    cor(COR.menta)
    escrever(rotuloBloco, MARGEM, y)
    y += 5
    const colunas = 2
    const larguraColuna = UTIL / colunas
    for (let i = 0; i < itens.length; i += colunas) {
      garantirEspaco(10)
      itens.slice(i, i + colunas).forEach((item, j) => {
        const xx = MARGEM + j * larguraColuna
        fonte('normal', 8)
        cor(COR.textoSuave)
        escrever(item.rotulo, xx, y)
        fonte('bold', 10)
        cor(COR.texto)
        escrever(item.valor, xx, y + 4.5)
      })
      y += 10
    }
    y += 2
  }

  blocoItens('// dados informados', p.dadosInformados)
  blocoItens('// resumo', p.resumo ?? [])

  // Tabela do resultado
  const colunas = [
    { titulo: 'Verba', largura: 74, alinhar: 'left' as const },
    { titulo: 'Referência', largura: 38, alinhar: 'left' as const },
    { titulo: 'Proventos', largura: 33, alinhar: 'right' as const },
    { titulo: 'Descontos', largura: UTIL - 74 - 38 - 33, alinhar: 'right' as const },
  ]
  const xColuna = (i: number) => MARGEM + colunas.slice(0, i).reduce((s, c) => s + c.largura, 0)
  const celula = (texto: string, i: number, yy: number) => {
    const c = colunas[i]
    if (c.alinhar === 'right') escrever(texto, xColuna(i) + c.largura - 2, yy, { align: 'right' })
    else escrever(texto, xColuna(i) + 2, yy)
  }

  garantirEspaco(20)
  doc.setFillColor(...COR.superficie)
  doc.rect(MARGEM, y, UTIL, 8, 'F')
  fonte('bold', 8)
  cor(COR.textoSuave)
  colunas.forEach((c, i) => celula(c.titulo, i, y + 5.3))
  y += 8

  for (const l of p.resultado.linhas) {
    fonte('normal', 9)
    const verba = doc.splitTextToSize(textoPdf(l.descricao), colunas[0].largura - 4) as string[]
    const altura = Math.max(8, verba.length * 4 + 4)
    garantirEspaco(altura)
    cor(COR.texto)
    doc.text(verba, xColuna(0) + 2, y + 5.3)
    cor(COR.textoSuave)
    celula(l.referencia, 1, y + 5.3)
    cor(COR.texto)
    if (l.tipo === 'provento') celula(formatarReais(l.valorCentavos), 2, y + 5.3)
    else {
      cor(COR.erro)
      celula(formatarDesconto(l.valorCentavos), 3, y + 5.3)
    }
    y += altura
    doc.setDrawColor(...COR.linha)
    doc.line(MARGEM, y, LARGURA - MARGEM, y)
  }

  garantirEspaco(26)
  doc.setFillColor(...COR.superficie)
  doc.rect(MARGEM, y, UTIL, 8, 'F')
  fonte('bold', 9)
  cor(COR.texto)
  celula('Totais', 0, y + 5.3)
  celula(formatarReais(p.resultado.totalProventosCentavos), 2, y + 5.3)
  cor(COR.erro)
  celula(formatarDesconto(p.resultado.totalDescontosCentavos), 3, y + 5.3)
  y += 11

  // Valor líquido em destaque
  doc.setFillColor(...COR.mentaFundo)
  doc.setDrawColor(...COR.menta)
  doc.roundedRect(MARGEM, y, UTIL, 13, 2, 2, 'FD')
  fonte('bold', 11)
  cor(COR.texto)
  escrever('Valor líquido', MARGEM + 4, y + 8.3)
  fonte('bold', 15)
  cor(COR.menta)
  escrever(formatarReais(p.resultado.liquidoCentavos), LARGURA - MARGEM - 4, y + 8.6, {
    align: 'right',
  })
  y += 20

  // Seções extras (ex.: FGTS)
  for (const secao of p.extras ?? []) {
    garantirEspaco(10 + secao.itens.length * 6)
    fonte('bold', 11)
    cor(COR.texto)
    escrever(secao.titulo, MARGEM, y)
    y += 6
    for (const item of secao.itens) {
      fonte('normal', 9)
      cor(COR.textoSuave)
      escrever(item.rotulo, MARGEM, y)
      fonte('bold', 9)
      cor(COR.texto)
      escrever(item.valor, LARGURA - MARGEM, y, { align: 'right' })
      y += 5.5
    }
    if (secao.nota) {
      fonte('normal', 8)
      cor(COR.textoSuave)
      const nota = doc.splitTextToSize(textoPdf(secao.nota), UTIL) as string[]
      doc.text(nota, MARGEM, y)
      y += nota.length * 3.5
    }
    y += 5
  }

  // Rodapé em todas as páginas: aviso legal, CTA e número da página
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    const base = ALTURA - RODAPE + 4
    doc.setDrawColor(...COR.linha)
    doc.line(MARGEM, base, LARGURA - MARGEM, base)
    fonte('normal', 8)
    cor(COR.textoSuave)
    escrever(AVISO_LEGAL, MARGEM, base + 5)
    fonte('bold', 9)
    cor(COR.texto)
    escrever(CTA, MARGEM, base + 11)
    fonte('normal', 8)
    cor(COR.menta)
    escrever(CONTATO, MARGEM, base + 15.5)
    cor(COR.textoSuave)
    escrever(`${i}/${paginas}`, LARGURA - MARGEM, base + 15.5, { align: 'right' })
  }

  doc.setProperties({
    title: textoPdf(p.titulo),
    subject: 'Cálculo trabalhista estimativo',
    author: 'JR Dev – jrdevtecnologia.com.br',
    creator: 'Calculadoras trabalhistas JR Dev',
  })
  return doc
}

/** Nome do arquivo: "rescisao-jrdev-2026-11-24.pdf". */
export function nomeArquivoPdf(calculadora: string, data = new Date()): string {
  const dia = [data.getFullYear(), data.getMonth() + 1, data.getDate()]
    .map((n) => String(n).padStart(2, '0'))
    .join('-')
  return `${calculadora}-jrdev-${dia}.pdf`
}
