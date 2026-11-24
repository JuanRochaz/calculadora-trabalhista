import { useState, type FormEvent } from 'react'
import { EntradaInvalidaError } from '../calc/erros'
import { calcularFerias, type ResultadoFerias, type TipoFerias } from '../calc/ferias'
import {
  BotaoCalcular,
  CampoData,
  CampoInteiro,
  CampoMoeda,
  CampoOpcoes,
  MensagemErro,
} from '../components/Formulario'
import ResultadoDetalhado from '../components/ResultadoDetalhado'
import { formatarDataBr, formatarReais } from '../calc/util'
import { tabelasVigentes } from '../config/tabelas'
import type { ItemPdf } from '../pdf/gerarPdf'

/** Inclui o item só se o valor existir (para os campos opcionais no PDF). */
const se = (condicao: unknown, item: ItemPdf): ItemPdf[] => (condicao ? [item] : [])

const tipos: { valor: TipoFerias; rotulo: string; descricao: string }[] = [
  {
    valor: 'gozo',
    rotulo: 'Férias a tirar',
    descricao: 'Férias + 1/3 e abono, com INSS e IRRF.',
  },
  {
    valor: 'proporcionais',
    rotulo: 'Proporcionais',
    descricao: 'Na rescisão, sem descontos.',
  },
]

