import { useState, type FormEvent } from 'react'
import { EntradaInvalidaError } from '../calc/erros'
import {
  AVISOS_POR_TIPO,
  calcularRescisao,
  type ResultadoRescisao,
  type TipoAviso,
  type TipoRescisao,
} from '../calc/rescisao'
import { formatarReais, lerData } from '../calc/util'
import {
  BotaoCalcular,
  CampoCaixa,
  CampoData,
  CampoInteiro,
  CampoMoeda,
  CampoOpcoes,
  MensagemErro,
} from '../components/Formulario'
import ResultadoDetalhado from '../components/ResultadoDetalhado'
import { tabelasVigentes } from '../config/tabelas'

const tipos: { valor: TipoRescisao; rotulo: string; descricao: string }[] = [
  { valor: 'semJustaCausa', rotulo: 'Sem justa causa', descricao: 'A empresa demitiu.' },
  { valor: 'pedidoDemissao', rotulo: 'Pedido de demissão', descricao: 'O empregado pediu.' },
  { valor: 'acordo', rotulo: 'Acordo', descricao: 'Comum acordo (art. 484-A).' },
  { valor: 'justaCausa', rotulo: 'Justa causa', descricao: 'Falta grave do empregado.' },
]

const avisos: Record<TipoAviso, { rotulo: string; descricao: string }> = {
  indenizado: { rotulo: 'Indenizado', descricao: 'Pago sem trabalhar.' },
  trabalhado: { rotulo: 'Trabalhado', descricao: 'O aviso foi cumprido.' },
  naoCumprido: { rotulo: 'Não cumprido', descricao: 'A empresa desconta 30 dias.' },
  dispensado: { rotulo: 'Dispensado', descricao: 'A empresa liberou o aviso.' },
}

const temMulta = (t: TipoRescisao) => t === 'semJustaCausa' || t === 'acordo'

