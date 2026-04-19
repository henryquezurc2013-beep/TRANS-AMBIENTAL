import { useEffect, useState } from 'react'
import { db, Controle as IControle } from '../services/dataService'

function fmtData(d: string | null) {
  if (!d) return <span className="badge badge-warning">Em aberto</span>
  return d.split('-').reverse().join('/')
}

export default function ControlePage() {
  const [registros, setRegistros] = useState<IControle[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    db.controle.getAll().then(data => { setRegistros(data); setLoading(false) })
  }, [])

  const filtrado = registros.filter(r =>
    r.id_container.toLowerCase().includes(busca.toLowerCase()) ||
    r.cliente.toLowerCase().includes(busca.toLowerCase()) ||
    r.material.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Controle</h1>
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Histórico de movimentações</p>
        </div>
        <input
          className="input-field"
          style={{ maxWidth: '280px' }}
          placeholder="Buscar por container, cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>Carregando...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lançamento</th>
                <th>Container</th>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Prev. Retirada</th>
                <th>Retirada</th>
                <th>Material</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-muted)' }}>
                  {busca ? 'Nenhum resultado' : 'Nenhum registro'}
                </td></tr>
              ) : filtrado.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                    {r.data_lancamento.split('-').reverse().join('/')}
                  </td>
                  <td><span className="badge badge-info">{r.id_container}</span></td>
                  <td>{r.cliente}</td>
                  <td style={{ fontSize: '0.8rem' }}>{r.data_entrega.split('-').reverse().join('/')}</td>
                  <td style={{ fontSize: '0.8rem' }}>{r.previsao_retirada.split('-').reverse().join('/')}</td>
                  <td style={{ fontSize: '0.8rem' }}>{fmtData(r.data_retirada)}</td>
                  <td style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>{r.material || '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{r.origem_acao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
        {filtrado.length} registro(s) exibido(s)
      </div>
    </div>
  )
}
