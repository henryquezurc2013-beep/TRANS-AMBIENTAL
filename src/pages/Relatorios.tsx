import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { db, Container, Controle, Manutencao, registrarLog } from '../services/dataService'
import Icon from '../components/Icon'
import { useAuth } from '../contexts/AuthContext'
import RelatorioMotorista from '../components/RelatorioMotorista'

const CORES_CONSERVACAO = ['var(--success)', 'var(--warning)', 'var(--destructive)']
const CORES_PINTURA     = ['var(--primary)',  'var(--fg-muted)']

type FiltroStatus = 'TODOS' | 'DISPONIVEL' | 'EM USO' | 'MANUTENCAO'

type OrdemRelatorio =
  | 'container_asc'
  | 'container_desc'
  | 'cliente_asc'
  | 'cliente_desc'
  | 'data_desc'
  | 'data_asc'

export default function Relatorios() {
  const { sessao } = useAuth()
  const [containers, setContainers]   = useState<Container[]>([])
  const [controles, setControles]     = useState<Controle[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [loading, setLoading]         = useState(true)
  const [busca, setBusca]                     = useState('')
  const [filtro, setFiltro]                   = useState<FiltroStatus>('TODOS')
  const [modalMotorista, setModalMotorista]   = useState(false)
  const [ordem, setOrdem]                     = useState<OrdemRelatorio>('container_asc')

  useEffect(() => {
    async function carregar() {
      const [c, co, m] = await Promise.all([
        db.containers.getAll(),
        db.controle.getEmAberto(),
        db.manutencao.getAll(),
      ])
      setContainers(c)
      setControles(co)
      setManutencoes(m)
      setLoading(false)
    }
    carregar()
    registrarLog(sessao!.usuarioAtual, 'RELATORIO VISUALIZADO', 'Relatório de containers acessado')
  }, [])

  function localizacaoAtual(c: Container): { texto: string; cor: string } {
    if (c.status_operacional === 'EM USO') {
      const reg = controles.find(r => r.id_container === c.id_container)
      return { texto: `No cliente: ${reg ? reg.cliente : '—'}`, cor: 'hsl(217, 91%, 65%)' }
    }
    if (c.status_operacional === 'MANUTENCAO') {
      const reg = manutencoes
        .filter(m => m.id_container === c.id_container && m.status_manutencao === 'PENDENTE')
        .sort((a, b) => b.data_lancamento.localeCompare(a.data_lancamento))[0]
      const desc = reg ? reg.descricao : '—'
      return { texto: `Manutenção: ${desc.length > 35 ? desc.slice(0, 35) + '…' : desc}`, cor: 'hsl(38, 92%, 60%)' }
    }
    return { texto: c.local_patio ? `Pátio: ${c.local_patio}` : 'No Pátio', cor: 'hsl(142, 71%, 55%)' }
  }

  const contagemConservacao: Record<string, number> = {}
  const contagemPintura: Record<string, number>     = {}
  containers.forEach(c => {
    contagemConservacao[c.estado_conservacao] = (contagemConservacao[c.estado_conservacao] ?? 0) + 1
    contagemPintura[c.pintura_status]         = (contagemPintura[c.pintura_status]         ?? 0) + 1
  })
  const dadosConservacao = Object.entries(contagemConservacao).map(([name, value]) => ({ name, value }))
  const dadosPintura     = Object.entries(contagemPintura).map(([name, value])     => ({ name, value }))

  const qtdPatio      = containers.filter(c => c.status_operacional === 'DISPONIVEL').length
  const qtdClientes   = containers.filter(c => c.status_operacional === 'EM USO').length
  const qtdManutencao = containers.filter(c => c.status_operacional === 'MANUTENCAO').length

  const filtrado = containers
    .filter(c => filtro === 'TODOS' || c.status_operacional === filtro)
    .filter(c =>
      c.numero_container.toLowerCase().includes(busca.toLowerCase()) ||
      c.local_patio.toLowerCase().includes(busca.toLowerCase()) ||
      c.capacidade.toLowerCase().includes(busca.toLowerCase())
    )

  const filtradoOrdenado = [...filtrado].sort((a, b) => {
    switch (ordem) {
      case 'container_asc':
        return a.numero_container.localeCompare(b.numero_container, 'pt-BR', { numeric: true })
      case 'container_desc':
        return b.numero_container.localeCompare(a.numero_container, 'pt-BR', { numeric: true })
      case 'cliente_asc': {
        const ca = controles.find(r => r.id_container === a.id_container)?.cliente ?? ''
        const cb = controles.find(r => r.id_container === b.id_container)?.cliente ?? ''
        return ca.localeCompare(cb, 'pt-BR')
      }
      case 'cliente_desc': {
        const ca = controles.find(r => r.id_container === a.id_container)?.cliente ?? ''
        const cb = controles.find(r => r.id_container === b.id_container)?.cliente ?? ''
        return cb.localeCompare(ca, 'pt-BR')
      }
      case 'data_desc':
        return new Date(b.data_cadastro ?? 0).getTime() - new Date(a.data_cadastro ?? 0).getTime()
      case 'data_asc':
        return new Date(a.data_cadastro ?? 0).getTime() - new Date(b.data_cadastro ?? 0).getTime()
      default:
        return 0
    }
  })

  const tooltipStyle = {
    contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '0.8125rem' },
    labelStyle: { color: 'hsl(210, 20%, 85%)' },
  }

  const FILTROS: { key: FiltroStatus; label: string }[] = [
    { key: 'TODOS',      label: 'Todos'         },
    { key: 'DISPONIVEL', label: 'No Pátio'      },
    { key: 'EM USO',     label: 'Com Clientes'  },
    { key: 'MANUTENCAO', label: 'Em Manutenção' },
  ]

  return (
    <>
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Análise visual da frota</p>
        </div>
        <button className="btn-primary" onClick={() => setModalMotorista(true)}>
          <Icon name="file" size={14} /> 🖨️ Relatório do Motorista
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>Carregando...</div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'No Pátio',      value: qtdPatio,      icon: 'warehouse', cor: 'var(--success)' },
              { label: 'Com Clientes',  value: qtdClientes,   icon: 'truck',     cor: 'var(--primary)' },
              { label: 'Em Manutenção', value: qtdManutencao, icon: 'wrench',    cor: 'var(--warning)'  },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem', flexShrink: 0,
                  background: `color-mix(in srgb, ${s.cor} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${s.cor} 25%, transparent)`,
                  borderRadius: '0.625rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={s.icon} size={16} color={s.cor} />
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.cor, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.125rem' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Estado de Conservação</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dadosConservacao} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {dadosConservacao.map((_, i) => <Cell key={i} fill={CORES_CONSERVACAO[i % CORES_CONSERVACAO.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend formatter={v => <span style={{ color: 'hsl(210,20%,75%)', fontSize: '0.8125rem' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Status de Pintura</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dadosPintura} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {dadosPintura.map((_, i) => <Cell key={i} fill={CORES_PINTURA[i % CORES_PINTURA.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend formatter={v => <span style={{ color: 'hsl(210,20%,75%)', fontSize: '0.8125rem' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela detalhada */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Detalhamento da Frota</h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {FILTROS.map(f => (
                    <button key={f.key} onClick={() => setFiltro(f.key)}
                      className={filtro === f.key ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input className="input-field" style={{ maxWidth: '200px' }} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
                <div className="form-group" style={{ minWidth: '200px', marginBottom: 0 }}>
                  <select
                    className="select-field"
                    value={ordem}
                    onChange={e => setOrdem(e.target.value as OrdemRelatorio)}
                  >
                    <option value="container_asc">Container ↑ (crescente)</option>
                    <option value="container_desc">Container ↓ (decrescente)</option>
                    <option value="cliente_asc">Cliente (A–Z)</option>
                    <option value="cliente_desc">Cliente (Z–A)</option>
                    <option value="data_desc">Data (mais recente)</option>
                    <option value="data_asc">Data (mais antiga)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nº</th><th>Capacidade</th><th>Status</th>
                    <th>Localização Atual</th><th>Conservação</th><th>Pintura</th><th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrado.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-muted)' }}>
                        Nenhum container encontrado
                      </td>
                    </tr>
                  ) : filtradoOrdenado.map(c => {
                    const loc = localizacaoAtual(c)
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{c.numero_container}</td>
                        <td style={{ fontSize: '0.8rem' }}>{c.capacidade}</td>
                        <td>
                          <span className={
                            c.status_operacional === 'DISPONIVEL' ? 'badge badge-success' :
                            c.status_operacional === 'EM USO'     ? 'badge badge-info'    :
                                                                    'badge badge-warning'
                          }>
                            {c.status_operacional === 'DISPONIVEL' ? 'Disponível' :
                             c.status_operacional === 'EM USO'     ? 'Em Uso'     : 'Manutenção'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: loc.cor, fontWeight: 500 }}>{loc.texto}</td>
                        <td style={{ fontSize: '0.8rem' }}>{c.estado_conservacao}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{c.pintura_status}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                          {c.data_cadastro.split('-').reverse().join('/')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
              {filtradoOrdenado.length} container(s) exibido(s)
            </div>
          </div>
        </>
      )}
    </div>

    {modalMotorista && <RelatorioMotorista onClose={() => setModalMotorista(false)} />}
    </>
  )
}
