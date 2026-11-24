/**
 * Roda depois do `vite build`. Para cada página de src/seo/paginas.json, grava
 * dist/<rota>/index.html com título, descrição, canonical, Open Graph e JSON-LD no HTML
 * (redes sociais e buscadores leem isso sem rodar o JavaScript). Gera também
 * 404.html, sitemap.xml e robots.txt.
 *
 * SITE_URL: endereço público sem barra no final (o workflow do GitHub Pages define).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// new URL() deixa o domínio em minúsculas (o dono do repositório pode ter maiúsculas).
const SITE_URL = new URL(
  process.env.SITE_URL ?? 'https://juanrochaz.github.io/calculadora-trabalhista',
).href.replace(/\/$/, '')
const DIST = 'dist'
const MARCADOR = '<!-- seo -->'
const IMAGEM = { caminho: '/og-image.png', largura: 1200, altura: 630 }

const paginas = JSON.parse(readFileSync('src/seo/paginas.json', 'utf8'))
const modelo = readFileSync(join(DIST, 'index.html'), 'utf8')
if (!modelo.includes(MARCADOR)) throw new Error(`index.html sem o marcador ${MARCADOR}`)

const escapar = (texto) =>
  texto.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const organizacao = {
  '@type': 'Organization',
  name: 'JR Dev',
  url: 'https://jrdevtecnologia.com.br',
  email: 'contato@jrdevtecnologia.com.br',
}

function dadosEstruturados(pagina, url) {
  const comum = {
    '@context': 'https://schema.org',
    name: pagina.nome,
    description: pagina.descricao,
    url,
    inLanguage: 'pt-BR',
    publisher: organizacao,
  }
  if (pagina.caminho === '/') return { ...comum, '@type': 'WebSite' }
  return {
    ...comum,
    '@type': 'WebApplication',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
  }
}

function tagsSeo(pagina, { indexar = true } = {}) {
  const url = SITE_URL + pagina.caminho
  const imagem = SITE_URL + IMAGEM.caminho
  const titulo = escapar(pagina.titulo)
  const descricao = escapar(pagina.descricao)
  const jsonLd = JSON.stringify(dadosEstruturados(pagina, url))
  if (jsonLd.includes('</')) throw new Error('JSON-LD não pode conter "</"')
  return [
    `<title>${titulo}</title>`,
    `<meta name="description" content="${descricao}" />`,
    indexar ? `<link rel="canonical" href="${url}" />` : '<meta name="robots" content="noindex" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="JR Dev" />',
    '<meta property="og:locale" content="pt_BR" />',
    `<meta property="og:title" content="${titulo}" />`,
    `<meta property="og:description" content="${descricao}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${imagem}" />`,
    `<meta property="og:image:width" content="${IMAGEM.largura}" />`,
    `<meta property="og:image:height" content="${IMAGEM.altura}" />`,
    '<meta property="og:image:alt" content="{jr}.dev – Calculadoras trabalhistas grátis" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${titulo}" />`,
    `<meta name="twitter:description" content="${descricao}" />`,
    `<meta name="twitter:image" content="${imagem}" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ')
}

function gravar(caminhoArquivo, conteudo) {
  const destino = join(DIST, caminhoArquivo)
  mkdirSync(dirname(destino), { recursive: true })
  writeFileSync(destino, conteudo)
  console.log(`  ${destino}`)
}

console.log('SEO: gerando páginas para', SITE_URL)
for (const pagina of paginas) {
  gravar(join(pagina.caminho, 'index.html'), modelo.replace(MARCADOR, tagsSeo(pagina)))
}

// 404: o GitHub Pages devolve este arquivo com status 404; o app mostra a página certa.
const inicio = paginas.find((p) => p.caminho === '/')
gravar(
  '404.html',
  modelo.replace(
    MARCADOR,
    tagsSeo({ ...inicio, titulo: 'Página não encontrada | JR Dev' }, { indexar: false }),
  ),
)

const hoje = new Date().toISOString().slice(0, 10)
gravar(
  'sitemap.xml',
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paginas.map(
      (p) =>
        `  <url><loc>${SITE_URL}${p.caminho}</loc><lastmod>${hoje}</lastmod><priority>${p.caminho === '/' ? '1.0' : '0.8'}</priority></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n'),
)

gravar('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
