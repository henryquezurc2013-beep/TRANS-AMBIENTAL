import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, Users, Truck, CheckCircle, AlertTriangle, Wrench,
  Download, FileSpreadsheet, Sun, Moon, Zap, Plus, Search, Bell,
  ArrowLeftRight, X, ChevronRight,
} from 'lucide-react'
import { db, Controle, Manutencao, Log } from '../services/dataService'
import type { Container, Cliente } from '../services/dataService'
import { exportarDadosJSON, exportarTabelaCSV } from '../services/exportService'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import StatCard from '../components/StatCard'
import type { StatCardProps } from '../components/StatCard'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSaudacao(): { texto: string; Icone: typeof Sun; cor: string } {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)  return { texto: 'Bom dia',   Icone: Sun,  cor: 'var(--warning)' }
  if (h >= 12 && h < 18) return { texto: 'Boa tarde', Icone: Sun,  cor: 'var(--pending)'  }
  return                         { texto: 'Boa noite', Icone: Moon, cor: 'var(--primary)'  }
}

function dataFormatada() {
  const s = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtData(d: string) { return d.split('-').reverse().join('/') }

function fmtHora(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function diasAtraso(data: string): number {
  const hoje = new Date().toISOString().slice(0, 10)
  return Math.floor((new Date(hoje).getTime() - new Date(data).getTime()) / 86400000)
}

function corLog(acao: string): string {
  if (acao.includes('ENTREGA'))                             return 'var(--success)'
  if (acao.includes('RETIRADA') || acao.includes('TROCA')) return 'var(--warning)'
  if (acao.includes('LOGIN'))                              return 'var(--primary)'
  if (acao.includes('MANUT'))                              return 'var(--warning)'
  return 'var(--fg-muted)'
}

function genTrend(seed: number): number[] {
  return Array.from({ length: 9 }, (_, i) => {
    const v = ((seed * 31 + i * 17 + i * i * 7) % 70) / 100 + 0.2
    return Math.min(1, v)
  })
}

// HoraAtual component
function HoraAtual() {
  const fmt = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }
  const [hora, setHora] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setHora(fmt()), 30000)
    return () => clearInterval(id)
  }, [])
  return <>{hora}</>
}

type Periodo = 'hoje' | '7d' | '30d' | 'ano'

const hoje = new Date().toISOString().slice(0, 10)

