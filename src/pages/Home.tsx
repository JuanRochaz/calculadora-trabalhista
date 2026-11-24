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
      <p className="text-texto-suave font-mono text-xs">01 / calculadoras</p>
      <h1 className="mt-2 text-4xl leading-tight">
        Calculadoras trabalhistas <span className="text-menta">grátis</span>
      </h1>
      <p className="text-texto-suave mt-4 max-w-2xl text-lg">
        Rescisão, férias, 13º e horas extras com o cálculo linha a linha. Tudo roda no seu
        navegador: nenhum dado é enviado.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {calculadoras.map((c, i) => (
          <li key={c.caminho}>
            <Link
              to={c.caminho}
              className="border-linha bg-superficie text-texto hover:border-menta block h-full rounded-md border p-6 transition-colors"
            >
              <span className="text-menta font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="mt-2 text-2xl">{c.titulo}</h2>
              <p className="text-texto-suave mt-1 text-sm">{c.descricao}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
