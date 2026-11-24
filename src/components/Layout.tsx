import { Link, Outlet } from 'react-router'
import logo from '../assets/jrdev-logo.svg'
import AvisoLegal from './AvisoLegal'
import CTAJRDev from './CTAJRDev'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-linha">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" aria-label="Calculadoras trabalhistas – início">
            <img src={logo} alt="{jr}.dev" className="h-7 w-auto" />
          </Link>
          <span className="font-mono text-xs text-texto-suave">// calculadoras trabalhistas</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <Outlet />
        <AvisoLegal />
      </main>
      <CTAJRDev />
    </div>
  )
}
