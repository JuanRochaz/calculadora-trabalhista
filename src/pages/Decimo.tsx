import { useState, type FormEvent } from 'react'
import { calcularDecimo, type ResultadoDecimo, type TipoDecimo } from '../calc/decimo'
import { EntradaInvalidaError } from '../calc/erros'
import { formatarDataBr, formatarReais } from '../calc/util'
import {
  BotaoCalcular,
  CampoData,
  CampoInteiro,
  CampoMoeda,
  CampoOpcoes,
  MensagemErro,
} from '../components/Formulario'
import ResultadoDetalhado from '../components/ResultadoDetalhado'
import { tabelasVigentes } from '../config/tabelas'
import type { ItemPdf } from '../pdf/gerarPdf'
import { usePagina } from '../seo/usePagina'

/** Inclui o item só se o valor existir (para os campos opcionais no PDF). */
const se = (condicao: unknown, item: ItemPdf): ItemPdf[] => (condicao ? [item] : [])

const ano = tabelasVigentes.ano

const tipos: { valor: TipoDecimo; rotulo: string; descricao: string }[] = [
  { valor: 'primeira', rotulo: '1ª parcela', descricao: 'Adiantamento até 30/11, sem descontos.' },
  { valor: 'segunda', rotulo: '2ª parcela', descricao: 'Até 20/12, com INSS e IRRF.' },
  { valor: 'proporcional', rotulo: 'Proporcional', descricao: 'No desligamento.' },
]

const titulos: Record<TipoDecimo, string> = {
  primeira: '1ª parcela do 13º',
  segunda: '2ª parcela do 13º',
  proporcional: '13º proporcional',
}

export default function Decimo() {
  usePagina('/decimo-terceiro/')
  const [tipo, setTipo] = useState<TipoDecimo>('segunda')
  const [salario, setSalario] = useState<number | null>(null)
  const [media, setMedia] = useState<number | null>(null)
  const [admissao, setAdmissao] = useState('')
  const [desligamento, setDesligamento] = useState('')
  const [dependentes, setDependentes] = useState(0)
  const [pensao, setPensao] = useState<number | null>(null)
  const [primeiraPaga, setPrimeiraPaga] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{
    tipo: TipoDecimo
    dados: ResultadoDecimo
    informados: ItemPdf[]
  } | null>(null)

  function calcular(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      if (!admissao) throw new EntradaInvalidaError('Informe a data de admissão.')
      const dados = calcularDecimo(
        {
          tipo,
          salarioCentavos: salario ?? 0,
          mediaVariaveisCentavos: media ?? 0,
          admissao,
          dataDesligamento: tipo === 'proporcional' ? desligamento || undefined : undefined,
          dependentes,
          pensaoAlimenticiaCentavos: pensao ?? 0,
          primeiraParcelaPagaCentavos: primeiraPaga ?? undefined,
        },
        tabelasVigentes,
      )
      const informados: ItemPdf[] = [
        { rotulo: 'Salário mensal', valor: formatarReais(salario ?? 0) },
        ...se(media, { rotulo: 'Média de variáveis', valor: formatarReais(media ?? 0) }),
        { rotulo: 'Admissão', valor: formatarDataBr(admissao) },
        ...se(tipo === 'proporcional', {
          rotulo: 'Desligamento',
          valor: desligamento ? formatarDataBr(desligamento) : '',
        }),
        ...se(tipo !== 'primeira', { rotulo: 'Dependentes', valor: String(dependentes) }),
        ...se(tipo !== 'primeira' && pensao, {
          rotulo: 'Pensão alimentícia',
          valor: formatarReais(pensao ?? 0),
        }),
        ...se(tipo !== 'primeira' && primeiraPaga !== null, {
          rotulo: '1ª parcela já paga',
          valor: formatarReais(primeiraPaga ?? 0),
        }),
      ]
      setResultado({ tipo, dados, informados })
    } catch (falha) {
      setResultado(null)
      if (falha instanceof Error) setErro(falha.message)
      else throw falha
    }
  }

  const comDescontos = tipo !== 'primeira'

  return (
    <section>
      <p className="font-mono text-xs text-texto-suave">01 / 13º salário</p>
      <h1 className="mt-2 text-4xl leading-tight">
        Calculadora de <span className="text-menta">13º salário</span>
      </h1>
      <p className="mt-4 max-w-2xl text-texto-suave">
        Tabelas de INSS e IRRF de {ano}, com a redução do imposto. O mês de admissão conta se a
        admissão foi até o dia 15.
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
          <CampoData
            id="admissao"
            rotulo="Data de admissão"
            valor={admissao}
            aoMudar={setAdmissao}
            obrigatorio
          />
          {tipo === 'proporcional' && (
            <CampoData
              id="desligamento"
              rotulo="Data de desligamento"
              ajuda="Com aviso prévio indenizado, use a data projetada."
              valor={desligamento}
              aoMudar={setDesligamento}
              obrigatorio
            />
          )}
          {comDescontos && (
            <>
              <CampoInteiro
                id="dependentes"
                rotulo="Dependentes para o IR"
                valor={dependentes}
                aoMudar={(n) => setDependentes(n ?? 0)}
              />
              <CampoMoeda
                id="pensao"
                rotulo="Pensão alimentícia sobre o 13º (opcional)"
                valor={pensao}
                aoMudar={setPensao}
              />
              <CampoMoeda
                id="primeira-paga"
                rotulo="1ª parcela já paga (opcional)"
                ajuda={
                  tipo === 'segunda'
                    ? 'Em branco: usa a 1ª parcela calculada.'
                    : 'Em branco: considera que não foi paga.'
                }
                valor={primeiraPaga}
                aoMudar={setPrimeiraPaga}
              />
            </>
          )}
        </div>

        <MensagemErro mensagem={erro} />
        <BotaoCalcular />
      </form>

      {resultado && (
        <ResultadoDetalhado
          titulo={titulos[resultado.tipo]}
          resultado={resultado.dados}
          resumo={[
            { rotulo: 'Avos considerados', valor: `${resultado.dados.avos}/12` },
            {
              rotulo: '13º do período',
              valor: formatarReais(resultado.dados.valorDecimoCentavos),
            },
          ]}
          pdf={{ calculadora: 'decimo-terceiro', dadosInformados: resultado.informados }}
        />
      )}
    </section>
  )
}
