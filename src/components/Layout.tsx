import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

const icon = (paths: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    className="h-[18px] w-[18px]"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths}
  </svg>
)

const NAV: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    end: true,
    icon: icon(
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>,
    ),
  },
  {
    to: '/planeamento',
    label: 'Planeamento',
    icon: icon(
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </>,
    ),
  },
  {
    to: '/clientes',
    label: 'Clientes',
    icon: icon(
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </>,
    ),
  },
  {
    to: '/veiculos',
    label: 'Veículos',
    icon: icon(
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </>,
    ),
  },
]

// Separadores do fundo (telemóvel) — acesso rápido às 4 áreas principais.
const MOBILE_NAV: NavItem[] = [
  NAV[0], // Dashboard
  { ...NAV[1], label: 'Agenda' },
  NAV[2], // Clientes
  NAV[3], // Veículos
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/planeamento': 'Planeamento',
  '/clientes': 'Clientes',
  '/veiculos': 'Veículos',
}

function initials(nome?: string | null) {
  if (!nome) return '··'
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

export default function Layout() {
  const { colaborador, signOut } = useAuth()
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? ''

  return (
    <div className="flex h-full">
      {/* Barra lateral — desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface px-3.5 py-5 lg:flex">
        <div className="px-2.5 pb-5">
          <div className="text-[15px] font-semibold">Jardins d'Óbidos</div>
          <div className="text-[11px] text-muted">Sistema de Gestão</div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                'flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] ' +
                (isActive
                  ? 'bg-line-soft font-medium text-ink'
                  : 'text-ink-soft hover:bg-line-soft/60')
              }
            >
              {n.icon}
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-3 rounded-lg border-t border-line-soft px-2.5 py-3 text-left text-[13.5px] text-ink-soft hover:text-ink"
        >
          {icon(<><path d="M15 4h4v16h-4" /><path d="M4 12h11M11 8l4 4-4 4" /></>)}
          Sair
        </button>
      </aside>

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo */}
        <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-5">
          <h1 className="text-[15px] font-semibold lg:text-base">
            {title || "Jardins d'Óbidos"}
          </h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-line text-[12px] font-semibold text-ink-soft">
            {initials(colaborador?.nome)}
          </div>
        </header>

        {/* Conteúdo */}
        <main className="min-h-0 flex-1 overflow-auto pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Separadores — telemóvel */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface pb-3 pt-2 lg:hidden">
        {MOBILE_NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              'flex flex-1 flex-col items-center gap-1 text-[10.5px] ' +
              (isActive ? 'font-medium text-ink' : 'text-faint')
            }
          >
            {n.icon}
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
