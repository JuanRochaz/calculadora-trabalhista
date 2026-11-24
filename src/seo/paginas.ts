import paginas from './paginas.json'

/** Título, descrição e caminho de cada página. Fonte única para o site e o build (SEO). */
export interface Pagina {
  caminho: string
  nome: string
  titulo: string
  descricao: string
}

export const PAGINAS: Pagina[] = paginas

export function pagina(caminho: string): Pagina {
  const encontrada = PAGINAS.find((p) => p.caminho === caminho)
  if (!encontrada) throw new Error(`Página sem SEO cadastrado: ${caminho}`)
  return encontrada
}
