import { useEffect, useState } from 'react'
import { db, Manutencao as IManutencao } from '../services/dataService'

function badgePrioridade(p: string) {
  if (p === 'URGENTE') return <span className="badge badge-destructive">URGENTE</span>
  if (p === 'ALTA') return <span className="badge badge-warning">ALTA</span>
  if (p === 'MEDIA') return <span className="badge badge-info">MÉDIA</span>
  return <span className="badge badge-muted">BAIXA</span>
}

function badgeStatus(s: string) {
  if (s === 'PENDENTE') return <span className="badge badge-destructive">Pendente</span>
  if (s === 'EM ANDAMENTO') return <span className="badge badge-warning">Em andamento</span>
  return <span className="badge badge-success">Concluída</span>
}

export default function Manutencao() {
  const [registros, setRegistros] = useState<IManutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('TODOS')

  useEffect(() => {
    db.manutencao.getAll().then(data => { setRegistros(data); setLoading(false) })
  }, [])

  const filtrado = filtro === 'TODOS' ? registros : registros.filter(r => r.status_manutencao === filtro)
  const pendentes = registros.filter(r => r.status_manutencao === 'PENDENTE').length

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Manutenção</h1>
            {pendentes > 0 && <span className="badge badge-destructive">{pendentes} pendentes</span>}
          </div>
          <p style={{ margin: 0, color: 'hsl(210,20%,50%)', fontSize: '0.875rem' }}>Histórico de manutenções</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {['TODOS', 'PENDENTE', 'EM ANDAMENTO', 'CONCLUIDA'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={filtro === f ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}>
              {f === 'TODOS' ? 'Todos' : f === 'CONCLUIDA' ? 'Concluídas' : f === 'EM ANDAMENTO' ? 'Em andamento' : 'Pendentes'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(210,20%,50%)' }}>Carregando...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Data</th><th>Container</th><th>Descrição</th><th>Status</th><th>Prioridade</th><th>Responsável</th><th>Custo</th></tr>
            </thead>
            <tbody>
              {filtrado.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'hsl(210,20%,40%)' }}>Nenhum registro</td></tr>
              ) : filtrado.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>{r.data_lancamento.split('-').reverse().join('/')}</td>
                  <td><span className="badge badge-info">{r.id_container}</span></td>
                  <td style={{ maxWidth: '280px' }}>{r.descricao}</td>
                  <td>{badgeStatus(r.status_manutencao)}</td>
                  <td>{badgePrioridade(r.prioridade)}</td>
                  <td style={{ fontSize: '0.8rem' }}>{r.responsavel || '—'}</td>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    {r.custo > 0 ? `R$ ${Number(r.custo).toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
