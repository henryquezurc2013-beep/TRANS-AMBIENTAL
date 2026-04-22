import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import Icon from './Icon'
import CommandPalette from './CommandPalette'
import MapDrawer from './MapDrawer'
import ContainerDrawer from './ContainerDrawer'
import type { Controle } from '../services/dataService'
import { supabase } from '../lib/supabase'

const GRUPOS = [
  {
    label: 'Principal',
    itens: [
      { path: '/dashboard',       label: 'Dashboard',       icon: 'dashboard',  perm: 'Dashboard'            },
      { path: '/cadastro-rapido', label: 'Cadastro Rápido', icon: 'plus_circle', perm: 'Cadastro_Rapido'     },
      { path: '/controle',        label: 'Controle',        icon: 'clipboard',  perm: 'Controle'             },
    ],
  },
  {
    label: 'Operação',
    itens: [
      { path: '/estoque',               label: 'Estoque',       icon: 'warehouse', perm: 'Estoque'                  },
      { path: '/atrasados',             label: 'Atrasados',     icon: 'alert',     perm: 'Atrasados'                },
      { path: '/containers',            label: 'Containers',    icon: 'package',   perm: 'Cadastro_Containers'      },
      { path: '/troca-container',       label: 'Troca',         icon: 'swap',      perm: 'Troca_Container'          },
      { path: '/manutencao',            label: 'Manutenção',    icon: 'wrench',    perm: 'Manutencao'               },
      { path: '/lancamento-manutencao', label: 'Lançar Manut.', icon: 'wrench',    perm: 'Lancamento_Manutencao'    },
    ],
  },
  {
    label: 'Gestão',
    itens: [
      { path: '/clientes',          label: 'Clientes',        icon: 'users',  perm: 'Clientes'        },
      { path: '/relatorios',        label: 'Relatórios',      icon: 'file',   perm: 'Relatorios'      },
      { path: '/logs',              label: 'Logs',            icon: 'scroll', perm: 'Logs'            },
      { path: '/trocas-pendentes',  label: 'App Motoristas',  icon: 'bell',   perm: 'Trocas_Pendentes' },
    ],
  },
]

const PATH_LABELS: Record<string, string> = {
  '/dashboard':             'Dashboard',
  '/cadastro-rapido':       'Cadastro Rápido',
  '/controle':              'Controle',
  '/estoque':               'Estoque',
  '/atrasados':             'Atrasados',
  '/containers':            'Containers',
  '/clientes':              'Clientes',
  '/troca-container':       'Troca',
  '/manutencao':            'Manutenção',
  '/lancamento-manutencao': 'Lançar Manut.',
  '/relatorios':            'Relatórios',
  '/logs':                  'Logs',
  '/trocas-pendentes':      'App Motoristas',
}

function HorarioAtual() {
  const fmt = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const [hora, setHora] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setHora(fmt()), 30000)
    return () => clearInterval(id)
  }, [])
  return <>{hora}</>
}

interface SidebarProps {
  gruposVisiveis: typeof GRUPOS
  usuarioAtual: string | undefined
  nivelAtual:   string | undefined
  onCloseMobile: () => void
  onLogout: () => void
  trocasPendentes: number
}

