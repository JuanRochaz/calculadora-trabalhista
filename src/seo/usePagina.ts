import { useEffect } from 'react'
import { pagina } from './paginas'

/**
 * Atualiza título, descrição e canonical ao navegar dentro do site.
 * No primeiro acesso, essas tags já vêm no HTML gerado no build (scripts/gerar-paginas.mjs).
 */
export function usePagina(caminho: string) {
  useEffect(() => {
    const p = pagina(caminho)
    document.title = p.titulo
    document.head.querySelector('meta[name="description"]')?.setAttribute('content', p.descricao)
    document.head
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', __SITE_URL__ + p.caminho)
  }, [caminho])
}
