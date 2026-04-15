import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Package, Users, Truck, CheckCircle, AlertTriangle, Wrench, Download, FileJson, FileSpreadsheet, Sun, Moon } from 'lucide-react'
import { db, Container, Controle, Manutencao } from '../services/dataService'
import { exportarDadosJSON, exportarTabelaCSV } from '../services/exportService'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'

function getSaudacao(): { texto: string; Icone: typeof Sun; cor: string } {
  const hora = new Date().getHours()
  if (hora >= 5 && hora < 12)  return { texto: 'Bom dia',   Icone: Sun,  cor: 'hsl(38,92%,55%)'  }
  if (hora >= 12 && hora < 18) return { texto: 'Boa tarde', Icone: Sun,  cor: 'hsl(25,95%,55%)'  }
  return                               { texto: 'Boa noite', Icone: Moon, cor: 'hsl(217,91%,65%)' }
}

function dataFormatada() {
  const str = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const hoje = new Date().toISOString().slice(0, 10)

export default function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { sessao } = useAuth()
  const [containers, setContainers] = useState<Container[]>([])
  const [clientes, setClientes] = useState<{ id: string }[]>([])
  const [controles, setControles] = useState<Controle[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const [c, cl, co, m] = await Promise.all([
        db.containers.getAll(),
        db.clientes.getAll(),
        db.controle.getAll(),
        db.manutencao.getAll(),
      ])
      setContainers(c)
      setClientes(cl)
      setControles(co)
      setManutencoes(m)
      setLoading(false)
    }
    carregar()
  }, [])

  const emUso = containers.filter(c => c.status_operacional === 'EM USO').length
  const disponiveis = containers.filter(c => c.status_operacional === 'DISPONIVEL').length
  const manutPendente = manutencoes.filter(m => m.status_manutencao === 'PENDENTE').length
  const atrasados = controles.filter(c => c.data_retirada === null && c.previsao_retirada < hoje)

  // Top 10 clientes por entregas
  const contagemClientes: Record<string, number> = {}
  controles.forEach(c => {
    contagemClientes[c.cliente] = (contagemClientes[c.cliente] ?? 0) + 1
  })
  const topClientes = Object.entries(contagemClientes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nome, total]) => ({ nome: nome.length > 20 ? nome.slice(0, 20) + '…' : nome, total }))

  const stats = [
    { label: 'Containers',      value: containers.length,  icon: Package,      color: 'hsl(217,91%,60%)', route: '/containers' },
    { label: 'Clientes',        value: clientes.length,    icon: Users,        color: 'hsl(142,71%,45%)', route: '/clientes'   },
    { label: 'Em Uso',          value: emUso,              icon: Truck,        color: 'hsl(38,92%,50%)',  route: '/controle'   },
    { label: 'Disponíveis',     value: disponiveis,        icon: CheckCircle,  color: 'hsl(142,71%,45%)', route: '/estoque'    },
    { label: 'Atrasados',       value: atrasados.length,   icon: AlertTriangle,color: 'hsl(0,84%,60%)',   route: '/atrasados'  },
    { label: 'Manut. Pendentes',value: manutPendente,      icon: Wrench,       color: 'hsl(38,92%,50%)',  route: '/manutencao' },
  ]

  async function handleExportJSON() {
    try { await exportarDadosJSON(); toast('Backup exportado!', 'success') }
    catch { toast('Erro ao exportar', 'error') }
  }
  async function handleExportControle() {
    try { await exportarTabelaCSV('controle'); toast('Controle exportado!', 'success') }
    catch { toast('Erro ao exportar', 'error') }
  }
  async function handleExportContainers() {
    try { await exportarTabelaCSV('containers'); toast('Containers exportado!', 'success') }
    catch { toast('Erro ao exportar', 'error') }
  }

  function diasAtraso(data: string) {
    const diff = new Date(hoje).getTime() - new Date(data).getTime()
    return Math.floor(diff / 86400000)
  }

  if (loading) return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <span style={{ color: 'hsl(210,20%,50%)' }}>Carregando...</span>
    </div>
  )

  return (
    <div className="page-container">
      {/* Boas-vindas */}
      {(() => {
        const { texto, Icone, cor } = getSaudacao()
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1.25rem',
            background: 'hsl(222, 37%, 12%)',
            border: '1px solid hsl(220, 25%, 20%)',
            borderRadius: '0.9rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
          }}>
            <div style={{
              width: '3.25rem', height: '3.25rem', flexShrink: 0,
              background: `${cor.replace(')', ' / 0.12)').replace('hsl(', 'hsl(')}`,
              border: `1px solid ${cor.replace(')', ' / 0.25)').replace('hsl(', 'hsl(')}`,
              borderRadius: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icone size={28} color={cor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(210,20%,96%)', lineHeight: 1.2 }}>
                {texto}, {sessao?.usuarioAtual}!
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'hsl(210,20%,50%)', marginTop: '0.25rem' }}>
                {dataFormatada()}
              </div>
              {!loading && (
                <div style={{ fontSize: '0.8rem', marginTop: '0.375rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ color: atrasados.length > 0 ? 'hsl(0,84%,60%)' : 'hsl(210,20%,45%)' }}>
                    {atrasados.length} atrasado{atrasados.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ color: 'hsl(210,20%,30%)' }}>·</span>
                  <span style={{ color: manutPendente > 0 ? 'hsl(38,92%,55%)' : 'hsl(210,20%,45%)' }}>
                    {manutPendente} manutenç{manutPendente !== 1 ? 'ões' : 'ão'} pendente{manutPendente !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ margin: 0, color: 'hsl(210,20%,50%)', fontSize: '0.875rem' }}>Visão geral do sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={handleExportJSON}><FileJson size={14} /> Backup JSON</button>
          <button className="btn-secondary" onClick={handleExportControle}><FileSpreadsheet size={14} /> Controle CSV</button>
          <button className="btn-secondary" onClick={handleExportContainers}><Download size={14} /> Containers CSV</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <div
            key={s.label}
            className="stat-card"
            onClick={() => navigate(s.route)}
            style={{
              cursor: 'pointer',
              border: '1px solid transparent',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.borderColor = '#3B82F6'
              el.style.boxShadow = '0 0 0 1px #3B82F6'
              const arrow = el.querySelector<HTMLElement>('.stat-arrow')
              if (arrow) arrow.style.color = '#3B82F6'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.borderColor = 'transparent'
              el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)'
              const arrow = el.querySelector<HTMLElement>('.stat-arrow')
              if (arrow) arrow.style.color = '#6b7280'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'hsl(210,20%,50%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              <div style={{ background: `${s.color}18`, border: `1px solid ${s.color}35`, borderRadius: '0.5rem', padding: '0.375rem', display: 'flex' }}>
                <s.icon size={14} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <span className="stat-arrow" style={{ fontSize: '12px', color: '#6b7280', transition: 'color 0.2s ease' }}>→</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Gráfico Top Clientes */}
        <div className="card">
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.9375rem', fontWeight: 600 }}>Top 10 Clientes</h3>
          {topClientes.length === 0 ? (
            <div style={{ color: 'hsl(210,20%,40%)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>Nenhum dado disponível</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topClientes} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fill: 'hsl(210,20%,50%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fill: 'hsl(210,20%,70%)', fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ background: 'hsl(222,37%,12%)', border: '1px solid hsl(220,25%,22%)', borderRadius: '0.5rem', fontSize: '0.8125rem' }}
                  labelStyle={{ color: 'hsl(210,20%,85%)' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {topClientes.map((_, i) => (
                    <Cell key={i} fill={`hsl(217, 91%, ${60 - i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Atrasados */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Containers Atrasados</h3>
            <span className="badge badge-destructive">{atrasados.length}</span>
          </div>
          {atrasados.length === 0 ? (
            <div style={{ color: 'hsl(210,20%,40%)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
              Nenhum atraso! 🎉
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {atrasados.slice(0, 6).map(c => (
                <div key={c.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.625rem 0.875rem',
                  background: 'hsl(0 84% 60% / 0.05)',
                  border: '1px solid hsl(0 84% 60% / 0.15)',
                  borderRadius: '0.5rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{c.id_container} — {c.cliente}</div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(0,84%,60%)', marginTop: '0.125rem' }}>
                      {diasAtraso(c.previsao_retirada)} dias em atraso
                    </div>
                  </div>
                  <button className="btn-primary" style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                    onClick={() => navigate('/cadastro-rapido')}>
                    Resolver
                  </button>
                </div>
              ))}
              {atrasados.length > 6 && (
                <button className="btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={() => navigate('/atrasados')}>
                  Ver todos ({atrasados.length}) →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