const formatoDias = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export default function Ferias() {
  const [tipo, setTipo] = useState<TipoFerias>('gozo')
  const [salario, setSalario] = useState<number | null>(null)
  const [media, setMedia] = useState<number | null>(null)
  const [faltas, setFaltas] = useState<number | null>(null)
  const [diasGozo, setDiasGozo] = useState<number | null>(null)
  const [diasAbono, setDiasAbono] = useState<number | null>(null)
  const [dependentes, setDependentes] = useState<number | null>(null)
  const [pensao, setPensao] = useState<number | null>(null)
  const [inicio, setInicio] = useState('')
  const [saida, setSaida] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{
    tipo: TipoFerias
    dados: ResultadoFerias
    informados: ItemPdf[]
  } | null>(null)

  function calcular(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      if (tipo === 'proporcionais' && !inicio)
        throw new EntradaInvalidaError('Informe o início do período aquisitivo.')
      if (tipo === 'proporcionais' && !saida)
        throw new EntradaInvalidaError('Informe a data de saída.')
      const dados = calcularFerias(
        {
          tipo,
          salarioCentavos: salario ?? 0,
          mediaVariaveisCentavos: media ?? 0,
          faltas: faltas ?? 0,
          diasGozo: diasGozo ?? undefined,
          diasAbono: diasAbono ?? 0,
          dependentes: dependentes ?? 0,
          pensaoAlimenticiaCentavos: pensao ?? 0,
          inicioPeriodoAquisitivo: inicio || undefined,
          dataSaida: saida || undefined,
        },
        tabelasVigentes,
      )
      const informados: ItemPdf[] = [
        { rotulo: 'Salário mensal', valor: formatarReais(salario ?? 0) },
        ...se(media, { rotulo: 'Média de variáveis', valor: formatarReais(media ?? 0) }),
        { rotulo: 'Faltas injustificadas', valor: String(faltas ?? 0) },
        ...(tipo === 'gozo'
          ? [
              { rotulo: 'Dias vendidos', valor: String(diasAbono ?? 0) },
              { rotulo: 'Dependentes', valor: String(dependentes ?? 0) },
              ...se(pensao, { rotulo: 'Pensão alimentícia', valor: formatarReais(pensao ?? 0) }),
            ]
          : [
              { rotulo: 'Início do período aquisitivo', valor: formatarDataBr(inicio) },
              { rotulo: 'Data de saída', valor: formatarDataBr(saida) },
            ]),
      ]
      setResultado({ tipo, dados, informados })
    } catch (falha) {
      setResultado(null)
      if (falha instanceof Error) setErro(falha.message)
      else throw falha
    }
  }

  const resumo = resultado && [
    { rotulo: 'Dias de direito', valor: String(resultado.dados.diasDireito) },
    ...(resultado.tipo === 'gozo'
      ? [
          { rotulo: 'Dias de férias', valor: String(resultado.dados.diasPagos) },
          { rotulo: 'Dias vendidos', valor: String(resultado.dados.diasAbono) },
        ]
      : [
          { rotulo: 'Avos', valor: `${resultado.dados.avos}/12` },
          { rotulo: 'Dias proporcionais', valor: formatoDias.format(resultado.dados.diasPagos) },
        ]),
  ]

  return (
    <section>
      <title>Calculadora de férias 2026: 1/3, abono e proporcionais | JR Dev</title>
      <meta
        name="description"
        content="Calcule grátis as férias de 2026 com 1/3 constitucional, venda de 10 dias (abono pecuniário), INSS e IRRF com a redução de 2026, e férias proporcionais na rescisão."
      />

      <p className="font-mono text-xs text-texto-suave">01 / férias</p>
      <h1 className="mt-2 text-4xl leading-tight">
        Calculadora de <span className="text-menta">férias</span>
      </h1>
      <p className="mt-4 max-w-2xl text-texto-suave">
        Tabelas de INSS e IRRF de {tabelasVigentes.ano}, com a redução do imposto. As faltas
        injustificadas reduzem os dias de férias (art. 130 da CLT).
      </p>

      <form onSubmit={calcular} noValidate className="mt-8 space-y-6">
        <CampoOpcoes
          nome="tipo"
          rotulo="O que você quer calcular?"
          opcoes={tipos}
          valor={tipo}
          aoMudar={(t) => {
            setTipo(t)
            setResultado(null)
            setErro(null)
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoMoeda
            id="salario"
            rotulo="Salário mensal"
            valor={salario}
            aoMudar={setSalario}
            obrigatorio
          />
          <CampoMoeda
            id="media"
            rotulo="Média de variáveis (opcional)"
            ajuda="Média mensal de horas extras, comissões, adicional noturno."
            valor={media}
            aoMudar={setMedia}
          />
          <CampoInteiro
            id="faltas"
            rotulo="Faltas injustificadas no período aquisitivo"
            placeholder="0"
            valor={faltas}
            aoMudar={setFaltas}
            max={366}
          />

          {tipo === 'gozo' ? (
            <>
              <CampoInteiro
                id="dias-abono"
                rotulo="Dias vendidos (abono pecuniário)"
                ajuda="Até 1/3 dos dias de direito (10 dias em 30)."
                placeholder="0"
                valor={diasAbono}
                aoMudar={setDiasAbono}
                max={10}
              />
              <CampoInteiro
                id="dias-gozo"
                rotulo="Dias de férias a tirar (opcional)"
                ajuda="Em branco: todos os dias de direito menos os vendidos."
                valor={diasGozo}
                aoMudar={setDiasGozo}
                max={30}
              />
              <CampoInteiro
                id="dependentes"
                rotulo="Dependentes para o IR"
                placeholder="0"
                valor={dependentes}
                aoMudar={setDependentes}
              />
              <CampoMoeda
                id="pensao"
                rotulo="Pensão alimentícia sobre as férias (opcional)"
                valor={pensao}
                aoMudar={setPensao}
              />
            </>
          ) : (
            <>
              <CampoData
                id="inicio"
                rotulo="Início do período aquisitivo"
                ajuda="Data da admissão ou do último aniversário dela."
                valor={inicio}
                aoMudar={setInicio}
                obrigatorio
              />
              <CampoData
                id="saida"
                rotulo="Data de saída"
                ajuda="Com aviso prévio indenizado, use a data projetada."
                valor={saida}
                aoMudar={setSaida}
                obrigatorio
              />
            </>
          )}
        </div>

        <MensagemErro mensagem={erro} />
        <BotaoCalcular />
      </form>

      {resultado && resumo && (
        <ResultadoDetalhado
          titulo={resultado.tipo === 'gozo' ? 'Férias' : 'Férias proporcionais'}
          resultado={resultado.dados}
          resumo={resumo}
          pdf={{ calculadora: 'ferias', dadosInformados: resultado.informados }}
        />
      )}
    </section>
  )
}
