import { useState, type FormEvent } from 'react'
import { EntradaInvalidaError } from '../calc/erros'
import {
  calcularHoraExtra,
  divisorPorJornada,
  formatarHoras,
  lerHoras,
  type ResultadoHoraExtra,
} from '../calc/horaExtra'
import { formatarReais } from '../calc/util'
import {
  BotaoCalcular,
  CampoHoras,
  CampoInteiro,
  CampoMoeda,
  CampoSelecao,
  MensagemErro,
} from '../components/Formulario'
import ResultadoDetalhado from '../components/ResultadoDetalhado'
import { tabelasVigentes } from '../config/tabelas'
import type { ItemPdf } from '../pdf/gerarPdf'

/** Inclui o item só se o valor existir (para os campos opcionais no PDF). */
const se = (condicao: unknown, item: ItemPdf): ItemPdf[] => (condicao ? [item] : [])

const ano = tabelasVigentes.ano

const nomesMeses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
const opcoesMeses = nomesMeses.map((nome, i) => ({
  valor: String(i + 1),
  rotulo: `${nome}/${ano}`,
}))

function mesInicial(): string {
  const hoje = new Date()
  return hoje.getFullYear() === ano ? String(hoje.getMonth() + 1) : '1'
}

export default function HoraExtra() {
  const [salario, setSalario] = useState<number | null>(null)
  const [jornada, setJornada] = useState<number | null>(44)
  const [divisor, setDivisor] = useState<number | null>(null)
  const [horas50, setHoras50] = useState('')
  const [horas100, setHoras100] = useState('')
  const [mes, setMes] = useState(mesInicial)
  const [feriados, setFeriados] = useState<number | null>(null)
  const [dependentes, setDependentes] = useState<number | null>(null)
  const [pensao, setPensao] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{
    dados: ResultadoHoraExtra
    informados: ItemPdf[]
    divisor: number
    mes: number
  } | null>(null)

  const divisorAutomatico = jornada ? divisorPorJornada(jornada) : null
  const divisorUsado = divisor ?? divisorAutomatico

  function calcular(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      const minutos50 = lerHoras(horas50)
      const minutos100 = lerHoras(horas100)
      if (minutos50 === null || minutos100 === null)
        throw new EntradaInvalidaError('Digite as horas como 10:30 (10 horas e 30 minutos).')
      if (!divisorUsado) throw new EntradaInvalidaError('Informe a jornada semanal ou o divisor.')
      const dados = calcularHoraExtra(
        {
          salarioCentavos: salario ?? 0,
          divisor: divisorUsado,
          minutos50,
          minutos100,
          ano,
          mes: Number(mes),
          feriados: feriados ?? 0,
          dependentes: dependentes ?? 0,
          pensaoAlimenticiaCentavos: pensao ?? 0,
        },
        tabelasVigentes,
      )
      const informados: ItemPdf[] = [
        { rotulo: 'Salário mensal', valor: formatarReais(salario ?? 0) },
        { rotulo: 'Mês', valor: opcoesMeses[Number(mes) - 1].rotulo },
        ...se(jornada, { rotulo: 'Jornada semanal', valor: `${jornada}h` }),
        { rotulo: 'Horas extras a 50%', valor: `${formatarHoras(minutos50)} h` },
        { rotulo: 'Horas extras a 100%', valor: `${formatarHoras(minutos100)} h` },
        { rotulo: 'Feriados no mês', valor: String(feriados ?? 0) },
        { rotulo: 'Dependentes', valor: String(dependentes ?? 0) },
        ...se(pensao, { rotulo: 'Pensão alimentícia', valor: formatarReais(pensao ?? 0) }),
      ]
      setResultado({ dados, divisor: divisorUsado, mes: Number(mes), informados })
    } catch (falha) {
      setResultado(null)
      if (falha instanceof Error) setErro(falha.message)
      else throw falha
    }
  }

  return (
    <section>
      <title>Calculadora de horas extras 2026: 50%, 100% e DSR | JR Dev</title>
      <meta
        name="description"
        content="Calcule grátis as horas extras de 50% e 100%, o reflexo no DSR e o salário líquido do mês com INSS e IRRF de 2026."
      />

      <p className="font-mono text-xs text-texto-suave">01 / horas extras</p>
      <h1 className="mt-2 text-4xl leading-tight">
        Calculadora de <span className="text-menta">horas extras</span>
      </h1>
      <p className="mt-4 max-w-2xl text-texto-suave">
        Horas extras de 50% e 100%, reflexo no DSR e o líquido do mês, com INSS e IRRF de {ano}.
        Sábado conta como dia útil.
      </p>

      <form onSubmit={calcular} noValidate className="mt-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoMoeda
            id="salario"
            rotulo="Salário mensal"
            valor={salario}
            aoMudar={setSalario}
            obrigatorio
          />
          <CampoSelecao
            id="mes"
            rotulo="Mês das horas extras"
            opcoes={opcoesMeses}
            valor={mes}
            aoMudar={setMes}
          />
          <CampoInteiro
            id="jornada"
            rotulo="Jornada semanal (horas)"
            valor={jornada}
            aoMudar={setJornada}
            max={44}
          />
          <CampoInteiro
            id="divisor"
            rotulo="Divisor mensal"
            ajuda={`Em branco: jornada × 5${divisorAutomatico ? ` = ${divisorAutomatico}` : ''}.`}
            placeholder={divisorAutomatico ? String(divisorAutomatico) : ''}
            valor={divisor}
            aoMudar={setDivisor}
            max={300}
          />
          <CampoHoras
            id="horas-50"
            rotulo="Horas extras a 50%"
            ajuda="Total do mês. Ex.: 10:30 = 10 horas e 30 minutos."
            valor={horas50}
            aoMudar={setHoras50}
          />
          <CampoHoras
            id="horas-100"
            rotulo="Horas extras a 100%"
            ajuda="Domingos e feriados trabalhados."
            valor={horas100}
            aoMudar={setHoras100}
          />
          <CampoInteiro
            id="feriados"
            rotulo="Feriados no mês"
            ajuda="Só os que caem de segunda a sábado."
            placeholder="0"
            valor={feriados}
            aoMudar={setFeriados}
            max={10}
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

        <MensagemErro mensagem={erro} />
        <BotaoCalcular />
      </form>

      {resultado && (
        <ResultadoDetalhado
          titulo={`Horas extras de ${nomesMeses[resultado.mes - 1].toLowerCase()}/${ano}`}
          resultado={resultado.dados}
          resumo={[
            { rotulo: 'Divisor', valor: String(resultado.divisor) },
            { rotulo: 'Valor-hora', valor: formatarReais(resultado.dados.valorHoraCentavos) },
            { rotulo: 'Dias úteis', valor: String(resultado.dados.diasUteis) },
            {
              rotulo: 'Domingos + feriados',
              valor: `${resultado.dados.domingos} + ${resultado.dados.feriados}`,
            },
          ]}
          pdf={{ calculadora: 'horas-extras', dadosInformados: resultado.informados }}
        />
      )}
    </section>
  )
}
