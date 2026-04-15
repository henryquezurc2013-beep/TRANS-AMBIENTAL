import { useEffect, useState } from 'react'
import { db, Log } from '../services/dataService'

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    db.logs.getAll().then(data => { setLogs(data); setLoading(false) })
  }, [])

  const filtrado = logs.filter(l =>
    l.usuario.toLowerCase().includes(busca.toLowerCase()) ||
    l.acao.toLowerCase().includes(busca.toLowerCase()) ||
    l.detalhes.toLowerCase().includes(busca.toLowerCase())
  )

  function fmtDataHora(dt: string) {
    const d = new Date(dt)
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }

  function corAcao(acao: string) {
    if (acao.includes('LOGIN') || acao.includes('LOGOUT')) return 'hsl(217,91%,65%)'
    if (acao.includes('ENTREGA')) return 'hsl(142,71%,55%)'
    if (acao.includes('RETIRADA') || acao.includes('TROCA')) return 'hsl(38,92%,60%)'
    if (acao.includes('MANUT')) return 'hsl(38,92%,55%)'
    if (acao.includes('EDITAR') || acao.includes('CADASTRO')) return 'hsl(210,20%,65%)'
    return 'hsl(210,20%,55%)'
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Logs de Auditoria</h1>
          <p style={{ margin: 0, color: 'hsl(210,20%,50%)', fontSize: '0.875rem' }}>Rastreabilidade de todas as ações do sistema</p>
        </div>
        <input className="input-field" style={{ maxWidth: '280px' }} placeholder="Filtrar por usuário, ação..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(210,20%,50%)' }}>Carregando...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Data / Hora</th><th>Usuário</th><th>Ação</th><th>Detalhes</th></tr>
            </thead>
            <tbody>
              {filtrado.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'hsl(210,20%,40%)' }}>Nenhum log</td></tr>
              ) : filtrado.map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: '0.775rem', fontFamily: 'JetBrains Mono, monospace', color: 'hsl(210,20%,50%)', whiteSpace: 'nowrap' }}>
                    {fmtDataHora(l.data_hora)}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'hsl(217,91%,65%)' }}>{l.usuario}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: corAcao(l.acao), fontFamily: 'JetBrains Mono, monospace' }}>{l.acao}</span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'hsl(210,20%,65%)' }}>{l.detalhes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'hsl(210,20%,40%)' }}>
        {filtrado.length} registro(s) — últimos 500
      </div>
    </div>
  )
}
