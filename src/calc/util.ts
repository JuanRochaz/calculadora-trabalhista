/**
 * Funções utilitárias puras: datas, avos e arredondamento.
 *
 * Datas entram como texto ISO `AAAA-MM-DD` e são tratadas em UTC, para não sofrer
 * com fuso horário ou horário de verão do navegador.
 */

const MS_POR_DIA = 24 * 60 * 60 * 1000

/** Dias mínimos trabalhados numa fração de mês para ela contar como 1 avo. */
export const DIAS_MINIMOS_AVO = 15

/**
 * No mês da admissão, o avo conta se a admissão foi até este dia, inclusive
 * (regra do Juan: dia 15 conta, dia 16 não conta).
 */
export const DIA_LIMITE_ADMISSAO = 15

export function lerData(iso: string): Date {
  const correspondencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!correspondencia) throw new Error(`Data inválida: "${iso}". Use AAAA-MM-DD.`)
  const [, ano, mes, dia] = correspondencia.map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new Error(`Data inexistente: "${iso}".`)
  }
  return data
}

export function formatarDataIso(data: Date): string {
  return data.toISOString().slice(0, 10)
}

/** Diferença em dias entre duas datas (fim - inicio). Não conta o dia inicial. */
export function diasEntreDatas(inicio: string, fim: string): number {
  return Math.round((lerData(fim).getTime() - lerData(inicio).getTime()) / MS_POR_DIA)
}

/** Dias corridos contando o primeiro e o último dia (ex.: 01 a 10 = 10 dias). */
export function diasCorridosInclusive(inicio: string, fim: string): number {
  const dias = diasEntreDatas(inicio, fim) + 1
  if (dias < 1) throw new Error('A data final não pode ser anterior à inicial.')
  return dias
}

export function somarDias(iso: string, dias: number): string {
  return formatarDataIso(new Date(lerData(iso).getTime() + dias * MS_POR_DIA))
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/**
 * Soma meses mantendo o dia. Se o dia não existir no mês de destino,
 * usa o último dia do mês (31/01 + 1 mês = 28/02 ou 29/02).
 */
export function somarMeses(iso: string, meses: number): string {
  const data = lerData(iso)
  const totalMeses = data.getUTCFullYear() * 12 + data.getUTCMonth() + meses
  const ano = Math.floor(totalMeses / 12)
  const mes = totalMeses % 12
  const dia = Math.min(data.getUTCDate(), ultimoDiaDoMes(ano, mes + 1))
  return formatarDataIso(new Date(Date.UTC(ano, mes, dia)))
}

/**
 * Avos por mês civil, usados no 13º. Considera só o ano da data final.
 * - Mês da admissão: conta se a admissão foi até o dia `DIA_LIMITE_ADMISSAO`.
 * - Demais meses: conta se houver 15 dias ou mais trabalhados (ex.: mês do desligamento).
 */
export function avosPorMesCivil(admissao: string, fim: string): number {
  const dataFim = lerData(fim)
  const ano = dataFim.getUTCFullYear()
  const inicioDoAno = `${ano}-01-01`
  const inicioEfetivo = admissao > inicioDoAno ? admissao : inicioDoAno
  if (inicioEfetivo > fim) return 0

  const dataAdmissao = lerData(admissao)
  const admitidoNesteAno = dataAdmissao.getUTCFullYear() === ano

  let avos = 0
  for (let mes = 1; mes <= dataFim.getUTCMonth() + 1; mes++) {
    const mm = String(mes).padStart(2, '0')
    const primeiro = `${ano}-${mm}-01`
    const ultimo = `${ano}-${mm}-${String(ultimoDiaDoMes(ano, mes)).padStart(2, '0')}`
    const de = inicioEfetivo > primeiro ? inicioEfetivo : primeiro
    const ate = fim < ultimo ? fim : ultimo
    if (de > ate) continue

    const mesDaAdmissao = admitidoNesteAno && dataAdmissao.getUTCMonth() + 1 === mes
    const desligadoNoMes = ate < ultimo
    if (mesDaAdmissao && !desligadoNoMes) {
      if (dataAdmissao.getUTCDate() <= DIA_LIMITE_ADMISSAO) avos++
    } else if (diasCorridosInclusive(de, ate) >= DIAS_MINIMOS_AVO) {
      avos++
    }
  }
  return avos
}

/**
 * Avos contados a partir da data de início, usados nas férias (período aquisitivo):
 * cada mês completo desde o início vale 1 avo, e a sobra de 15 dias ou mais vale
 * mais 1. Limitado a 12.
 */
export function avosPorPeriodo(inicio: string, fim: string): number {
  const diaSeguinteAoFim = somarDias(fim, 1)
  if (diaSeguinteAoFim <= inicio) return 0

  let mesesCompletos = 0
  while (mesesCompletos < 12 && somarMeses(inicio, mesesCompletos + 1) <= diaSeguinteAoFim) {
    mesesCompletos++
  }
  if (mesesCompletos === 12) return 12

  const sobra = diasEntreDatas(somarMeses(inicio, mesesCompletos), diaSeguinteAoFim)
  return mesesCompletos + (sobra >= DIAS_MINIMOS_AVO ? 1 : 0)
}

/** Anos completos entre duas datas (usado no aviso prévio proporcional). */
export function anosCompletos(inicio: string, fim: string): number {
  let anos = 0
  while (somarMeses(inicio, (anos + 1) * 12) <= fim) anos++
  return anos
}

/**
 * Arredonda um valor em centavos para centavo inteiro (metade para longe do zero).
 * Usar só no resultado final de cada verba.
 */
export function arredondarCentavos(valor: number): number {
  return Math.sign(valor) * Math.round(Math.abs(valor) + 1e-9)
}

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Converte centavos em texto `R$ 1.234,56`. Usar só na tela/PDF. */
export function formatarReais(centavos: number): string {
  return formatoReais.format(centavos / 100)
}
