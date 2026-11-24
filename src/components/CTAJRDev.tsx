const WHATSAPP = 'https://wa.me/5516993301305'
const EMAIL = 'contato@jrdevtecnologia.com.br'

export default function CTAJRDev() {
  return (
    <footer className="border-t border-linha bg-superficie">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold">
            Precisa automatizar o RH da sua empresa?{' '}
            <span className="text-menta">Fale com a JR Dev</span>
          </p>
          <p className="mt-1 font-mono text-xs text-texto-suave">// da planilha ao código.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-menta px-4 py-2 font-medium text-sobre-menta hover:opacity-90"
          >
            WhatsApp
          </a>
          <a
            href={`mailto:${EMAIL}`}
            className="rounded-md border border-linha px-4 py-2 font-medium hover:border-menta"
          >
            {EMAIL}
          </a>
        </div>
      </div>
    </footer>
  )
}
