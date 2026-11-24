import type { ReactNode } from 'react'

const classeCampo =
  'w-full rounded-sm border border-texto-suave/50 bg-superficie px-3 py-2 text-texto ' +
  'placeholder:text-texto-suave/60 focus:border-menta focus:outline-none focus:ring-2 focus:ring-menta/40'

interface PropsRotulo {
  id: string
  rotulo: string
  ajuda?: string
  children: ReactNode
}

function Rotulo({ id, rotulo, ajuda, children }: PropsRotulo) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {rotulo}
      </label>
      {children}
      {ajuda && (
        <p id={`${id}-ajuda`} className="mt-1 text-xs text-texto-suave">
          {ajuda}
        </p>
      )}
    </div>
  )
}

const formatoCentavos = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

interface PropsMoeda {
  id: string
  rotulo: string
  ajuda?: string
  /** Valor em centavos; `null` quando o campo está vazio. */
  valor: number | null
  aoMudar: (centavos: number | null) => void
  obrigatorio?: boolean
}

/** Campo de valor em R$ com máscara: o usuário digita só números (300000 → 3.000,00). */
export function CampoMoeda({ id, rotulo, ajuda, valor, aoMudar, obrigatorio }: PropsMoeda) {
  return (
    <Rotulo id={id} rotulo={rotulo} ajuda={ajuda}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-suave">
          R$
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          required={obrigatorio}
          aria-describedby={ajuda ? `${id}-ajuda` : undefined}
          className={`${classeCampo} pl-10 text-right font-mono`}
          placeholder="0,00"
          value={valor === null ? '' : formatoCentavos.format(valor / 100)}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, '').slice(0, 11)
            aoMudar(digitos === '' ? null : Number(digitos))
          }}
        />
      </div>
    </Rotulo>
  )
}

interface PropsData {
  id: string
  rotulo: string
  ajuda?: string
  valor: string
  aoMudar: (iso: string) => void
  obrigatorio?: boolean
}

export function CampoData({ id, rotulo, ajuda, valor, aoMudar, obrigatorio }: PropsData) {
  return (
    <Rotulo id={id} rotulo={rotulo} ajuda={ajuda}>
      <input
        id={id}
        type="date"
        required={obrigatorio}
        min="1950-01-01"
        max="2100-12-31"
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        className={`${classeCampo} font-mono`}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
      />
    </Rotulo>
  )
}

interface PropsInteiro {
  id: string
  rotulo: string
  ajuda?: string
  /** `null` quando o campo está em branco. */
  valor: number | null
  aoMudar: (n: number | null) => void
  max?: number
  placeholder?: string
}

export function CampoInteiro({
  id,
  rotulo,
  ajuda,
  valor,
  aoMudar,
  max = 99,
  placeholder,
}: PropsInteiro) {
  return (
    <Rotulo id={id} rotulo={rotulo} ajuda={ajuda}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={1}
        placeholder={placeholder}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        className={`${classeCampo} font-mono`}
        value={valor ?? ''}
        onChange={(e) =>
          aoMudar(
            e.target.value === ''
              ? null
              : Math.max(0, Math.min(max, Math.trunc(Number(e.target.value)))),
          )
        }
      />
    </Rotulo>
  )
}

interface PropsHoras {
  id: string
  rotulo: string
  ajuda?: string
  valor: string
  aoMudar: (texto: string) => void
}

/** Campo de horas no formato da folha de ponto ("10:30"). A leitura fica em calc/horaExtra. */
export function CampoHoras({ id, rotulo, ajuda, valor, aoMudar }: PropsHoras) {
  return (
    <Rotulo id={id} rotulo={rotulo} ajuda={ajuda}>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0:00"
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        className={`${classeCampo} font-mono`}
        value={valor}
        onChange={(e) => aoMudar(e.target.value.replace(/[^\d:h,.]/gi, '').slice(0, 7))}
      />
    </Rotulo>
  )
}

interface PropsSelecao {
  id: string
  rotulo: string
  ajuda?: string
  opcoes: { valor: string; rotulo: string }[]
  valor: string
  aoMudar: (valor: string) => void
}

export function CampoSelecao({ id, rotulo, ajuda, opcoes, valor, aoMudar }: PropsSelecao) {
  return (
    <Rotulo id={id} rotulo={rotulo} ajuda={ajuda}>
      <select
        id={id}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        className={classeCampo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Rotulo>
  )
}

// Classes literais para o Tailwind encontrar.
const colunasOpcoes: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}

interface PropsOpcoes<T extends string> {
  nome: string
  rotulo: string
  opcoes: { valor: T; rotulo: string; descricao?: string }[]
  valor: T
  aoMudar: (valor: T) => void
}

/** Grupo de opções exclusivas, mostrado como botões. */
export function CampoOpcoes<T extends string>({
  nome,
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: PropsOpcoes<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{rotulo}</legend>
      <div className={`grid gap-2 ${colunasOpcoes[opcoes.length] ?? 'sm:grid-cols-3'}`}>
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className={`cursor-pointer rounded-md border p-3 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-menta/40 ${
              valor === o.valor
                ? 'border-menta bg-menta-fundo'
                : 'border-texto-suave/50 bg-superficie hover:border-texto-suave'
            }`}
          >
            <input
              type="radio"
              name={nome}
              value={o.valor}
              checked={valor === o.valor}
              onChange={() => aoMudar(o.valor)}
              className="sr-only"
            />
            <span className={`font-medium ${valor === o.valor ? 'text-menta' : ''}`}>
              {o.rotulo}
            </span>
            {o.descricao && (
              <span className="mt-1 block text-xs text-texto-suave">{o.descricao}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface PropsCaixa {
  id: string
  rotulo: string
  ajuda?: string
  marcado: boolean
  aoMudar: (marcado: boolean) => void
}

export function CampoCaixa({ id, rotulo, ajuda, marcado, aoMudar }: PropsCaixa) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-1 size-4 accent-menta"
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {rotulo}
        </label>
        {ajuda && (
          <p id={`${id}-ajuda`} className="text-xs text-texto-suave">
            {ajuda}
          </p>
        )}
      </div>
    </div>
  )
}

export function BotaoCalcular() {
  return (
    <button
      type="submit"
      className="rounded-md bg-menta px-6 py-3 font-medium text-sobre-menta hover:opacity-90 focus:ring-2 focus:ring-menta/40 focus:ring-offset-2 focus:ring-offset-fundo focus:outline-none"
    >
      Calcular
    </button>
  )
}

export function MensagemErro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null
  return (
    <p role="alert" className="rounded-sm border border-erro/60 px-3 py-2 text-sm text-erro">
      {mensagem}
    </p>
  )
}
