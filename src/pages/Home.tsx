import { useNavigate } from 'react-router-dom'
import { Recycle, Package, Shield, MapPin, LogIn, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { sessao } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -10%, hsl(217 91% 60% / 0.15), transparent)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      textAlign: 'center',
    }}>
      {/* Logo */}
      <div style={{
        width: '5rem', height: '5rem',
        background: 'linear-gradient(135deg, var(--primary), hsl(217, 91%, 40%))',
        borderRadius: '1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.5rem',
        boxShadow: '0 12px 32px hsl(217 91% 60% / 0.45)',
      }}>
        <Recycle size={36} color="white" />
      </div>

      <h1 style={{ margin: '0 0 0.5rem', fontSize: '2.5rem', fontWeight: 800, color: 'var(--fg)' }}>
        TRANS AMBIENTAL
      </h1>
      <p style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', color: 'var(--fg-muted)' }}>
        Sistema de Gestão de Containers
      </p>
      <p style={{ margin: '0 0 2.5rem', fontSize: '0.875rem', color: 'hsl(210, 20%, 40%)', maxWidth: '480px' }}>
        Controle completo de entregas, retiradas, trocas e manutenção com rastreabilidade total via logs de auditoria.
      </p>

      {/* Features */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { icon: Package, title: 'Estoque em Tempo Real', desc: 'Acompanhe cada container' },
          { icon: Shield,  title: 'Auditoria Completa',   desc: 'Logs de todas as ações'  },
          { icon: MapPin,  title: 'Rastreabilidade',      desc: 'Histórico detalhado'      },
        ].map(f => (
          <div key={f.title} className="card" style={{ width: '180px', textAlign: 'center' }}>
            <div style={{
              width: '2.5rem', height: '2.5rem',
              background: 'hsl(217 91% 60% / 0.12)',
              border: '1px solid hsl(217 91% 60% / 0.25)',
              borderRadius: '0.625rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.75rem',
            }}>
              <f.icon size={18} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{f.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {sessao?.logado ? (
        <button className="btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '0.9375rem' }} onClick={() => navigate('/dashboard')}>
          <LayoutDashboard size={18} /> Acessar Dashboard
        </button>
      ) : (
        <button className="btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '0.9375rem' }} onClick={() => navigate('/login')}>
          <LogIn size={18} /> Fazer Login
        </button>
      )}
    </div>
  )
}