function Sidebar({ gruposVisiveis, usuarioAtual, nivelAtual, onCloseMobile, onLogout, trocasPendentes }: SidebarProps) {
  return (
    <div style={{
      width: '15rem', height: '100vh',
      background: 'var(--sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.125rem 0 0.875rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <img
          src="/logo.svg"
          alt="Trans Ambiental"
          style={{
            width: '100px', height: 'auto', objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            transition: 'transform 0.4s ease', cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(5deg) scale(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'rotate(0deg) scale(1)')}
        />
        <div style={{ fontSize: '0.65rem', color: 'var(--fg-muted)', letterSpacing: '0.06em', marginTop: '0.35rem', textTransform: 'uppercase' }}>
          Controle de Containers
        </div>
      </div>

      {/* Nav por seções */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.5rem 0' }}>
        {gruposVisiveis.map(grupo => grupo.itens.length === 0 ? null : (
          <div key={grupo.label} style={{ marginBottom: '0.25rem' }}>
            <span className="sidebar-section-label">{grupo.label}</span>
            {grupo.itens.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon name={item.icon} size={15} />
                {item.label}
                {item.path === '/trocas-pendentes' && trocasPendentes > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'hsl(0 70% 45%)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '9999px', lineHeight: 1.4 }}>
                    {trocasPendentes}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Rodapé */}
      <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ marginBottom: '0.625rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(210,20%,85%)' }}>{usuarioAtual}</div>
          <div style={{ marginTop: '0.25rem' }}>
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{nivelAtual}</span>
          </div>
        </div>
        <button onClick={onLogout} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8125rem' }}>
          <Icon name="logout" size={13} />
          Sair
        </button>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sessao, logout, temAcesso } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen,      setSidebarOpen]      = useState(false)
  const [cpOpen,           setCpOpen]           = useState(false)
  const [mapOpen,          setMapOpen]          = useState(false)
  const [drawerControle,   setDrawerControle]   = useState<Controle | null>(null)
  const [trocasPendentes,  setTrocasPendentes]  = useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCpOpen(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    function buscarPendentes() {
      supabase
        .from('trocas_pendentes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDENTE')
        .then(({ count }) => setTrocasPendentes(count ?? 0))
    }
    buscarPendentes()
    const id = setInterval(buscarPendentes, 60000)
    return () => clearInterval(id)
  }, [])

  async function handleLogout() {
    await logout()
    toast('Sessão encerrada com sucesso', 'info')
    navigate('/login')
  }

  const gruposVisiveis = GRUPOS.map(g => ({
    ...g,
    itens: g.itens.filter(item => temAcesso(item.perm)),
  }))

  const paginaAtual = PATH_LABELS[location.pathname] ?? 'Página'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Sidebar desktop */}
      <div id="sidebar-desktop" style={{ display: 'none', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
        <Sidebar
          gruposVisiveis={gruposVisiveis}
          usuarioAtual={sessao?.usuarioAtual}
          nivelAtual={sessao?.nivelAtual}
          onCloseMobile={() => {}}
          onLogout={handleLogout}
          trocasPendentes={trocasPendentes}
        />
      </div>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99, backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div style={{
        position: 'fixed', top: 0, left: 0, zIndex: 101,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
      }} id="sidebar-mobile">
        <Sidebar
          gruposVisiveis={gruposVisiveis}
          usuarioAtual={sessao?.usuarioAtual}
          nivelAtual={sessao?.nivelAtual}
          onCloseMobile={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          trocasPendentes={trocasPendentes}
        />
      </div>

      {/* Conteúdo principal */}
      <div style={{ flex: 1, minHeight: '100vh', marginLeft: 0 }} id="main-content">

        {/* Header mobile */}
        <div id="mobile-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: 'var(--sidebar)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost" style={{ padding: '0.375rem' }}>
            <Icon name="menu" size={20} />
          </button>
          <img src="/logo.svg" alt="Trans Ambiental" style={{ width: '80px', height: 'auto', objectFit: 'contain' }} />
          <button className="btn-ghost" style={{ padding: '0.375rem' }} onClick={() => setMapOpen(true)}>
            <Icon name="mappin" size={18} />
          </button>
        </div>

        {/* Header desktop */}
        <div id="desktop-header" style={{ display: 'none' }}>
          <div style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: 'hsl(222,44%,8% / 0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0 1.5rem',
            height: '52px',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--fg-muted)', flexShrink: 0 }}>
              <span>Trans Ambiental</span>
              <span style={{ opacity: 0.4 }}>/</span>
              <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{paginaAtual}</span>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Sistema online */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--fg-muted)', flexShrink: 0 }}>
              <span style={{ color: 'var(--success)', fontSize: '0.6rem' }}>●</span>
              <span>Sistema online · Sincronizado <HorarioAtual /></span>
            </div>

            {/* Busca → abre Command Palette */}
            <button
              className="btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', border: '1px solid var(--border-soft)', borderRadius: '0.5rem', width: '200px', justifyContent: 'flex-start', fontSize: '0.8125rem', color: 'var(--fg-dim)' }}
              onClick={() => setCpOpen(true)}
            >
              <Icon name="search" size={13} />
              Buscar...
              <kbd style={{ marginLeft: 'auto', fontSize: '0.65rem', background: 'var(--card-2)', border: '1px solid var(--border-soft)', borderRadius: '4px', padding: '1px 5px', fontFamily: 'var(--font-mono)' }}>⌘K</kbd>
            </button>

            {/* Mapa */}
            <button
              className="btn-ghost"
              style={{ padding: '0.375rem 0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: mapOpen ? 'var(--primary-fg)' : 'var(--fg-muted)' }}
              onClick={() => setMapOpen(true)}
              title="Mapa de containers (DF)"
            >
              <Icon name="mappin" size={15} />
              Mapa
            </button>

            {/* Notificação */}
            <button className="btn-ghost" style={{ padding: '0.375rem', position: 'relative' }}>
              <Icon name="bell" size={16} />
            </button>
          </div>
        </div>

        <main>{children}</main>
      </div>

      <CommandPalette open={cpOpen} onClose={() => setCpOpen(false)} />

      <MapDrawer
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelectControle={c => { setMapOpen(false); setDrawerControle(c) }}
      />

      <ContainerDrawer
        controle={drawerControle}
        onClose={() => setDrawerControle(null)}
      />

      <style>{`
        @media (min-width: 768px) {
          #sidebar-desktop  { display: block !important; }
          #sidebar-mobile   { display: none !important; }
          #main-content     { margin-left: 15rem !important; }
          #mobile-header    { display: none !important; }
          #desktop-header   { display: block !important; }
        }
      `}</style>
    </div>
  )
}