function formatarData(iso: string): string {
  return lerData(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export default function Rescisao() {
  const [tipo, setTipo] = useState<TipoRescisao>('semJustaCausa')
  const [aviso, setAviso] = useState<TipoAviso>('indenizado')
  const [salario, setSalario] = useState<number | null>(null)
  const [media, setMedia] = useState<number | null>(null)
  const [admissao, setAdmissao] = useState('')
  const [desligamento, setDesligamento] = useState('')
  const [saldoFgts, setSaldoFgts] = useState<number | null>(null)
  const [periodosVencidos, setPeriodosVencidos] = useState<number | null>(null)
  const [emDobro, setEmDobro] = useState(false)
  const [faltas, setFaltas] = useState<number | null>(null)
  const [primeiraParcela, setPrimeiraParcela] = useState<number | null>(null)
  const [dependentes, setDependentes] = useState<number | null>(null)
  const [pensao, setPensao] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{
    tipo: TipoRescisao
    aviso: TipoAviso | null
    dados: ResultadoRescisao
  } | null>(null)

  const avisosPermitidos = AVISOS_POR_TIPO[tipo]

  function mudarTipo(t: TipoRescisao) {
    setTipo(t)
    setResultado(null)
    setErro(null)
    if (!AVISOS_POR_TIPO[t].includes(aviso)) setAviso(AVISOS_POR_TIPO[t][0] ?? 'indenizado')
  }

  function calcular(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      if (!admissao) throw new EntradaInvalidaError('Informe a data de admissão.')
      if (!desligamento) throw new EntradaInvalidaError('Informe a data de desligamento.')
      const avisoUsado = avisosPermitidos.length > 0 ? aviso : null
      const dados = calcularRescisao(
        {
          tipo,
          aviso: avisoUsado ?? undefined,
          salarioCentavos: salario ?? 0,
          mediaVariaveisCentavos: media ?? 0,
          admissao,
          dataDesligamento: desligamento,
          saldoFgtsCentavos: saldoFgts ?? 0,
          periodosVencidos: periodosVencidos ?? 0,
          vencidaEmDobro: emDobro && (periodosVencidos ?? 0) > 0,
          faltas: faltas ?? 0,
          primeiraParcela13PagaCentavos: primeiraParcela ?? 0,
          dependentes: dependentes ?? 0,
          pensaoAlimenticiaCentavos: pensao ?? 0,
        },
        tabelasVigentes,
      )
      setResultado({ tipo, aviso: avisoUsado, dados })
    } catch (falha) {
      setResultado(null)
      if (falha instanceof Error) setErro(falha.message)
      else throw falha
    }
  }

  const dados = resultado?.dados
  const resumo = dados && [
    ...(resultado.aviso === 'indenizado'
      ? [
          { rotulo: 'Aviso prévio', valor: `${dados.diasAviso} dias` },
          { rotulo: 'Projeção até', valor: formatarData(dados.dataFimProjetada) },
        ]
      : []),
    ...(resultado.tipo !== 'justaCausa'
      ? [
          {
            rotulo: '13º (avos)',
            valor: `${dados.avos13Trabalhados} + ${dados.avos13Indenizados} do aviso`,
          },
          { rotulo: 'Férias proporcionais', valor: `${dados.avosFeriasProporcionais}/12` },
        ]
      : []),
  ]

  return (
    <section>
      <title>
        Calculadora de rescisão 2026: sem justa causa, pedido, acordo e justa causa | JR Dev
      </title>
      <meta
        name="description"
        content="Calcule grátis a rescisão de 2026: saldo de salário, aviso prévio proporcional, 13º, férias + 1/3, multa do FGTS, INSS e IRRF. Sem justa causa, pedido de demissão, acordo e justa causa."
      />

      <p className="font-mono text-xs text-texto-suave">01 / rescisão</p>
      <h1 className="mt-2 text-4xl leading-tight">
        Calculadora de <span className="text-menta">rescisão</span>
      </h1>
      <p className="mt-4 max-w-2xl text-texto-suave">
        Verbas rescisórias com INSS e IRRF de {tabelasVigentes.ano}. O aviso prévio indenizado tem
        30 dias + 3 por ano completo (até 90) e projeta o 13º e as férias.
      </p>

      <form onSubmit={calcular} noValidate className="mt-8 space-y-6">
        <CampoOpcoes
          nome="tipo"
          rotulo="Tipo de rescisão"
          opcoes={tipos}
          valor={tipo}
          aoMudar={mudarTipo}
        />

        {avisosPermitidos.length > 0 && (
          <CampoOpcoes
            nome="aviso"
            rotulo="Aviso prévio"
            opcoes={avisosPermitidos.map((a) => ({ valor: a, ...avisos[a] }))}
            valor={aviso}
            aoMudar={(a) => {
              setAviso(a)
              setResultado(null)
            }}
          />
        )}

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
          <CampoData
            id="desligamento"
            rotulo={
              tipo !== 'justaCausa' && aviso === 'indenizado'
                ? 'Data da comunicação do aviso'
                : 'Último dia trabalhado'
            }
            ajuda={
              tipo !== 'justaCausa' && aviso === 'indenizado'
                ? 'A projeção do aviso é calculada a partir dela.'
                : undefined
            }
            valor={desligamento}
            aoMudar={setDesligamento}
            obrigatorio
          />
          {temMulta(tipo) && (
            <CampoMoeda
              id="saldo-fgts"
              rotulo="Saldo do FGTS"
              ajuda="Do extrato, antes da rescisão. Usado na multa."
              valor={saldoFgts}
              aoMudar={setSaldoFgts}
            />
          )}
          <CampoInteiro
            id="periodos-vencidos"
            rotulo="Férias vencidas não gozadas (períodos)"
            ajuda="Períodos de 12 meses completos antes do desligamento: 0, 1 ou 2."
            placeholder="0"
            valor={periodosVencidos}
            aoMudar={setPeriodosVencidos}
            max={2}
          />
          {tipo !== 'justaCausa' && (
            <CampoInteiro
              id="faltas"
              rotulo="Faltas injustificadas no período atual"
              placeholder="0"
              valor={faltas}
              aoMudar={setFaltas}
              max={366}
            />
          )}
          <CampoMoeda
            id="primeira-parcela"
            rotulo="1ª parcela do 13º já paga (opcional)"
            valor={primeiraParcela}
            aoMudar={setPrimeiraParcela}
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
            rotulo="Pensão alimentícia (opcional)"
            valor={pensao}
            aoMudar={setPensao}
          />
        </div>

        {(periodosVencidos ?? 0) > 0 && (
          <CampoCaixa
            id="em-dobro"
            rotulo="Um dos períodos vencidos passou do prazo de concessão"
            ajuda="Paga em dobro (art. 137 da CLT)."
            marcado={emDobro}
            aoMudar={setEmDobro}
          />
        )}

        <MensagemErro mensagem={erro} />
        <BotaoCalcular />
      </form>

      {resultado && dados && resumo && (
        <>
          <ResultadoDetalhado
            titulo={tipos.find((t) => t.valor === resultado.tipo)!.rotulo}
            resultado={dados}
            resumo={resumo}
          />
          <ResumoFgts tipo={resultado.tipo} dados={dados} />
        </>
      )}
    </section>
  )
}

function ResumoFgts({ tipo, dados }: { tipo: TipoRescisao; dados: ResultadoRescisao }) {
  const { fgts } = dados
  const itens = [
    { rotulo: 'Depósito de 8% sobre a rescisão', valor: fgts.depositoRescisaoCentavos },
    ...(temMulta(tipo)
      ? [
          {
            rotulo: `Multa de ${Math.round(fgts.percentualMulta * 100)}% (paga na conta do FGTS)`,
            valor: fgts.multaCentavos,
          },
          {
            rotulo: tipo === 'acordo' ? 'Saque estimado (80% do saldo + multa)' : 'Saque estimado',
            valor: fgts.saqueCentavos,
          },
        ]
      : []),
  ]
  return (
    <section className="mt-4 rounded-md border border-linha p-4">
      <h3 className="text-lg">FGTS</h3>
      <dl className="mt-2 space-y-1 text-sm">
        {itens.map((i) => (
          <div key={i.rotulo} className="flex justify-between gap-4">
            <dt className="text-texto-suave">{i.rotulo}</dt>
            <dd className="font-mono">{formatarReais(i.valor)}</dd>
          </div>
        ))}
      </dl>
      {!temMulta(tipo) && (
        <p className="mt-2 text-xs text-texto-suave">
          Neste tipo de rescisão não há multa e o saldo do FGTS não é liberado para saque.
        </p>
      )}
    </section>
  )
}
