import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, PlusCircle, ClipboardList, Warehouse,
  AlertTriangle, Package, Users, ArrowLeftRight, Wrench,
  FileText, ScrollText, LogOut, Menu
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'

const MENU_ITEMS = [
  { path: '/dashboard',             label: 'Dashboard',       icon: LayoutDashboard,  perm: 'Dashboard' },
  { path: '/cadastro-rapido',       label: 'Cadastro Rápido', icon: PlusCircle,       perm: 'Cadastro_Rapido' },
  { path: '/controle',              label: 'Controle',        icon: ClipboardList,    perm: 'Controle' },
  { path: '/estoque',               label: 'Estoque',         icon: Warehouse,        perm: 'Estoque' },
  { path: '/atrasados',             label: 'Atrasados',       icon: AlertTriangle,    perm: 'Atrasados' },
  { path: '/containers',            label: 'Containers',      icon: Package,          perm: 'Cadastro_Containers' },
  { path: '/clientes',              label: 'Clientes',        icon: Users,            perm: 'Clientes' },
  { path: '/troca-container',       label: 'Troca',           icon: ArrowLeftRight,   perm: 'Troca_Container' },
  { path: '/manutencao',            label: 'Manutenção',      icon: Wrench,           perm: 'Manutencao' },
  { path: '/lancamento-manutencao', label: 'Lançar Manut.',   icon: Wrench,           perm: 'Lancamento_Manutencao' },
  { path: '/relatorios',            label: 'Relatórios',      icon: FileText,         perm: 'Relatorios' },
  { path: '/logs',                  label: 'Logs',            icon: ScrollText,       perm: 'Logs' },
]

const sidebarStyle: React.CSSProperties = {
  width: '16rem',
  height: '100vh',
  background: 'var(--sidebar)',
  borderRight: '1px solid var(--border-subtle)',
  display: 'flex',
  flexDirection: 'column',
  top: 0,
  left: 0,
  zIndex: 100,
}

interface SidebarProps {
  itensVisiveis: typeof MENU_ITEMS
  usuarioAtual: string | undefined
  nivelAtual: string | undefined
  onCloseMobile: () => void
  onLogout: () => void
}

function Sidebar({ itensVisiveis, usuarioAtual, nivelAtual, onCloseMobile, onLogout }: SidebarProps) {
  return (
    <div style={sidebarStyle}>
      {/* Logo */}
      <div style={{
        padding: '1rem 0',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <img
          src="/logo.svg"
          alt="Trans Ambiental"
          style={{
            width: '120px', height: 'auto', objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            transition: 'transform 0.6s ease', cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(5deg) scale(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'rotate(0deg) scale(1)')}
        />
        <div style={{ fontSize: '0.65rem', color: 'var(--fg-muted)', letterSpacing: '0.05em', marginTop: '0.375rem' }}>
          Controle de Containers
        </div>
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
        {itensVisiveis.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(210, 20%, 85%)' }}>{usuarioAtual}</div>
          <div style={{ marginTop: '0.25rem' }}>
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{nivelAtual}</span>
          </div>
        </div>
        <button onClick={onLogout} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
          <LogOut size={14} />
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    await logout()
    toast('Sessão encerrada com sucesso', 'info')
    navigate('/login')
  }

  const itensVisiveis = MENU_ITEMS.filter(item => temAcesso(item.perm))

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Sidebar — desktop (fixa, visível via CSS) */}
      <div id="sidebar-desktop" style={{ display: 'none', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
        <Sidebar
          itensVisiveis={itensVisiveis}
          usuarioAtual={sessao?.usuarioAtual}
          nivelAtual={sessao?.nivelAtual}
          onCloseMobile={() => {}}
          onLogout={handleLogout}
        />
      </div>

      {/* Sidebar mobile — overlay */}
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
          itensVisiveis={itensVisiveis}
          usuarioAtual={sessao?.usuarioAtual}
          nivelAtual={sessao?.nivelAtual}
          onCloseMobile={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />
      </div>

      {/* Conteúdo principal */}
      <div style={{ flex: 1, minHeight: '100vh', marginLeft: 0 }} id="main-content">

        {/* Header mobile */}
        <div id="mobile-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: 'var(--sidebar)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost" style={{ padding: '0.375rem' }}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.svg" alt="Trans Ambiental" style={{ width: '80px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }} />
          </div>
          <div style={{ width: '2rem' }} />
        </div>

        <main>{children}</main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          #sidebar-desktop { display: block !important; }
          #sidebar-mobile  { display: none !important; }
          #main-content    { margin-left: 16rem !important; }
          #mobile-header   { display: none !important; }
        }
      `}</style>
    </div>
  )
}