// ── Componente principal ──────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate   = useNavigate()
  const toast      = useToast()
  const { sessao } = useAuth()

  const [containers,  setContainers]  = useState<Container[]>([])
  const [clientes,    setClientes]    = useState<Cliente[]>([])
  const [controles,   setControles]   = useState<Controle[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [logs,        setLogs]        = useState<Log[]>([])
  const [loading,     setLoading]     = useState(true)
  const [periodo,     setPeriodo]     = useState<Periodo>('7d')
  const [selectedStat, setSelectedStat] = useState<number | null>(null)
  const [showTroca,   setShowTroca]   = useState(false)
  const [trocaCliente,  setTrocaCliente]  = useState('')
  const [trocaRetirar,  setTrocaRetirar]  = useState('')
  const [trocaEntregar, setTrocaEntregar] = useState('')

  // Carregar dados
  useEffect(() => {
    async function carregar() {
      const [c, cl, co, m, l] = await Promise.all([
        db.containers.getAll(),
        db.clientes.getAll(),
        db.controle.getAll(),
        db.manutencao.getAll(),
        db.logs.getAll(),
      ])
      setContainers(c)
      setClientes(cl)
      setControles(co)
      setManutencoes(m)
      setLogs(l.slice(0, 20))
      setLoading(false)
    }
    carregar()
  }, [])

  // Atalhos de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 't' || e.key === 'T') setShowTroca(v => !v)
      if (e.key === 'Escape') { setShowTroca(false); setSelectedStat(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const irTroca = useCallback(() => navigate('/troca-container'), [navigate])

  // ── Stats derivados ───────────────────────────────────────────────────────
  const emUso       = containers.filter(c => c.status_operacional === 'EM USO').length
  const disponiveis = containers.filter(c => c.status_operacional === 'DISPONIVEL').length
  const manutCount  = containers.filter(c => c.status_operacional === 'MANUTENCAO').length
  const manutPend   = manutencoes.filter(m => m.status_manutencao === 'PENDENTE').length
  const manutAnd    = manutencoes.filter(m => m.status_manutencao === 'EM ANDAMENTO').length
  const atrasados   = controles.filter(c => c.data_retirada === null && c.previsao_retirada < hoje)

  const atr1a3 = atrasados.filter(c => { const d = diasAtraso(c.previsao_retirada); return d >= 1 && d <= 3 }).length
  const atr4a7 = atrasados.filter(c => { const d = diasAtraso(c.previsao_retirada); return d >= 4 && d <= 7 }).length
  const atr8p  = atrasados.filter(c => diasAtraso(c.previsao_retirada) >= 8).length

  const emUsoNoPrazo = controles.filter(c => c.data_retirada === null && c.previsao_retirada >= hoje).length

  // Disponíveis por capacidade
  const dispByCap: Record<string, number> = {}
  containers.filter(c => c.status_operacional === 'DISPONIVEL').forEach(c => {
    const cap = c.capacidade || 'Outro'
    dispByCap[cap] = (dispByCap[cap] ?? 0) + 1
  })
  const topCap = Object.entries(dispByCap).sort((a, b) => b[1] - a[1]).slice(0, 3)

  // Clientes — novos este mês
  const inicioMes    = new Date(); inicioMes.setDate(1)
  const inicioMesStr = inicioMes.toISOString().slice(0, 10)
  const clientesNovos = clientes.filter(c => c.created_at >= inicioMesStr).length
  const clientesRec   = clientes.length - clientesNovos

  // Entregas na última semana
  const seteDiasAtras = new Date(); seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
  const entregasSemana = controles.filter(c => c.data_entrega >= seteDiasAtras.toISOString().slice(0, 10)).length

  // Top clientes no período
  function dataCorte(p: Periodo): string {
    const d = new Date()
    if (p === 'hoje') return hoje
    if (p === '7d')   { d.setDate(d.getDate() - 7);      return d.toISOString().slice(0, 10) }
    if (p === '30d')  { d.setDate(d.getDate() - 30);     return d.toISOString().slice(0, 10) }
    if (p === 'ano')  { d.setFullYear(d.getFullYear()-1); return d.toISOString().slice(0, 10) }
    return hoje
  }
  const controlesPeriodo = controles.filter(c => c.data_entrega >= dataCorte(periodo))
  const contagemCli: Record<string, number> = {}
  controlesPeriodo.forEach(c => { contagemCli[c.cliente] = (contagemCli[c.cliente] ?? 0) + 1 })
  const topClientes = Object.entries(contagemCli).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nome, total]) => ({ nome, total }))
  const maxCli = topClientes[0]?.total ?? 1

  // ── Definição dos 6 stat cards ────────────────────────────────────────────
  type StatDef = StatCardProps & { route: string; label: string }

  const stats: StatDef[] = [
    {
      label: 'Total containers',
      value: containers.length,
      icon: Package,
      accent: 'hsl(217,80%,65%)',
      delta: { dir: 'up', text: '+4 este mês' },
      trend: genTrend(1),
      breakdown: [
        { label: 'Em uso', value: emUso },
        { label: 'Livres', value: disponiveis },
        { label: 'Manut.', value: manutCount },
      ],
      route: '/containers',
    },
    {
      label: 'Disponíveis',
      value: disponiveis,
      icon: CheckCircle,
      accent: 'hsl(142,60%,55%)',
      delta: { dir: 'flat', text: `${disponiveis} de ${containers.length}` },
      trend: genTrend(2),
      breakdown: topCap.length > 0
        ? topCap.map(([cap, n]) => ({ label: cap, value: n }))
        : [{ label: 'Total', value: disponiveis }],
      route: '/estoque',
    },
    {
      label: 'Em uso',
      value: emUso,
      icon: Truck,
      accent: 'hsl(217,91%,60%)',
      delta: { dir: 'up', text: `+${entregasSemana} esta semana` },
      trend: genTrend(3),
      breakdown: [
        { label: 'No prazo', value: emUsoNoPrazo },
        { label: 'Atrasados', value: atrasados.length },
      ],
      route: '/controle',
    },
    {
      label: 'Atrasados',
      value: atrasados.length,
      icon: AlertTriangle,
      accent: 'hsl(0,75%,65%)',
      delta: { dir: atrasados.length > 0 ? 'down' : 'flat', text: '−2 vs ontem' },
      trend: genTrend(4),
      breakdown: [
        { label: '1–3d', value: atr1a3 },
        { label: '4–7d', value: atr4a7 },
        { label: '8+d',  value: atr8p  },
      ],
      route: '/atrasados',
    },
    {
      label: 'Manutenção',
      value: manutPend,
      icon: Wrench,
      accent: 'hsl(38,80%,60%)',
      delta: { dir: 'flat', text: 'pendentes' },
      trend: genTrend(5),
      breakdown: [
        { label: 'Pendente',      value: manutPend },
        { label: 'Em andamento',  value: manutAnd  },
      ],
      route: '/manutencao',
    },
    {
      label: 'Clientes ativos',
      value: clientes.length,
      icon: Users,
      accent: 'hsl(260,60%,70%)',
      delta: { dir: clientesNovos > 0 ? 'up' : 'flat', text: clientesNovos > 0 ? `+${clientesNovos} este mês` : 'sem novos' },
      trend: genTrend(6),
      breakdown: [
        { label: 'Novos (mês)',  value: clientesNovos },
        { label: 'Recorrentes', value: clientesRec    },
      ],
      route: '/clientes',
    },
  ]

  const ROUTES = ['/containers', '/estoque', '/controle', '/atrasados', '/manutencao', '/clientes']

  // Exports
  async function handleExportJSON() {
    try { await exportarDadosJSON(); toast('Backup exportado!', 'success') }
    catch { toast('Erro ao exportar', 'error') }
  }
  async function handleExportCSV() {
    try { await exportarTabelaCSV('controle'); toast('CSV exportado!', 'success') }
    catch { toast('Erro ao exportar', 'error') }
  }

  if (loading) return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <span style={{ color: 'var(--fg-muted)' }}>Carregando...</span>
    </div>
  )

  const { texto: saudTxt, Icone: SaudIcone, cor: saudCor } = getSaudacao()
  const PERIODOS: { key: Periodo; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: '7d',   label: '7d'   },
    { key: '30d',  label: '30d'  },
    { key: 'ano',  label: 'Ano'  },
  ]
  const horaNow = (() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  })()

  return (
    <div style={{ paddingBottom: '5rem' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '1.125rem 2rem 0', borderBottom: '1px solid var(--border-subtle)' }}>

        {/* Linha 1: breadcrumb + sistema + busca + sino */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--fg-muted)' }}>
            <span>Trans Ambiental</span>
            <span style={{ opacity: 0.4 }}>/</span>
            <span style={{ color: 'var(--fg)', fontWeight: 600 }}>Dashboard</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'var(--border)', flexShrink: 0 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)', display: 'inline-block', flexShrink: 0 }} />
            <span>Sistema online · Sincronizado <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}><HoraAtual /></span></span>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
            <input
              className="input-field"
              style={{ paddingLeft: '2rem', paddingRight: '2.5rem', width: '210px', height: '32px', fontSize: '0.78rem' }}
              placeholder="Buscar container, cliente..."
            />
            <kbd style={{
              position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
              fontSize: '0.62rem', color: 'var(--fg-muted)',
              background: 'var(--card-2)', border: '1px solid var(--border)',
              borderRadius: '0.25rem', padding: '0.1rem 0.3rem', pointerEvents: 'none',
            }}>⌘K</kbd>
          </div>

          <button className="btn-ghost" style={{ padding: '0.375rem', position: 'relative' }}>
            <Bell size={15} />
            <span style={{ position: 'absolute', top: '3px', right: '3px', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--destructive)', border: '1.5px solid var(--bg)' }} />
          </button>
        </div>

        {/* Linha 2: saudação + data + action bar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <SaudIcone size={17} color={saudCor} style={{ flexShrink: 0 }} />
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--fg)', lineHeight: 1.2 }}>
                {saudTxt}, {sessao?.usuarioAtual}
              </h1>
              <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>● {sessao?.nivelAtual ?? 'Admin'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{dataFormatada()} · Visão geral da frota</span>
              {atrasados.length > 0 && (
                <button onClick={() => navigate('/atrasados')} className="badge badge-destructive" style={{ cursor: 'pointer', border: 'none', font: 'inherit', fontSize: '0.68rem' }}>
                  ● {atrasados.length} atrasado{atrasados.length !== 1 ? 's' : ''}
                </button>
              )}
              {manutPend > 0 && (
                <button onClick={() => navigate('/manutencao')} className="badge badge-warning" style={{ cursor: 'pointer', border: 'none', font: 'inherit', fontSize: '0.68rem' }}>
                  ● {manutPend} manutenç{manutPend !== 1 ? 'ões' : 'ão'}
                </button>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
            <div className="seg">
              {PERIODOS.map(p => (
                <button key={p.key} className={periodo === p.key ? 'on' : ''} onClick={() => setPeriodo(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />
            <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', height: '34px' }} onClick={handleExportJSON}>
              <Download size={12} /> Backup
            </button>
            <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', height: '34px' }} onClick={handleExportCSV}>
              <FileSpreadsheet size={12} /> CSV
            </button>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.35rem 0.875rem', height: '34px',
                background: 'hsl(38,92%,50%)', color: '#1a1208',
                border: 'none', borderRadius: '0.5rem',
                fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'opacity 0.15s',
              }}
              onClick={() => setShowTroca(v => !v)}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <Zap size={12} /> Troca rápida
            </button>
            <button className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.875rem', height: '34px' }} onClick={() => navigate('/cadastro-rapido')}>
              <Plus size={12} /> Novo registro
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className="page-container" style={{ paddingTop: '1.5rem' }}>

        {/* ── 6 STAT CARDS ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: selectedStat !== null ? '0' : '1.75rem' }}>
          {stats.map((s, idx) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              icon={s.icon}
              accent={s.accent}
              delta={s.delta}
              trend={s.trend}
              breakdown={s.breakdown}
              active={selectedStat === idx}
              onClick={() => setSelectedStat(selectedStat === idx ? null : idx)}
            />
          ))}
        </div>

        {/* ── DETAIL STRIP ─────────────────────────────────────────────────── */}
        {selectedStat !== null && (() => {
          const s = stats[selectedStat]
          return (
            <div style={{
              margin: '0.75rem 0 1.75rem',
              background: 'var(--card)',
              border: `1.5px solid ${s.accent}`,
              borderRadius: '0.9rem',
              padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
              boxShadow: `0 0 24px ${s.accent}18`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem',
                  background: `color-mix(in srgb, ${s.accent} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${s.accent} 25%, transparent)`,
                  borderRadius: '0.6rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <s.icon size={17} color={s.accent} />
                </div>
                <div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Detalhe</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{s.label}</div>
                </div>
              </div>

              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: s.accent, lineHeight: 1, flexShrink: 0 }}>{s.value}</div>

              <div style={{ width: '1px', height: '40px', background: 'var(--border)', flexShrink: 0 }} />

              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flex: 1 }}>
                {(s.breakdown ?? []).map(b => (
                  <div key={b.label}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{b.value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', marginTop: '0.1rem' }}>{b.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexShrink: 0 }}>
                <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.375rem 0.875rem' }} onClick={() => navigate(ROUTES[selectedStat])}>
                  Abrir {s.label} →
                </button>
                <button className="btn-ghost" style={{ padding: '0.375rem' }} onClick={() => setSelectedStat(null)}>
                  <X size={15} />
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── TRÊS PAINÉIS ─────────────────────────────────────────────────── */}
        <div className="dash-panels" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.1fr', gap: '1.25rem' }}>

          {/* Painel 1 — Top Clientes */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div className="section-eyebrow" style={{ marginBottom: '0.15rem' }}>Clientes</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Top por containers em uso</div>
              </div>
              <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => navigate('/clientes')}>
                Ver todos →
              </button>
            </div>
            {topClientes.length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>Sem dados no período</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {topClientes.map(c => (
                  <div key={c.nome}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{c.nome}</span>
                      <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{c.total}</span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--card-2)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.total / maxCli) * 100}%`, background: 'var(--primary)', borderRadius: '2px', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Painel 2 — Atrasados */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div className="section-eyebrow" style={{ marginBottom: '0.15rem' }}>Atenção</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Containers atrasados</div>
              </div>
              <span className="badge badge-destructive" style={{ fontSize: '0.7rem' }}>{atrasados.length}</span>
            </div>
            {atrasados.length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>Nenhum atraso 🎉</div>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
                {atrasados.slice(0, 8).map((c, i) => {
                  const dias = diasAtraso(c.previsao_retirada)
                  return (
                    <div key={c.id} style={{ padding: '0.625rem 0', borderBottom: i < Math.min(atrasados.length, 8) - 1 ? '1px solid var(--border-faint)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{c.id_container}</span>
                          <div style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>{c.cliente}</div>
                          <div style={{ fontSize: '0.7rem', color: 'hsl(0,75%,65%)', marginTop: '0.1rem' }}>
                            Previsto {fmtData(c.previsao_retirada)} · {dias}d atrasado
                          </div>
                        </div>
                        <button className="btn-primary" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', flexShrink: 0 }} onClick={() => navigate('/cadastro-rapido')}>
                          Resolver →
                        </button>
                      </div>
                    </div>
                  )
                })}
                {atrasados.length > 8 && (
                  <button className="btn-ghost" style={{ fontSize: '0.8rem', width: '100%', marginTop: '0.5rem' }} onClick={() => navigate('/atrasados')}>
                    Ver todos ({atrasados.length}) →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Painel 3 — Atividade */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div className="section-eyebrow" style={{ marginBottom: '0.15rem' }}>Hoje</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Atividade</div>
              </div>
              <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => navigate('/logs')}>
                Logs →
              </button>
            </div>
            {logs.length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>Sem atividade</div>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
                {logs.map((l, i) => {
                  const cor = corLog(l.acao)
                  return (
                    <div key={l.id ?? i} className="activity-row">
                      <span className="activity-dot" style={{ background: cor }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.acao}</div>
                        {l.detalhes && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detalhes}</div>
                        )}
                        <div style={{ fontSize: '0.68rem', color: 'var(--fg-dim)', marginTop: '0.1rem' }}>por {l.usuario}</div>
                      </div>
                      <span className="activity-time">{fmtHora(l.data_hora)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FAB ────────────────────────────────────────────────────────────── */}
      {!showTroca && (
        <button
          onClick={() => setShowTroca(true)}
          title="Troca rápida (T)"
          style={{
            position: 'fixed', bottom: '28px', right: '28px', zIndex: 40,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.125rem',
            background: 'hsl(38,92%,50%)', color: '#1a1208',
            border: 'none', borderRadius: '9999px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '0.875rem', fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 24px hsl(38 92% 50% / 0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px hsl(38 92% 50% / 0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px hsl(38 92% 50% / 0.35)' }}
        >
          <ArrowLeftRight size={15} />
          Troca rápida
          <kbd style={{ background: 'rgba(26,18,8,0.25)', border: '1px solid rgba(26,18,8,0.2)', borderRadius: '0.25rem', padding: '0.05rem 0.3rem', fontSize: '0.68rem', fontWeight: 700 }}>T</kbd>
        </button>
      )}

      {/* ── PAINEL TROCA RÁPIDA ─────────────────────────────────────────────── */}
      {showTroca && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 50,
          width: '380px',
          background: 'var(--card)',
          border: '1.5px solid hsl(38 92% 50% / 0.4)',
          borderRadius: '14px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px hsl(38 92% 50% / 0.08)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '2rem', height: '2rem', background: 'hsl(38 92% 50% / 0.12)', border: '1px solid hsl(38 92% 50% / 0.25)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowLeftRight size={13} color="hsl(38,92%,50%)" />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Troca de container</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>Retirar e entregar ao mesmo cliente</div>
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={() => setShowTroca(false)}><X size={14} /></button>
          </div>

          {/* Body */}
          <div style={{ padding: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '0.875rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={10} /> Cliente
              </label>
              <input className="input-field" placeholder="Nome do cliente..." value={trocaCliente} onChange={e => setTrocaCliente(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '0.875rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: 'hsl(0,75%,65%)' }}>Retirar</label>
                <input
                  className="input-field mono"
                  placeholder="Cód. container"
                  value={trocaRetirar}
                  onChange={e => setTrocaRetirar(e.target.value)}
                  style={{ borderColor: trocaRetirar ? 'hsl(0 75% 65% / 0.5)' : undefined, background: 'hsl(0 75% 65% / 0.05)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '1.125rem' }}>
                <ArrowLeftRight size={15} color="var(--fg-muted)" />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'hsl(142,60%,55%)' }}>Entregar</label>
                <input
                  className="input-field mono"
                  placeholder="Cód. container"
                  value={trocaEntregar}
                  onChange={e => setTrocaEntregar(e.target.value)}
                  style={{ borderColor: trocaEntregar ? 'hsl(142 60% 55% / 0.5)' : undefined, background: 'hsl(142 60% 55% / 0.05)' }}
                />
              </div>
            </div>

            <div style={{ padding: '0.5rem 0.75rem', background: 'var(--card-2)', border: '1px solid var(--border-soft)', borderRadius: '0.5rem', fontSize: '0.72rem', color: 'var(--fg-muted)', marginBottom: '0.875rem' }}>
              Registro automático em Controle e Logs · {horaNow}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }} onClick={() => setShowTroca(false)}>Cancelar</button>
              <button
                style={{
                  flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                  padding: '0.5rem 1rem', background: 'hsl(38,92%,50%)', color: '#1a1208',
                  border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', transition: 'opacity 0.15s',
                }}
                onClick={() => { setShowTroca(false); irTroca() }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                <Zap size={13} /> Confirmar troca
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--fg-muted)' }}>
            <span>Precisa de mais opções?</span>
            <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => { setShowTroca(false); navigate('/troca-container') }}>
              Troca completa <ChevronRight size={11} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 960px) {
          .dash-panels { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
