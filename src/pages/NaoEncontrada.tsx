import { useEffect } from 'react'
import { Link } from 'react-router'

export default function NaoEncontrada() {
  useEffect(() => {
    document.title = 'Página não encontrada | JR Dev'
  }, [])
  return (
    <section>
      <p className="font-mono text-xs text-texto-suave">404 / página não encontrada</p>
      <h1 className="mt-2 text-4xl leading-tight">
        Essa página <span className="text-menta">não existe</span>
      </h1>
      <p className="mt-4 text-texto-suave">
        Confira o endereço ou volte para a{' '}
        <Link to="/" className="underline">
          lista de calculadoras
        </Link>
        .
      </p>
    </section>
  )
}
