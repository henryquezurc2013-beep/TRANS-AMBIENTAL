import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, Users, Truck, CheckCircle, AlertTriangle, Wrench,
  Download, FileSpreadsheet, Sun, Moon, Zap, Plus,
} from 'lucide-react'
import { db, Container, Controle, Manutencao, Log } from '../services/dataService'
import { exportarDadosJSON, exportarTabelaCSV } from '../services/exportService'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSaudacao(): { texto: string; Icone: typeof Sun; cor: string } {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)  return { texto: 'Bom dia',   Icone: Sun,  cor: 'var(--warning)' }
  if (h >= 12 && h < 18) return { texto: 'Boa tarde', Icone: Sun,  cor: 'var(--pending)'  }
  return                         { texto: 'Boa noite', Icone: Moon, cor: 'var(--primary)'  }
}

function dataFormatada() {
  const s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtData(d: string) {
  return d.split('-').reverse().join('/')
}

function fmtHora(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function diasAtraso(data: string) {
  const hoje = new Date().toISOString().slice(0, 10)
  return Math.floor((new Date(hoje).getTime() - new Date(data).getTime()) / 86400000)
}

function corLog(acao: string) {
  if (acao.includes('ENTREGA'))                         return 'var(--success)'
  if (acao.includes('RETIRADA') || acao.includes('TROCA')) return 'var(--warning)'
  if (acao.includes('LOGIN'))                           return 'var(--primary)'
  if (acao.includes('MANUT'))                           return 'var(--warning)'
  if (acao.includes('CADASTRO') || acao.includes('EDITAR')) return 'var(--fg-muted)'
  return 'var(--fg-muted)'
}

// Mini sparkline decorativa (barras aleatórias fixas por seed)
function Sparkline({ color, seed = 1 }: { color: string; seed?: number }) {
  const bars = Array.from({ length: 8 }, (_, i) => {
    const h = 4 + ((seed * (i + 3) * 7 + i * 13) % 22)
    return h
  })
  const max = Math.max(...bars)
  return (
    <svg width="56" height="28" viewBox="0 0 56 28" style={{ opacity: 0.35 }}>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 7 + 1}
          y={28 - (h / max) * 24}
          width="5"
          height={(h / max) * 24}
          rx="2"
          fill={color}
        />
      ))}
    </svg>
  )
}

const hoje = new Date().toISOString().slice(0, 10)

// ── Componente ────────────────────────────────────────────────────────────────

type Periodo = 'hoje' | '7d' | '30d' | 'ano'

