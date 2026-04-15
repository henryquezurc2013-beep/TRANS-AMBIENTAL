import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { db, Controle as IControle } from '../services/dataService'
import OrdemColeta from '../components/OrdemColeta'

function fmtData(d: string | null) {
  if (!d) return <span className="badge badge-warning">Em aberto</span>
  return d.split('-').reverse().join('/')
}

export default function ControlePage() {
  const [registros, setRegistros] = useState<IControle[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [ordemAberta, setOrdemAberta] = useState(false)

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
          <p style={{ margin: 0, color: 'hsl(210,20%,50%)', fontSize: '0.875rem' }}>Histórico de movimentações</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input-field"
            style={{ maxWidth: '280px' }}
            placeholder="Buscar por container, cliente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
            onClick={() => setOrdemAberta(true)}
          >
            <ClipboardList size={15} /> Gerar Ordem de Coleta
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(210,20%,50%)' }}>Carregando...</div>
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
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'hsl(210,20%,40%)' }}>
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
                  <td style={{ color: 'hsl(210,20%,60%)', fontSize: '0.8rem' }}>{r.material || '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'hsl(210,20%,50%)' }}>{r.origem_acao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'hsl(210,20%,40%)' }}>
        {filtrado.length} registro(s) exibido(s)
      </div>

      {ordemAberta && <OrdemColeta onClose={() => setOrdemAberta(false)} />}
    </div>
  )
}
