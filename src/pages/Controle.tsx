import { useEffect, useState } from 'react'
import { db, Controle as IControle } from '../services/dataService'
import Icon from '../components/Icon'
import { exportarTabelaCSV } from '../services/exportService'
import { useToast } from '../components/Toast'
import StatusBadge from '../components/StatusBadge'

const hoje = new Date().toISOString().slice(0, 10)

function fmtData(d: string | null) {
  if (!d) return '—'
  return d.split('-').reverse().join('/')
}

function statusControle(r: IControle): string {
  if (r.data_retirada !== null) return 'DISPONIVEL'
  if (r.container_fixo) return 'FIXO'
  if (r.previsao_retirada && r.previsao_retirada < hoje) return 'ATRASADO'
  return 'EM USO'
}

type Filtro = 'todos' | 'EM USO' | 'ATRASADO' | 'MANUTENCAO' | 'DISPONIVEL'

export default function ControlePage() {
  const toast = useToast()
  const [registros, setRegistros] = useState<IControle[]>([])
  const [loading,   setLoading]   = useState(true)
  const [busca,     setBusca]     = useState('')
  const [filtro,    setFiltro]    = useState<Filtro>('todos')

  useEffect(() => {
    db.controle.getAll().then(data => { setRegistros(data); setLoading(false) })
  }, [])

  async function handleExport() {
    try { await exportarTabelaCSV('controle'); toast('Controle exportado!', 'success') }
    catch { toast('Erro ao exportar', 'error') }
  }

  const porStatus = (s: Filtro) => s === 'todos'
    ? registros
    : registros.filter(r => statusControle(r) === s)

  const emUsoCount    = registros.filter(r => statusControle(r) === 'EM USO').length
  const atrasadosCount = registros.filter(r => statusControle(r) === 'ATRASADO').length
  const dispCount     = registros.filter(r => statusControle(r) === 'DISPONIVEL').length

  const filtradoPorStatus = porStatus(filtro)
  const filtrado = filtradoPorStatus.filter(r =>
    r.id_container.toLowerCase().includes(busca.toLowerCase()) ||
    r.cliente.toLowerCase().includes(busca.toLowerCase()) ||
    r.material.toLowerCase().includes(busca.toLowerCase())
  )

  const FILTROS: { key: Filtro; label: string; count: number }[] = [
    { key: 'todos',      label: 'Todos',     count: registros.length },
    { key: 'EM USO',     label: 'Em uso',    count: emUsoCount        },
    { key: 'ATRASADO',   label: 'Atrasados', count: atrasadosCount    },
    { key: 'MANUTENCAO', label: 'Manutenção', count: 0               },
    { key: 'DISPONIVEL', label: 'Disponível', count: dispCount        },
  ]

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-soft)', marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Controle</h1>
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Entregas, retiradas e previsões</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="seg">
          {FILTROS.map(f => (
            <button key={f.key} className={filtro === f.key ? 'on' : ''} onClick={() => setFiltro(f.key)}>
              {f.label}
              {' '}
              <span style={{ fontSize: '11px', opacity: filtro === f.key ? 0.85 : 0.6 }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            className="input-field"
            style={{ width: '220px', fontSize: '0.8125rem' }}
            placeholder="Buscar container, cliente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <button className="btn-secondary" onClick={handleExport} style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem', height: '38px' }}>
            <Icon name="download" size={13} /> Exportar
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>Carregando...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Container</th>
                  <th>Cliente</th>
                  <th>Saída</th>
                  <th>Previsão</th>
                  <th>Status</th>
                  <th>Material</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-muted)' }}>
                      {busca ? 'Nenhum resultado para a busca' : 'Nenhum registro'}
                    </td>
                  </tr>
                ) : filtrado.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className="badge badge-info mono" style={{ fontSize: '0.75rem' }}>{r.id_container}</span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--fg)' }}>{r.cliente}</td>
                    <td className="mono" style={{ color: 'var(--fg-3)', fontSize: '0.8rem' }}>{fmtData(r.data_entrega)}</td>
                    <td className="mono" style={{ color: 'var(--fg-3)', fontSize: '0.8rem' }}>
                      {r.container_fixo
                        ? <span style={{ padding: '0.15rem 0.45rem', borderRadius: '0.3rem', background: 'hsl(38,92%,60%)', color: '#000', fontSize: '0.7rem', fontWeight: 700 }}>Fixo</span>
                        : fmtData(r.previsao_retirada)
                      }
                    </td>
                    <td><StatusBadge status={statusControle(r)} /></td>
                    <td style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>{r.material || '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{r.origem_acao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
            {filtrado.length} registro{filtrado.length !== 1 ? 's' : ''} exibido{filtrado.length !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  )
}