export default function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { sessao } = useAuth()

  const [containers,  setContainers]  = useState<Container[]>([])
  const [clientes,    setClientes]    = useState<{ id: string; created_at: string }[]>([])
  const [controles,   setControles]   = useState<Controle[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [logs,        setLogs]        = useState<Log[]>([])
  const [loading,     setLoading]     = useState(true)
  const [periodo,     setPeriodo]     = useState<Periodo>('7d')

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
      setClientes(cl as { id: string; created_at: string }[])
      setControles(co)
      setManutencoes(m)
      setLogs(l.slice(0, 20))
      setLoading(false)
    }
    carregar()
  }, [])

  // Atalho teclado "T" → Troca rápida
  const irTroca = useCallback(() => navigate('/troca-container'), [navigate])
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 't' || e.key === 'T') {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        irTroca()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [irTroca])

  // Stats derivados
  const emUso       = containers.filter(c => c.status_operacional === 'EM USO').length
  const disponiveis = containers.filter(c => c.status_operacional === 'DISPONIVEL').length
  const pctDisp     = containers.length > 0 ? Math.round((disponiveis / containers.length) * 100) : 0
  const manutPend   = manutencoes.filter(m => m.status_manutencao === 'PENDENTE').length
  const atrasados   = controles.filter(c => c.data_retirada === null && c.previsao_retirada < hoje)

  // Controles por período
  function dataCorte(p: Periodo) {
    const d = new Date()
    if (p === 'hoje') d.setDate(d.getDate())
    if (p === '7d')   d.setDate(d.getDate() - 7)
    if (p === '30d')  d.setDate(d.getDate() - 30)
    if (p === 'ano')  d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().slice(0, 10)
  }
  const corte = dataCorte(periodo)
  const controlesPeriodo = controles.filter(c => c.data_entrega >= corte)

  // Top clientes no período
  const contagemClientes: Record<string, number> = {}
  controlesPeriodo.forEach(c => {
    contagemClientes[c.cliente] = (contagemClientes[c.cliente] ?? 0) + 1
  })
  const topClientes = Object.entries(contagemClientes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([nome, total]) => ({ nome, total }))
  const maxCliente = topClientes[0]?.total ?? 1

  // Novos clientes este mês
  const inicioMes = new Date(); inicioMes.setDate(1); const inicioMesStr = inicioMes.toISOString().slice(0, 10)
  const novosClientesMes = clientes.filter(c => c.created_at >= inicioMesStr).length

  // Entregas na última semana
  const seteDiasAtras = new Date(); seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
  const entregasSemana = controles.filter(c => c.data_entrega >= seteDiasAtras.toISOString().slice(0, 10)).length

  const stats = [
    {
      label: 'Total Containers', value: containers.length,
      icon: Package, color: 'var(--primary)',
      badge: null, sub: null, seed: 1,
    },
    {
      label: 'Disponíveis', value: disponiveis,
      icon: CheckCircle, color: 'var(--success)',
      badge: `${pctDisp}%`, sub: `${disponiveis} de ${containers.length}`, seed: 2,
    },
    {
      label: 'Em Uso', value: emUso,
      icon: Truck, color: 'var(--pending)',
      badge: `+${entregasSemana} esta semana`, sub: null, seed: 3,
    },
    {
      label: 'Atrasados', value: atrasados.length,
      icon: AlertTriangle, color: 'var(--destructive)',
      badge: atrasados.length > 0 ? 'requer atenção' : 'ok', sub: null, seed: 4,
    },
    {
      label: 'Manutenção', value: manutPend,
      icon: Wrench, color: 'var(--warning)',
      badge: 'pendentes', sub: null, seed: 5,
    },
    {
      label: 'Clientes ativos', value: clientes.length,
      icon: Users, color: 'var(--success)',
      badge: novosClientesMes > 0 ? `+${novosClientesMes} este mês` : null, sub: null, seed: 6,
    },
  ]

  const PERIODOS: { key: Periodo; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: '7d',   label: '7d'   },
    { key: '30d',  label: '30d'  },
    { key: 'ano',  label: 'Ano'  },
  ]

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
  const nivelLabel = sessao?.nivelAtual ?? 'Usuário'

  return (
    <div className="page-container" style={{ paddingBottom: '5rem' }}>

      {/* ── HEADER DA PÁGINA ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>

        {/* Linha 1: saudação + badge nível */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
          <SaudIcone size={20} color={saudCor} style={{ flexShrink: 0 }} />
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--fg)' }}>
            {saudTxt}, {sessao?.usuarioAtual}
          </h1>
          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
            ● {nivelLabel}
          </span>
        </div>

        {/* Linha 2: data + badges clicáveis */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--fg-muted)' }}>{dataFormatada()} · Visão geral da frota</span>
          {atrasados.length > 0 && (
            <button
              className="badge badge-destructive"
              style={{ cursor: 'pointer', border: 'none', font: 'inherit', fontSize: '0.72rem' }}
              onClick={() => navigate('/atrasados')}
            >
              ● {atrasados.length} atrasado{atrasados.length !== 1 ? 's' : ''}
            </button>
          )}
          {manutPend > 0 && (
            <button
              className="badge badge-warning"
              style={{ cursor: 'pointer', border: 'none', font: 'inherit', fontSize: '0.72rem' }}
              onClick={() => navigate('/manutencao')}
            >
              ● {manutPend} manutenç{manutPend !== 1 ? 'ões' : 'ão'}
            </button>
          )}
        </div>

        {/* Linha 3: filtros de período + botões de ação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Período */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'hsl(222,37%,10%)', padding: '0.2rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
            {PERIODOS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  background: periodo === p.key ? 'var(--primary)' : 'transparent',
                  color: periodo === p.key ? '#fff' : 'var(--fg-muted)',
                  boxShadow: periodo === p.key ? '0 2px 8px hsl(217 91% 60% / 0.35)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />

          {/* Ações */}
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={handleExportJSON}>
            <Download size={13} /> Backup
          </button>
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={handleExportCSV}>
            <FileSpreadsheet size={13} /> CSV
          </button>
          <button
            className="btn-warning"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.875rem' }}
            onClick={() => navigate('/troca-container')}
          >
            <Zap size={13} /> Troca rápida
          </button>
          <button
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.875rem' }}
            onClick={() => navigate('/cadastro-rapido')}
          >
            <Plus size={13} /> Novo registro
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s, idx) => (
          <div
            key={s.label}
            className="stat-card"
            onClick={() => navigate(
              idx === 0 ? '/containers' :
              idx === 1 ? '/estoque' :
              idx === 2 ? '/controle' :
              idx === 3 ? '/atrasados' :
              idx === 4 ? '/manutencao' : '/clientes'
            )}
            style={{ cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.2s, box-shadow 0.2s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--primary)'
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--primary), 0 0 20px hsl(217 91% 60% / 0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)'
            }}
          >
            {/* Ícone + label */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>
                {s.label}
              </span>
              <div style={{
                background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${s.color} 25%, transparent)`,
                borderRadius: '0.4rem', padding: '0.3rem',
              }}>
                <s.icon size={13} color={s.color} />
              </div>
            </div>

            {/* Valor */}
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>

            {/* Sub-info */}
            {s.sub && (
              <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>{s.sub}</div>
            )}

            {/* Badge */}
            {s.badge && (
              <div style={{ marginTop: '0.375rem' }}>
                <span style={{ fontSize: '0.68rem', color: s.color, fontWeight: 600, opacity: 0.85 }}>{s.badge}</span>
              </div>
            )}

            {/* Sparkline decorativa */}
            <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem' }}>
              <Sparkline color={s.color} seed={s.seed} />
            </div>
          </div>
        ))}
      </div>

      {/* ── TRÊS PAINÉIS ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>

        {/* Painel 1 — Top Clientes */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.125rem' }}>
                Clientes
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--fg)' }}>Top por uso</div>
            </div>
            <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => navigate('/clientes')}>
              Ver todos →
            </button>
          </div>

          {topClientes.length === 0 ? (
            <div style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
              Sem dados no período
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {topClientes.map(c => (
                <div key={c.nome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {c.nome}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{c.total}</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--card-2)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(c.total / maxCliente) * 100}%`,
                      background: 'var(--primary)',
                      borderRadius: '2px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel 2 — Atrasados */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.125rem' }}>
                Atenção
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--fg)' }}>Containers atrasados</div>
            </div>
            <span className="badge badge-destructive" style={{ fontSize: '0.72rem' }}>{atrasados.length}</span>
          </div>

          {atrasados.length === 0 ? (
            <div style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
              Nenhum atraso 🎉
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '340px' }}>
              {atrasados.slice(0, 8).map(c => {
                const dias = diasAtraso(c.previsao_retirada)
                return (
                  <div key={c.id} style={{
                    padding: '0.625rem 0.75rem',
                    background: 'hsl(0 84% 60% / 0.05)',
                    border: '1px solid hsl(0 84% 60% / 0.15)',
                    borderRadius: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--fg)', marginBottom: '0.125rem' }}>
                          {c.id_container}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.cliente}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--destructive)', marginTop: '0.125rem' }}>
                          Previsto {fmtData(c.previsao_retirada)} · {dias}d atrasado
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', flexShrink: 0 }}
                        onClick={() => navigate('/cadastro-rapido')}
                      >
                        Resolver →
                      </button>
                    </div>
                  </div>
                )
              })}
              {atrasados.length > 8 && (
                <button className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/atrasados')}>
                  Ver todos ({atrasados.length}) →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Painel 3 — Atividade */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.125rem' }}>
                Hoje
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--fg)' }}>Atividade</div>
            </div>
            <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => navigate('/logs')}>
              Logs →
            </button>
          </div>

          {logs.length === 0 ? (
            <div style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
              Sem atividade recente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', overflowY: 'auto', maxHeight: '340px' }}>
              {logs.map((l, i) => {
                const cor = corLog(l.acao)
                return (
                  <div key={l.id ?? i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                    padding: '0.5rem 0',
                    borderBottom: i < logs.length - 1 ? '1px solid hsl(220,25%,14%)' : 'none',
                  }}>
                    {/* Bullet */}
                    <span style={{ color: cor, fontSize: '0.6rem', marginTop: '0.25rem', flexShrink: 0 }}>●</span>
                    {/* Conteúdo */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.acao}
                      </div>
                      {l.detalhes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.detalhes}
                        </div>
                      )}
                      <div style={{ fontSize: '0.68rem', color: 'var(--fg-muted)', marginTop: '0.125rem' }}>
                        por {l.usuario}
                      </div>
                    </div>
                    {/* Horário */}
                    <span style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmtHora(l.data_hora)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Responsive: no mobile os 3 painéis empilham */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-panels { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── BOTÃO FLUTUANTE TROCA RÁPIDA ─────────────────────────────────────── */}
      <button
        onClick={irTroca}
        title="Troca rápida (atalho: T)"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.125rem',
          background: 'var(--warning)',
          color: 'hsl(222,41%,8%)',
          border: 'none',
          borderRadius: '9999px',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.875rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 24px hsl(38 92% 50% / 0.35)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 32px hsl(38 92% 50% / 0.45)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 4px 24px hsl(38 92% 50% / 0.35)'
        }}
      >
        <Zap size={15} />
        Troca rápida
        <span style={{
          background: 'hsl(222,41%,8% / 0.25)',
          borderRadius: '0.25rem',
          padding: '0.05rem 0.3rem',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
          T
        </span>
      </button>
    </div>
  )
}
