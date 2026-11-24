import { Link } from 'react-router'

const calculadoras = [
  {
    caminho: '/rescisao',
    titulo: 'Rescisão',
    descricao: 'Verbas rescisórias por tipo de desligamento.',
  },
  { caminho: '/ferias', titulo: 'Férias', descricao: 'Integrais, proporcionais, 1/3 e abono.' },
  {
    caminho: '/decimo-terceiro',
    titulo: '13º salário',
    descricao: '1ª e 2ª parcela e proporcional.',
  },
  { caminho: '/horas-extras', titulo: 'Horas extras', descricao: '50%, 100% e reflexo no DSR.' },
]

export default function Home() {
  return (
    <section>
      <title>
        Calculadoras trabalhistas grátis 2026: rescisão, férias, 13º e horas extras | JR Dev
      </title>
      <meta
        name="description"
        content="Calcule de graça rescisão, férias, 13º salário e horas extras com as tabelas de INSS e IRRF de 2026. Tudo no navegador, sem cadastro."
      />
      <p className="font-mono text-xs text-texto-suave">01 / calculadoras</p>
      <h1 className="mt-2 text-4xl leading-tight">
        Calculadoras trabalhistas <span className="text-menta">grátis</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-texto-suave">
        Rescisão, férias, 13º e horas extras com o cálculo linha a linha. Tudo roda no seu
        navegador: nenhum dado é enviado.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {calculadoras.map((c, i) => (
          <li key={c.caminho}>
            <Link
              to={c.caminho}
              className="block h-full rounded-md border border-linha bg-superficie p-6 text-texto transition-colors hover:border-menta"
            >
              <span className="font-mono text-xs text-menta">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="mt-2 text-2xl">{c.titulo}</h2>
              <p className="mt-1 text-sm text-texto-suave">{c.descricao}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
