import { useEffect, useState } from 'react'
import { db, Container, Controle } from '../services/dataService'
import StatusBadge from '../components/StatusBadge'

export default function Estoque() {
  const [containers, setContainers] = useState<Container[]>([])
  const [controles, setControles] = useState<Controle[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('TODOS')

  useEffect(() => {
    async function carregar() {
      const [c, co] = await Promise.all([db.containers.getAll(), db.controle.getEmAberto()])
      setContainers(c)
      setControles(co)
      setLoading(false)
    }
    carregar()
  }, [])

  const clienteAtual: Record<string, string> = {}
  controles.forEach(c => { clienteAtual[c.id_container] = c.cliente })

  const total       = containers.length
  const disponiveis = containers.filter(c => c.status_operacional === 'DISPONIVEL').length
  const emUso       = containers.filter(c => c.status_operacional === 'EM USO').length
  const manutencao  = containers.filter(c => c.status_operacional === 'MANUTENCAO').length

  const porFiltro = filtro === 'DISPONIVEL'
    ? containers.filter(c => c.status_operacional === 'DISPONIVEL')
    : filtro === 'EM USO'
    ? containers.filter(c => c.status_operacional === 'EM USO')
    : containers

  const filtrado = porFiltro.filter(c =>
    c.id_container.toLowerCase().includes(busca.toLowerCase()) ||
    c.numero_container.toLowerCase().includes(busca.toLowerCase()) ||
    (clienteAtual[c.id_container] ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  function badgeConservacao(estado: string) {
    if (estado === 'BOM')     return <span className="badge badge-success">Bom</span>
    if (estado === 'REGULAR') return <span className="badge badge-warning">Regular</span>
    return <span className="badge badge-destructive">Ruim</span>
  }

  const stats = [
    { label: 'Total',       value: total,       color: 'var(--primary)'     },
    { label: 'Disponíveis', value: disponiveis, color: 'var(--success)'     },
    { label: 'Em Uso',      value: emUso,       color: 'var(--warning)'     },
    { label: 'Manutenção',  value: manutencao,  color: 'var(--destructive)' },
  ]

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Estoque</h1>
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Status atual de todos os containers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', fontWeight: 600, marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[
            { value: 'TODOS',      label: 'Todos'      },
            { value: 'DISPONIVEL', label: 'Disponível' },
            { value: 'EM USO',     label: 'Em Uso'     },
          ].map(f => (
            <button key={f.value} onClick={() => setFiltro(f.value)}
              className={filtro === f.value ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}>
              {f.label}
            </button>
          ))}
        </div>
        <input className="input-field" style={{ maxWidth: '260px' }} placeholder="Buscar container ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>Carregando...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Container</th><th>Nº</th><th>Capacidade</th><th>Status</th>
                <th>Cliente Atual</th><th>Local Pátio</th><th>Conservação</th><th>Pintura</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-muted)' }}>Nenhum container</td></tr>
              ) : filtrado.map(c => (
                <tr key={c.id}>
                  <td><span className="badge badge-muted" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{c.id_container}</span></td>
                  <td style={{ color: 'var(--fg-muted)' }}>{c.numero_container}</td>
                  <td style={{ fontSize: '0.8rem' }}>{c.capacidade}</td>
                  <td><StatusBadge status={c.status_operacional} /></td>
                  <td style={{ fontSize: '0.8rem' }}>{clienteAtual[c.id_container] ?? '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{c.local_patio || '—'}</td>
                  <td>{badgeConservacao(c.estado_conservacao)}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{c.pintura_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
